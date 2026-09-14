import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
  Alert,
  Linking,
  Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { generateQRCodeMatrix } from '../../utils/qrGenerator';

interface ShareAppModalProps {
  visible: boolean;
  onClose: () => void;
  username?: string;
}

export const getAppDownloadUrl = (username?: string): string => {
  const safeName = (username || '').trim() || 'username';
  return `https://classtrack.charanztx.qzz.io/?shared_by=${encodeURIComponent(safeName)}&utm_source=app`;
};

export const getAppShareMessage = (username?: string): string => {
  const url = getAppDownloadUrl(username);
  const name = (username || '').trim();
  const greeting = name
    ? `Hey! ${name} is sharing ClassTrack with you.`
    : `Hey! Check out ClassTrack.`;

  return `${greeting} The ultimate personal academic companion for your timetable and attendance!

👉 Download link:
${url}

✨ Key Features to know before you download:
• 🛡️ 100% Offline & Private: No account or cloud sync needed. Timetables and attendance stay strictly on your device.
• 📱 6 Phone Launcher Widgets: Pin live class countdowns, attendance %, and routines directly to your phone's home screen.
• 🃏 Tinder-Style Attendance Deck: Mark lectures in seconds by swiping right (Present), left (Absent), or up (Cancelled) with full undo.
• 🧮 Smart Bunk & Recovery Calculator: Tells you exactly how many lectures you can safely skip while staying above your target percentage (e.g. 75%).
• 📲 1-Tap QR Timetable Sync: Share or import entire routines with classmates in 1 second using built-in QR scanning.
• 🔔 Pre & Post Class Reminders: 10-minute alerts with room & teacher info, plus forgotten attendance reminders.
• 🎓 Exams Countdown & Vacation Mode: Real-time exam countdown badges, plus automatic attendance pause during holiday breaks.
• 🎨 Material You Theming: 8 vibrant accent palettes with seamless Dark and Light modes.

👉 Download now:
${url}`;
};

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ visible, onClose, username }) => {
  const { colors } = useTheme();
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const downloadUrl = useMemo(() => getAppDownloadUrl(username), [username]);
  const shareMessage = useMemo(() => getAppShareMessage(username), [username]);

  // Generate QR code matrix pointing to personalized download link
  const qrMatrix = useMemo(() => {
    try {
      return generateQRCodeMatrix(downloadUrl);
    } catch {
      return null;
    }
  }, [downloadUrl]);

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({
            title: 'ClassTrack App Download',
            text: shareMessage,
            url: downloadUrl,
          });
          return;
        }
        Clipboard.setString(shareMessage);
        setCopiedType('message');
        setTimeout(() => setCopiedType(null), 3000);
        Alert.alert('Copied to Clipboard! 📋', 'Full share text with features and download link copied.');
        return;
      }

      await Share.share({
        title: 'ClassTrack App Download',
        message: shareMessage,
        url: downloadUrl,
      });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        Alert.alert('Share Error', err?.message || 'Could not share app link.');
      }
    }
  };

  const handleCopyLink = () => {
    Clipboard.setString(downloadUrl);
    setCopiedType('link');
    setTimeout(() => setCopiedType(null), 3000);
    Alert.alert('Link Copied! 🔗', `Personalized download link copied to clipboard:\n\n${downloadUrl}`);
  };

  const handleCopyText = () => {
    Clipboard.setString(shareMessage);
    setCopiedType('text');
    setTimeout(() => setCopiedType(null), 3000);
    Alert.alert('Share Text Copied! 📋', 'Full feature list and download link copied to clipboard.');
  };

  const handleOpenUrl = async () => {
    try {
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Cannot Open URL', `Unable to open browser to ${downloadUrl}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not open URL.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Top Bar */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.title, { color: colors.text }]}>Share ClassTrack</Text>
                <View style={[styles.tagBadge, { backgroundColor: colors.primaryContainer }]}>
                  <Text style={[styles.tagBadgeText, { color: colors.onPrimaryContainer }]}>
                    {username ? `@${username}` : 'v1.0.0 Free'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Personal download link with all features included in share text
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Download Link Card with Quick Copy */}
            <View
              style={[
                styles.linkBox,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.linkInfo}>
                <Ionicons name="link-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.linkLabel, { color: colors.textTertiary }]}>PERSONAL DOWNLOAD LINK</Text>
                  <Text
                    style={[styles.linkUrl, { color: colors.text }]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {downloadUrl}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: colors.primaryContainer }]}
                onPress={handleCopyLink}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={copiedType === 'link' ? 'checkmark' : 'copy-outline'}
                  size={15}
                  color={colors.onPrimaryContainer}
                />
                <Text style={[styles.copyBtnText, { color: colors.onPrimaryContainer }]}>
                  {copiedType === 'link' ? 'Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Primary Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.mainShareBtn, { backgroundColor: colors.primary }]}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Ionicons name="share-social" size={18} color={colors.onPrimary} />
                <Text style={[styles.mainShareText, { color: colors.onPrimary }]}>
                  Share App Link
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryActionBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                onPress={handleCopyText}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={copiedType === 'text' ? 'checkmark' : 'document-text-outline'}
                  size={17}
                  color={colors.primary}
                />
                <Text style={[styles.secondaryActionText, { color: colors.text }]}>
                  {copiedType === 'text' ? 'Copied' : 'Copy Text'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}
                onPress={handleOpenUrl}
                activeOpacity={0.7}
              >
                <Ionicons name="globe-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* QR Code Section for Fast Camera Scanning */}
            <View style={[styles.qrContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
              <View style={styles.qrHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.qrSectionTitle, { color: colors.text }]}>
                    Scan to Download Instantly 📷
                  </Text>
                  <Text style={[styles.qrSectionSubtitle, { color: colors.textSecondary }]}>
                    Have a classmate point their phone camera right at your screen!
                  </Text>
                </View>
                <View style={[styles.qrIconCircle, { backgroundColor: colors.primaryContainer }]}>
                  <Ionicons name="qr-code" size={18} color={colors.primary} />
                </View>
              </View>

              <View style={styles.qrWrapper}>
                <View style={styles.qrCard}>
                  {qrMatrix ? (
                    <Svg width={180} height={180} viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}>
                      <Rect x="0" y="0" width={qrMatrix.length} height={qrMatrix.length} fill="#FFFFFF" />
                      {qrMatrix.map((row, r) =>
                        row.map((cell, c) =>
                          cell ? (
                            <Rect
                              key={`${r}-${c}`}
                              x={c}
                              y={r}
                              width={1.02}
                              height={1.02}
                              fill="#0B0819"
                            />
                          ) : null
                        )
                      )}
                    </Svg>
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Ionicons name="qr-code-outline" size={48} color="#666" />
                    </View>
                  )}
                </View>
              </View>
              <Text style={[styles.qrFooterText, { color: colors.textTertiary }]}>
                {downloadUrl}
              </Text>
            </View>

            {/* Note about features being included in the sharing text */}
            <View style={[styles.infoBanner, { backgroundColor: colors.primaryContainer + '40', borderColor: colors.primary }]}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.infoBannerTitle, { color: colors.text }]}>
                  Features Included in Share Text ✨
                </Text>
                <Text style={[styles.infoBannerText, { color: colors.textSecondary }]}>
                  When you tap "Share App Link" or "Copy Text", all key feature details (Offline privacy, 6 home widgets, swipe attendance, bunk calculator, and QR timetable sync) are automatically formatted into your message!
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  linkLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  linkUrl: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  mainShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  mainShareText: {
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  qrContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  qrSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  qrSectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  qrIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  qrCard: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFooterText: {
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoBannerText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
