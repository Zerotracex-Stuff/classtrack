import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Subject } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface SubjectModalProps {
  visible: boolean;
  onClose: () => void;
  editingSubject?: Subject | null;
}

const PRESET_COLORS = [
  '#4F46E5', '#059669', '#D97706', '#7C3AED',
  '#E11D48', '#0284C7', '#0D9488', '#EA580C',
  '#EC4899', '#8B5CF6', '#10B981', '#F59E0B',
  '#6366F1', '#14B8A6', '#64748B', '#09090B'
];

const PRESET_ICONS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'book-outline', label: 'Book' },
  { icon: 'flask-outline', label: 'Science' },
  { icon: 'calculator-outline', label: 'Math' },
  { icon: 'code-slash-outline', label: 'Code' },
  { icon: 'desktop-outline', label: 'CS' },
  { icon: 'color-palette-outline', label: 'Art' },
  { icon: 'earth-outline', label: 'Geo' },
  { icon: 'fitness-outline', label: 'Sports' },
  { icon: 'musical-notes-outline', label: 'Music' },
  { icon: 'briefcase-outline', label: 'Biz' },
  { icon: 'bulb-outline', label: 'Logic' },
  { icon: 'construct-outline', label: 'Eng' },
  { icon: 'trophy-outline', label: 'Award' },
  { icon: 'newspaper-outline', label: 'Lit' },
  { icon: 'medkit-outline', label: 'Bio' },
  { icon: 'hardware-chip-outline', label: 'Tech' },
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  visible,
  onClose,
  editingSubject,
}) => {
  const { colors } = useTheme();
  const { addSubject, updateSubject, deleteSubject } = useApp();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [teacher, setTeacher] = useState('');
  const [room, setRoom] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0].icon);
  const [initialAttended, setInitialAttended] = useState('0');
  const [initialTotal, setInitialTotal] = useState('0');

  React.useEffect(() => {
    if (editingSubject) {
      setName(editingSubject.name);
      setCode(editingSubject.code || '');
      setTeacher(editingSubject.teacher || '');
      setRoom(editingSubject.room || '');
      setCategory(editingSubject.category || '');
      setColor(editingSubject.color || PRESET_COLORS[0]);
      setIcon(editingSubject.icon || PRESET_ICONS[0].icon);
      setInitialAttended(editingSubject.initialAttended ? String(editingSubject.initialAttended) : '0');
      setInitialTotal(editingSubject.initialTotal ? String(editingSubject.initialTotal) : '0');
    } else {
      setName('');
      setCode('');
      setTeacher('');
      setRoom('');
      setCategory('');
      setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
      setIcon(PRESET_ICONS[0].icon);
      setInitialAttended('0');
      setInitialTotal('0');
    }
  }, [editingSubject, visible]);

  const handleSave = async () => {
    if (!name.trim()) return;

    const initAtt = parseInt(initialAttended || '0', 10) || 0;
    const initTot = parseInt(initialTotal || '0', 10) || 0;

    if (editingSubject) {
      await updateSubject({
        ...editingSubject,
        name: name.trim(),
        code: code.trim() || undefined,
        teacher: teacher.trim() || undefined,
        room: room.trim() || undefined,
        category: category.trim() || undefined,
        color,
        icon,
        initialAttended: initAtt,
        initialTotal: Math.max(initAtt, initTot),
      });
    } else {
      await addSubject({
        name: name.trim(),
        code: code.trim() || undefined,
        teacher: teacher.trim() || undefined,
        room: room.trim() || undefined,
        category: category.trim() || undefined,
        color,
        icon,
        initialAttended: initAtt,
        initialTotal: Math.max(initAtt, initTot),
      });
    }

    onClose();
  };

  const handleDelete = async () => {
    if (editingSubject) {
      await deleteSubject(editingSubject.id);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>SUBJECT NAME *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle }]}
              placeholder="e.g. Operating Systems"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />

            <View style={styles.twoCols}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>SUBJECT CODE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle }]}
                  placeholder="e.g. CS302"
                  placeholderTextColor={colors.textTertiary}
                  value={code}
                  onChangeText={setCode}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>CATEGORY</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle }]}
                  placeholder="e.g. Major / Elective"
                  placeholderTextColor={colors.textTertiary}
                  value={category}
                  onChangeText={setCategory}
                />
              </View>
            </View>

            <View style={styles.twoCols}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>DEFAULT ROOM</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle }]}
                  placeholder="e.g. Hall 201"
                  placeholderTextColor={colors.textTertiary}
                  value={room}
                  onChangeText={setRoom}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginTop: 14 }]}>DEFAULT TEACHER</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceVariant, color: colors.text, borderColor: colors.borderSubtle }]}
                  placeholder="Optional (set per period)"
                  placeholderTextColor={colors.textTertiary}
                  value={teacher}
                  onChangeText={setTeacher}
                />
              </View>
            </View>

            {/* Baseline / Previous Attendance */}
            <View style={[styles.baselineBox, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderSubtle }]}>
              <View style={styles.baselineHeader}>
                <Ionicons name="stats-chart" size={16} color={colors.primary} />
                <Text style={[styles.baselineTitle, { color: colors.text }]}>
                  Baseline / Previous Attendance
                </Text>
              </View>
              <Text style={[styles.baselineSubtitle, { color: colors.textSecondary }]}>
                If you already have attendance recorded before using ClassTrack, enter it here.
              </Text>

              <View style={styles.twoCols}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>
                    ATTENDED SO FAR
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle },
                    ]}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={initialAttended}
                    onChangeText={setInitialAttended}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginTop: 10 }]}>
                    TOTAL HELD SO FAR
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: colors.surface, color: colors.text, borderColor: colors.borderSubtle },
                    ]}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    value={initialTotal}
                    onChangeText={setInitialTotal}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* Icon Picker */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 16 }]}>SUBJECT ICON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {PRESET_ICONS.map(item => {
                const isSelected = icon === item.icon;
                return (
                  <TouchableOpacity
                    key={item.icon}
                    style={[
                      styles.iconChip,
                      {
                        backgroundColor: isSelected ? color : colors.surfaceVariant,
                        borderColor: isSelected ? color : colors.borderSubtle,
                      },
                    ]}
                    onPress={() => setIcon(item.icon)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={item.icon} size={18} color={isSelected ? '#FFF' : colors.text} />
                    <Text
                      style={[
                        styles.iconChipText,
                        { color: isSelected ? '#FFF' : colors.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Color Swatches */}
            <Text style={[styles.label, { color: colors.textSecondary, marginTop: 4 }]}>SUBJECT COLOR</Text>
            <View style={styles.colorRow}>
              {PRESET_COLORS.map(c => {
                const isSelected = color === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c, borderColor: isSelected ? colors.text : 'transparent' },
                    ]}
                    onPress={() => setColor(c)}
                    activeOpacity={0.8}
                  >
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            {editingSubject && (
              <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: colors.absentBg }]} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={18} color={colors.absent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: name.trim() ? 1 : 0.6 }]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>
                {editingSubject ? 'Save Changes' : 'Create Subject'}
              </Text>
            </TouchableOpacity>
          </View>
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  twoCols: {
    flexDirection: 'row',
  },
  baselineBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  baselineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  baselineTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  baselineSubtitle: {
    fontSize: 11,
    lineHeight: 16,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  iconChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  iconChipText: {
    fontSize: 12,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    gap: 12,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
