import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Subject } from '../../types';
import { SubjectModal } from './SubjectModal';
import { Ionicons } from '@expo/vector-icons';

interface SubjectListModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SubjectListModal: React.FC<SubjectListModalProps> = ({ visible, onClose }) => {
  const { colors } = useTheme();
  const { subjects, getSubjectStats } = useApp();

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject);
    setSubjectModalVisible(true);
  };

  const handleAddNew = () => {
    setEditingSubject(null);
    setSubjectModalVisible(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Manage Subjects</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {subjects.length} subjects • Tap any subject to edit or delete
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Subjects List */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {subjects.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="book-outline" size={40} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No subjects added yet.
                </Text>
              </View>
            ) : (
              subjects.map(subject => {
                const stats = getSubjectStats(subject.id);
                return (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderSubtle,
                        borderLeftColor: subject.color,
                      },
                    ]}
                    onPress={() => handleEditSubject(subject)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardLeft}>
                      <View style={[styles.iconCircle, { backgroundColor: subject.color + '20' }]}>
                        <Ionicons name={(subject.icon as any) || 'book-outline'} size={18} color={subject.color} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={1}>
                          {subject.name}
                        </Text>
                        <Text style={[styles.subjectMeta, { color: colors.textSecondary }]}>
                          {subject.code ? `${subject.code} • ` : ''}
                          {subject.teacher ? `👤 ${subject.teacher}` : 'Teachers set per period'}
                          {subject.room ? ` • 📍 ${subject.room}` : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      <View style={[styles.statBadge, { backgroundColor: colors.surfaceVariant }]}>
                        <Text style={[styles.statText, { color: colors.textSecondary }]}>
                          {stats.percentage}%
                        </Text>
                      </View>
                      <View style={[styles.editIconCircle, { backgroundColor: colors.surfaceVariant }]}>
                        <Ionicons name="pencil" size={13} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={handleAddNew}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.onPrimary} />
              <Text style={[styles.addBtnText, { color: colors.onPrimary }]}>Add New Subject</Text>
            </TouchableOpacity>
          </View>

          {/* Subject Add/Edit Modal */}
          <SubjectModal
            visible={subjectModalVisible}
            onClose={() => setSubjectModalVisible(false)}
            editingSubject={editingSubject}
          />
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
    maxHeight: '85%',
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
  body: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  subjectCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
  },
  subjectMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 6,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
