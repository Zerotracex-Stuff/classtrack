import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Clipboard,
  Platform,
  Share,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { generateQRCodeMatrix } from '../../utils/qrGenerator';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';

interface ShareScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

// Stable scanner settings outside component to avoid camera re-mounts
const BARCODE_SCANNER_SETTINGS: { barcodeTypes: ('qr')[] } = {
  barcodeTypes: ['qr'],
};

/**
 * Parses and normalizes various timetable payload representations:
 * 1. Compact indexed format (ct: 2)
 * 2. Mini object format (s, p, e)
 * 3. Standard ClassTrack format (subjects, periods, entries)
 */
function parseTimetablePayload(payloadStr: string): string {
  const trimmed = payloadStr.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return trimmed;
  }

  try {
    const obj = JSON.parse(trimmed);

    // Format 1: Compact indexed format (ct: 2)
    if (obj.ct === 2 && Array.isArray(obj.s) && Array.isArray(obj.p) && Array.isArray(obj.e)) {
      const parsedSubjects = obj.s.map((sArr: any[], idx: number) => ({
        id: sArr[4] || `subj_${idx + 1}`,
        name: sArr[0] || 'Subject',
        color: sArr[1] || '#6366F1',
        room: sArr[2] || '',
        teacher: sArr[3] || '',
      }));

      const parsedPeriods = obj.p.map((pArr: any[], idx: number) => ({
        id: pArr[4] || `p_${idx + 1}`,
        label: pArr[0] || `Period ${idx + 1}`,
        startTime: pArr[1] || '09:00',
        endTime: pArr[2] || '10:00',
        isBreak: Boolean(pArr[3]),
      }));

      const parsedEntries = obj.e.map((eArr: any[], idx: number) => {
        const weekday = eArr[0];
        const periodId =
          typeof eArr[1] === 'number' && parsedPeriods[eArr[1]]
            ? parsedPeriods[eArr[1]].id
            : String(eArr[1]);
        const subjectId =
          typeof eArr[2] === 'number' && parsedSubjects[eArr[2]]
            ? parsedSubjects[eArr[2]].id
            : String(eArr[2]);
        return {
          id: `entry_${Date.now()}_${idx}`,
          weekday,
          periodId,
          subjectId,
          teacher: eArr[3] || undefined,
          roomOverride: eArr[4] || undefined,
        };
      });

      return JSON.stringify({
        subjects: parsedSubjects,
        periods: parsedPeriods,
        entries: parsedEntries,
      });
    }

    // Format 2: Mini key format (s, p, e)
    if (obj.s && obj.p && obj.e) {
      const fullData = {
        subjects: obj.s.map((s: any, idx: number) => ({
          id: s.id || `subj_${idx + 1}`,
          name: s.n || s.name || 'Subject',
          color: s.c || s.color || '#6366F1',
          room: s.r || s.room || '',
          teacher: s.t || s.teacher || '',
        })),
        periods: obj.p.map((p: any, idx: number) => ({
          id: p.id || `p_${idx + 1}`,
          label: p.l || p.label || `Period ${idx + 1}`,
          startTime: p.s || p.startTime || '09:00',
          endTime: p.e || p.endTime || '10:00',
          isBreak: Boolean(p.b ?? p.isBreak),
        })),
        entries: obj.e.map((e: any, idx: number) => ({
          id: e.id || `entry_${Date.now()}_${idx}`,
          weekday: e.w ?? e.weekday,
          periodId: e.p || e.periodId,
          subjectId: e.s || e.subjectId,
          teacher: e.t || e.teacher,
          roomOverride: e.r || e.roomOverride,
        })),
      };
      return JSON.stringify(fullData);
    }
  } catch {
    // If parsing fails, return raw string to let importBackup validate
  }

  return trimmed;
}

