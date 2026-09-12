import React, { useState, useMemo } from 'react';
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
import { CameraView, useCameraPermissions } from 'expo-camera';

interface ShareScheduleModalProps {
  visible: boolean;
  onClose: () => void;
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
  const [permission, requestPermission] = useCameraPermissions();

  // Generate payload for sharing
  const sharePayload = useMemo(() => {
    const data = {
      version: '1.0',
      type: 'classtrack_timetable',
      studentName: settings.studentName || 'Student',
      subjects,
      periods,
      entries,
    };
    return JSON.stringify(data);
  }, [subjects, periods, entries, settings.studentName]);

  // QR Code Matrix
  const qrMatrix = useMemo(() => {
    try {
      // Compress payload for QR
      const miniData = {
        n: settings.studentName || 'ClassTrack',
        s: subjects.map(s => ({ id: s.id, n: s.name, c: s.color, r: s.room, t: s.teacher })),
        p: periods.map(p => ({ id: p.id, l: p.label, s: p.startTime, e: p.endTime, b: p.isBreak })),
        e: entries.map(e => ({ w: e.weekday, p: e.periodId, s: e.subjectId, t: e.teacher, r: e.roomOverride })),
      };
      return generateQRCodeMatrix(JSON.stringify(miniData));
    } catch {
      return null;
    }
  }, [subjects, periods, entries, settings.studentName]);

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

  const handleImportText = async (content?: string) => {
    const payloadStr = content || importText.trim();
    if (!payloadStr) {
      Alert.alert('Empty Code', 'Please scan a QR code, paste a schedule code, or select a JSON file.');
      return;
    }

    try {
      setIsImporting(true);
      let parsedPayload = payloadStr;

      if (payloadStr.startsWith('{') || payloadStr.startsWith('[')) {
        const obj = JSON.parse(payloadStr);
        if (obj.s && obj.p && obj.e) {
          // Mini QR payload expansion
          const fullData = {
            subjects: obj.s.map((s: any) => ({ id: s.id, name: s.n, color: s.c, room: s.r, teacher: s.t })),
            periods: obj.p.map((p: any) => ({ id: p.id, label: p.l, startTime: p.s, endTime: p.e, isBreak: p.b })),
            entries: obj.e.map((e: any) => ({ weekday: e.w, periodId: e.p, subjectId: e.s, teacher: e.t, roomOverride: e.r })),
          };
          parsedPayload = JSON.stringify(fullData);
        }
      }

      await importBackup(parsedPayload);
      Alert.alert('Schedule Imported! 🎉', 'Class schedule has been successfully applied to your timetable.');
      setImportText('');
      setIsScanning(false);
      onClose();
    } catch (err: any) {
      Alert.alert('Import Failed', 'Invalid or unreadable schedule format. Please check the QR code or file.');
    } finally {
      setIsImporting(false);
    }
  };

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
          'Please allow camera permission in settings to scan classmate QR codes.'
        );
        return;
      }
    }
    setScanned(false);
    setIsScanning(true);
  };

  const handleBarCodeScanned = async (result: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    if (result.data) {
      setImportText(result.data);
      await handleImportText(result.data);
    }
  };

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
                {/* QR Code Card */}
                <View style={[styles.qrCard, { backgroundColor: '#FFFFFF' }]}>
                  {qrMatrix ? (
                    <Svg width={200} height={200} viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}>
                      {qrMatrix.map((row, r) =>
                        row.map((cell, c) =>
                          cell ? (
                            <Rect
                              key={`${r}_${c}`}
                              x={c}
                              y={r}
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
                        onPress={() => setIsScanning(false)}
                      >
                        <Ionicons name="close" size={18} color={colors.text} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.cameraBox}>
                      {permission?.granted ? (
                        <CameraView
                          style={StyleSheet.absoluteFill}
                          facing="back"
                          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        >
                          <View style={styles.overlayFrame}>
                            <View style={styles.scanTargetBox}>
                              <View style={[styles.corner, styles.topLeft]} />
                              <View style={[styles.corner, styles.topRight]} />
                              <View style={[styles.corner, styles.bottomLeft]} />
                              <View style={[styles.corner, styles.bottomRight]} />
                            </View>
                            <Text style={styles.scanHintText}>Align classmate's QR code in frame</Text>
                          </View>
                        </CameraView>
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
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
  },
  shareSection: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  qrCard: {
    padding: 16,
    borderRadius: 24,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  qrFallback: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    width: '100%',
    padding: 14,
    borderRadius: 16,
    marginVertical: 10,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  summarySub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
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
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  overlayFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanTargetBox: {
    width: 180,
    height: 180,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
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
  scanHintText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
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
