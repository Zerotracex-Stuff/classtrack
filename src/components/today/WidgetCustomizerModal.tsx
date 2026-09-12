import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useApp } from '../../context/AppContext';
import { Ionicons } from '@expo/vector-icons';

export interface WidgetItem {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  enabled: boolean;
}

export const ALL_WIDGET_DEFINITIONS: Omit<WidgetItem, 'enabled'>[] = [
  { id: 'holiday_banner', name: 'Active Holiday Alert', description: 'Displays current vacation break notice', icon: 'sunny-outline' },
  { id: 'now_next', name: 'Happening Now / Next Class', description: 'Live active lecture countdown timer', icon: 'time-outline' },
  { id: 'day_horizontal', name: "Today's Classes (Horizontal Chips)", description: 'Side-by-side horizontal period card deck', icon: 'swap-horizontal-outline' },
  { id: 'today_schedule', name: "Today's Class Timeline (Vertical)", description: 'Chronological vertical timeline of period slots', icon: 'list-outline' },
  { id: 'weekly_grid', name: 'Weekly Schedule Overview Grid', description: 'Mon–Sun weekly class count overview grid', icon: 'calendar-outline' },
  { id: 'swipe_deck', name: '1-Swipe Attendance Deck', description: 'Gesture-driven attendance swipe cards', icon: 'albums-outline' },
  { id: 'quick_actions', name: 'Quick Action Shortcuts', description: '1-tap QR share, schedule, bunks & launcher', icon: 'grid-outline' },
  { id: 'attendance_health', name: 'Attendance Health & Gauge', description: 'Overall percentage & safe bunk margin', icon: 'analytics-outline' },
  { id: 'attendance_analytics', name: 'Weekly & Monthly Analytics', description: 'Weekday bar chart & bunk risk trends', icon: 'bar-chart-outline' },
  { id: 'upcoming_exams', name: 'Upcoming Exam Countdown', description: 'Nearest midterm & final exam deadlines', icon: 'school-outline' },
  { id: 'smart_tips', name: 'Daily Productivity Tips', description: 'Study guidance & attendance pro tips', icon: 'bulb-outline' },
];

export const DEFAULT_WIDGET_ORDER = ALL_WIDGET_DEFINITIONS.map(w => w.id);

interface WidgetCustomizerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const WidgetCustomizerModal: React.FC<WidgetCustomizerModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const { settings, updateSettings } = useApp();

  const [widgetList, setWidgetList] = useState<WidgetItem[]>([]);

  useEffect(() => {
    const currentOrder = settings.widgetOrder || DEFAULT_WIDGET_ORDER;
    // Map in saved order
    const list: WidgetItem[] = [];
    currentOrder.forEach(id => {
      const def = ALL_WIDGET_DEFINITIONS.find(d => d.id === id);
      if (def) {
        list.push({ ...def, enabled: true });
      }
    });

    // Add any missing definitions as disabled at the bottom
    ALL_WIDGET_DEFINITIONS.forEach(def => {
      if (!list.some(item => item.id === def.id)) {
        list.push({ ...def, enabled: false });
      }
    });

    setWidgetList(list);
  }, [visible, settings.widgetOrder]);

  const handleToggle = (id: string) => {
    setWidgetList(prev =>
      prev.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    setWidgetList(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index >= widgetList.length - 1) return;
    setWidgetList(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const handleReset = () => {
    const defaultList = ALL_WIDGET_DEFINITIONS.map(w => ({ ...w, enabled: true }));
    setWidgetList(defaultList);
  };

  const handleSave = async () => {
    const enabledOrder = widgetList.filter(w => w.enabled).map(w => w.id);
    await updateSettings({
      widgetOrder: enabledOrder,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Customize Home Widgets</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Toggle widgets on/off and reorder your Home dashboard
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Reset button */}
          <View style={styles.topActionsRow}>
            <TouchableOpacity
              style={[styles.resetBtn, { backgroundColor: colors.surfaceVariant }]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh-outline" size={14} color={colors.primary} />
              <Text style={[styles.resetText, { color: colors.primary }]}>Reset Defaults</Text>
            </TouchableOpacity>
          </View>

          {/* Widgets List */}
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {widgetList.map((widget, index) => (
              <View
                key={widget.id}
                style={[
                  styles.widgetRow,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.borderSubtle,
                    opacity: widget.enabled ? 1 : 0.6,
                  },
                ]}
              >
                {/* Reorder Arrows */}
                <View style={styles.orderControls}>
                  <TouchableOpacity
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={styles.arrowBtn}
                  >
                    <Ionicons
                      name="chevron-up"
                      size={18}
                      color={index === 0 ? colors.textTertiary : colors.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMoveDown(index)}
                    disabled={index === widgetList.length - 1}
                    style={styles.arrowBtn}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={index === widgetList.length - 1 ? colors.textTertiary : colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {/* Widget Icon & Title */}
                <View style={[styles.iconBox, { backgroundColor: colors.primaryContainer }]}>
                  <Ionicons name={widget.icon} size={18} color={colors.primary} />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.widgetName, { color: colors.text }]}>{widget.name}</Text>
                  <Text style={[styles.widgetSub, { color: colors.textSecondary }]}>
                    {widget.description}
                  </Text>
                </View>

                {/* Toggle Switch */}
                <Switch
                  value={widget.enabled}
                  onValueChange={() => handleToggle(widget.id)}
                  trackColor={{ false: colors.surfaceVariant, true: colors.primary }}
                  thumbColor={colors.onPrimary}
                />
              </View>
            ))}
          </ScrollView>

          {/* Footer Action */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle }]}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.onPrimary} />
              <Text style={[styles.saveText, { color: colors.onPrimary }]}>Save Dashboard Layout</Text>
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
    paddingBottom: 10,
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: 20,
  },
  widgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  orderControls: {
    marginRight: 8,
    alignItems: 'center',
  },
  arrowBtn: {
    padding: 2,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetName: {
    fontSize: 14,
    fontWeight: '700',
  },
  widgetSub: {
    fontSize: 11,
    marginTop: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