export const ShareScheduleModal: React.FC<ShareScheduleModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const { subjects, periods, entries, importBackup, settings } = useApp();

  const [activeTab, setActiveTab] = useState<'share' | 'import'>('share');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // QR Camera Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const hasScannedRef = useRef(false);

  // Full readable payload for file export / manual code copy
  const sharePayload = useMemo(() => {
    const data = {
      version: '1.0',
      type: 'classtrack_timetable',
      studentName: settings.studentName || 'Student',
      subjects,
      periods,
      entries,
    };
    return JSON.stringify(data, null, 2);
  }, [subjects, periods, entries, settings.studentName]);

  // Mini payload for QR Code to keep QR code size optimal and fast to scan
  const qrPayload = useMemo(() => {
    try {
      const sMap = new Map<string, number>();
      subjects.forEach((s, idx) => sMap.set(s.id, idx));

      const pMap = new Map<string, number>();
      periods.forEach((p, idx) => pMap.set(p.id, idx));

      const compactData = {
        ct: 2,
        s: subjects.map(s => [s.name, s.color, s.room || '', s.teacher || '', s.id]),
        p: periods.map(p => [p.label, p.startTime, p.endTime, p.isBreak ? 1 : 0, p.id]),
        e: entries.map(e => {
          const pIdx = (e.periodId && pMap.has(e.periodId)) ? pMap.get(e.periodId)! : (e.periodId ?? '');
          const sIdx = (e.subjectId && sMap.has(e.subjectId)) ? sMap.get(e.subjectId)! : (e.subjectId ?? '');
          const arr: any[] = [e.weekday, pIdx, sIdx];
          if (e.teacher || e.roomOverride) {
            arr.push(e.teacher || '', e.roomOverride || '');
          }
          return arr;
        }),
      };
      return JSON.stringify(compactData);
    } catch {
      return '';
    }
  }, [subjects, periods, entries]);

  // QR Code Matrix using standard QR generator with quiet-zone padding
  const qrMatrix = useMemo(() => {
    if (!qrPayload) return null;
    return generateQRCodeMatrix(qrPayload, 'L');
  }, [qrPayload]);

  const handleCopyCode = () => {
    Clipboard.setString(sharePayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareNative = async () => {
    try {
      if (Platform.OS === 'web') {
        handleCopyCode();
        return;
      }

      const fileName = `ClassTrack_Schedule_${Date.now()}.json`;
      const file = new File(Paths.document, fileName);
      file.create({ overwrite: true });
      file.write(sharePayload);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Share Class Schedule with Classmates',
          UTI: 'public.json',
        });
      } else {
        await Share.share({
          message: sharePayload,
          title: 'ClassTrack Schedule Share',
        });
      }
    } catch (err: any) {
      Alert.alert('Share Failed', err?.message || 'Could not share schedule file.');
    }
  };

  const handleImportText = useCallback(
    async (content?: string) => {
      const rawText = content || importText.trim();
      if (!rawText) {
        Alert.alert('Empty Code', 'Please scan a QR code, paste a schedule code, or select a JSON file.');
        hasScannedRef.current = false;
        setScanned(false);
        return;
      }

      try {
        setIsImporting(true);
        const parsedPayload = parseTimetablePayload(rawText);

        await importBackup(parsedPayload);
        Alert.alert('Schedule Imported! 🎉', 'Class schedule has been successfully applied to your timetable.');
        setImportText('');
        setIsScanning(false);
        setScanned(false);
        hasScannedRef.current = false;
        onClose();
      } catch (err: any) {
        Alert.alert(
          'Import Failed',
          'Invalid or unreadable schedule format. Please check the QR code or file.',
          [
            {
              text: 'Try Again',
              onPress: () => {
                hasScannedRef.current = false;
                setScanned(false);
              },
            },
          ]
        );
        throw err;
      } finally {
        setIsImporting(false);
      }
    },
    [importText, importBackup, onClose]
  );

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || !res.assets[0]) return;

      const fileAsset = res.assets[0];
      let textContent = '';
      if (Platform.OS === 'web' && fileAsset.file) {
        textContent = await fileAsset.file.text();
      } else {
        const response = await fetch(fileAsset.uri);
        textContent = await response.text();
      }

      if (textContent) {
        setImportText(textContent);
        await handleImportText(textContent);
      }
    } catch (err: any) {
      Alert.alert('File Read Error', err?.message || 'Could not read selected file.');
    }
  };

  const handleStartScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera permission in your settings to scan classmate QR codes.'
        );
        return;
      }
    }
    hasScannedRef.current = false;
    setScanned(false);
    setIsScanning(true);
  };

  const handleBarCodeScanned = useCallback(
    async (result: BarcodeScanningResult | any) => {
      if (hasScannedRef.current) return;

      const rawData =
        result?.data ??
        result?.nativeEvent?.data ??
        (typeof result === 'string' ? result : '');

      if (!rawData || !rawData.trim()) return;

      hasScannedRef.current = true;
      setScanned(true);

      try {
        await handleImportText(rawData.trim());
      } catch {
        // If import fails, reset scan lock after delay so user can retry
        setTimeout(() => {
          hasScannedRef.current = false;
          setScanned(false);
        }, 1800);
      }
    },
    [handleImportText]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Share Schedule</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Share your timetable with classmates in 1 tap
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'share' && { backgroundColor: colors.primary, borderRadius: 10 },
              ]}
              onPress={() => {
                setIsScanning(false);
                setActiveTab('share');
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="qr-code-outline"
                size={16}
                color={activeTab === 'share' ? colors.onPrimary : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: activeTab === 'share' ? colors.onPrimary : colors.textSecondary }]}>
                Share / QR Code
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'import' && { backgroundColor: colors.primary, borderRadius: 10 },
              ]}
              onPress={() => setActiveTab('import')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="scan-outline"
                size={16}
                color={activeTab === 'import' ? colors.onPrimary : colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: activeTab === 'import' ? colors.onPrimary : colors.textSecondary }]}>
                Import / Scan QR
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {activeTab === 'share' ? (
              <View style={styles.shareSection}>
                {/* QR Code Card with quiet-zone padding */}
                <View style={[styles.qrCard, { backgroundColor: '#FFFFFF' }]}>
                  {qrMatrix && qrMatrix.length > 0 ? (
                    <Svg
                      width={220}
                      height={220}
                      viewBox={`0 0 ${qrMatrix.length + 8} ${qrMatrix.length + 8}`}
                    >
                      <Rect
                        x={0}
                        y={0}
                        width={qrMatrix.length + 8}
                        height={qrMatrix.length + 8}
                        fill="#FFFFFF"
                      />
                      {qrMatrix.map((row, r) =>
                        row.map((cell, c) =>
                          cell ? (
                            <Rect
                              key={`${r}_${c}`}
                              x={c + 4}
                              y={r + 4}
                              width={1}
                              height={1}
                              fill="#0F0C20"
                            />
                          ) : null
                        )
                      )}
                    </Svg>
                  ) : (
                    <View style={styles.qrFallback}>
                      <Ionicons name="qr-code" size={80} color="#0F0C20" />
                    </View>
                  )}
                </View>

                {/* Summary Info */}
                <View style={[styles.summaryCard, { backgroundColor: colors.surfaceVariant }]}>
                  <Text style={[styles.summaryTitle, { color: colors.text }]}>
                    📚 {subjects.length} Subjects • ⏱️ {periods.length} Periods • 📝 {entries.length} Slots
                  </Text>
                  <Text style={[styles.summarySub, { color: colors.textSecondary }]}>
                    Classmates can scan this QR code or import the code file to get your exact weekly timetable!
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                    onPress={handleCopyCode}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.text} />
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>
                      {copied ? 'Copied Code!' : 'Copy Code'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                    onPress={handleShareNative}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="share-social-outline" size={18} color={colors.onPrimary} />
                    <Text style={[styles.actionBtnText, { color: colors.onPrimary }]}>
                      Share File / Code
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.importSection}>
                {isScanning ? (
                  <View style={styles.scannerWrapper}>
                    <View style={styles.scannerHeader}>
                      <Text style={[styles.scannerHeaderTitle, { color: colors.text }]}>
                        Point Camera at QR Code
                      </Text>
                      <TouchableOpacity
                        style={[styles.closeScanBtn, { backgroundColor: colors.surfaceVariant }]}
                        onPress={() => {
                          setIsScanning(false);
                          setScanned(false);
                          hasScannedRef.current = false;
                        }}
                      >
                        <Ionicons name="close" size={18} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cameraBox}>
                      {permission?.granted ? (
                        <View style={StyleSheet.absoluteFill}>
                          <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            enableTorch={torch}
                            barcodeScannerSettings={BARCODE_SCANNER_SETTINGS}
                            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                          />

                          {/* Semi-transparent scan overlay rendered as sibling over the camera preview */}
                          <View style={[StyleSheet.absoluteFill, styles.overlayFrame]} pointerEvents="box-none">
                            <View style={styles.scanTargetBox}>
                              <View style={[styles.corner, styles.topLeft]} />
                              <View style={[styles.corner, styles.topRight]} />
                              <View style={[styles.corner, styles.bottomLeft]} />
                              <View style={[styles.corner, styles.bottomRight]} />
                              {scanned && (
                                <View style={styles.scannedSuccessBadge}>
                                  <Ionicons name="checkmark-circle" size={44} color="#10B981" />
                                  <Text style={styles.scannedSuccessText}>QR Detected!</Text>
                                </View>
                              )}
                            </View>

                            <Text style={styles.scanHintText}>
                              {scanned ? 'Applying timetable...' : 'Align classmate\'s QR code in frame'}
                            </Text>

                            <View style={styles.scanControlsRow}>
                              <TouchableOpacity
                                style={[styles.torchToggleBtn, torch && { backgroundColor: '#F59E0B' }]}
                                onPress={() => setTorch(prev => !prev)}
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name={torch ? 'flash' : 'flash-outline'}
                                  size={16}
                                  color={torch ? '#000' : '#FFF'}
                                />
                                <Text style={[styles.torchToggleText, torch && { color: '#000' }]}>
                                  {torch ? 'Flash ON' : 'Flashlight'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.noPermBox, { backgroundColor: colors.surfaceVariant }]}>
                          <Ionicons name="camera-outline" size={44} color={colors.primary} />
                          <Text style={[styles.noPermTitle, { color: colors.text }]}>
                            Camera Access Needed
                          </Text>
                          <Text style={[styles.noPermSub, { color: colors.textSecondary }]}>
                            Allow camera access to scan classmate's timetable QR code.
                          </Text>
                          <TouchableOpacity
                            style={[styles.permReqBtn, { backgroundColor: colors.primary }]}
                            onPress={requestPermission}
                          >
                            <Text style={[styles.permReqText, { color: colors.onPrimary }]}>
                              Grant Permission
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <>
                    {/* Primary QR Code Scan Button */}
                    <TouchableOpacity
                      style={[styles.scanQrBtn, { backgroundColor: colors.primary }]}
                      onPress={handleStartScanner}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="qr-code-outline" size={22} color={colors.onPrimary} />
                      <Text style={[styles.scanQrBtnText, { color: colors.onPrimary }]}>
                        Scan Classmate QR Code
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.orDivider, { color: colors.textTertiary }]}>— OR —</Text>

                    {/* Secondary File Pick Button */}
                    <TouchableOpacity
                      style={[styles.filePickerBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                      onPress={handlePickFile}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                      <Text style={[styles.filePickerText, { color: colors.text }]}>
                        Select Shared JSON Schedule File
                      </Text>
                    </TouchableOpacity>

                    <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>
                      PASTE TIMETABLE CODE / JSON
                    </Text>
                    <TextInput
                      style={[
                        styles.codeInput,
                        { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle },
                      ]}
                      placeholder="Paste ClassTrack schedule code or JSON here..."
                      placeholderTextColor={colors.textTertiary}
                      value={importText}
                      onChangeText={setImportText}
                      multiline
                    />

                    <TouchableOpacity
                      style={[
                        styles.importSubmitBtn,
                        { backgroundColor: colors.primary, opacity: isImporting || !importText.trim() ? 0.6 : 1 },
                      ]}
                      onPress={() => handleImportText()}
                      disabled={isImporting || !importText.trim()}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="download" size={18} color={colors.onPrimary} />
                      <Text style={[styles.importSubmitText, { color: colors.onPrimary }]}>
                        {isImporting ? 'Importing Schedule...' : 'Import & Apply Schedule'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.12)',
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    maxHeight: 520,
  },
  shareSection: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  qrCard: {
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  qrFallback: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  summarySub: {
    fontSize: 11,
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  importSection: {
    paddingBottom: 10,
  },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  scanQrBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
  orDivider: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    marginVertical: 12,
    letterSpacing: 1,
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  filePickerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  codeInput: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    height: 80,
    textAlignVertical: 'top',
  },
  importSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
  },
  importSubmitText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scannerWrapper: {
    marginBottom: 10,
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scannerHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  closeScanBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBox: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  overlayFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanTargetBox: {
    width: 190,
    height: 190,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#4E7DF7',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scannedSuccessBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  scannedSuccessText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
  scanHintText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scanControlsRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  torchToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  torchToggleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noPermBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  noPermTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  noPermSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  permReqBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permReqText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
