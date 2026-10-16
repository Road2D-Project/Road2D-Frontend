/**
 * CustomDateTimePickerModal.tsx
 * Bộ chọn ngày và giờ xuất phát tuỳ biến theo tông màu Road2D (#CD8554, #5D3A29, #FDFBF7).
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

const C = {
  primary: '#CD8554',
  primaryDark: '#A85A32',
  heading: '#5D3A29',
  text: '#3E2723',
  sub: '#6D4C41',
  bg: '#FDFBF7',
  card: '#FFFFFF',
  border: '#E8D0BC',
  disabled: '#C4B5A5',
  todayRing: '#CD8554',
};

interface Props {
  visible: boolean;
  initialDate?: Date;
  onClose: () => void;
  onConfirm: (date: Date) => void;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export const CustomDateTimePickerModal: React.FC<Props> = ({
  visible,
  initialDate,
  onClose,
  onConfirm,
}) => {
  const baseDate = initialDate || new Date();
  const [selectedYear, setSelectedYear] = useState(baseDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(baseDate.getMonth()); // 0-11
  const [selectedDay, setSelectedDay] = useState(baseDate.getDate());
  const [selectedHour, setSelectedHour] = useState(baseDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(
    Math.round(baseDate.getMinutes() / 5) * 5 % 60
  );

  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');

  // Tính toán số ngày trong tháng
  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth + 1, 0).getDate();
  }, [selectedYear, selectedMonth]);

  // Thứ của ngày đầu tháng (0 = Sunday, 1 = Monday,...) -> đổi sang Monday = 0
  const firstDayOfWeek = useMemo(() => {
    const day = new Date(selectedYear, selectedMonth, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [selectedYear, selectedMonth]);

  // Tính toán số tuần và các ô ngày (đảm bảo Chủ Nhật không bao giờ bị rớt hàng hay trống)
  const calendarWeeks = useMemo(() => {
    const cells: Array<{ day: number | null }> = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null });
    }
    const weeks: Array<Array<{ day: number | null }>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  }, [firstDayOfWeek, daysInMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleConfirm = () => {
    const finalDate = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      selectedHour,
      selectedMinute,
      0,
      0
    );
    onConfirm(finalDate);
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const formattedPreview = useMemo(() => {
    const d = new Date(
      selectedYear,
      selectedMonth,
      selectedDay,
      selectedHour,
      selectedMinute
    );
    const dayName = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][
      d.getDay()
    ];
    return `${pad(selectedHour)}:${pad(selectedMinute)} · ${dayName}, ${pad(selectedDay)}/${pad(
      selectedMonth + 1
    )}/${selectedYear}`;
  }, [selectedYear, selectedMonth, selectedDay, selectedHour, selectedMinute]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Chọn thời gian khởi hành</Text>
              <Text style={styles.subTitle}>Dự kiến giờ xuất phát của cả đoàn</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={C.heading} />
            </TouchableOpacity>
          </View>

          {/* Result preview pill */}
          <View style={styles.previewBox}>
            <Ionicons name="time" size={18} color={C.primary} style={{ marginRight: 8 }} />
            <Text style={styles.previewText} numberOfLines={1}>
              {formattedPreview}
            </Text>
          </View>

          {/* Switch tab Date vs Time */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'date' && styles.tabBtnActive]}
              onPress={() => setActiveTab('date')}
            >
              <Feather
                name="calendar"
                size={15}
                color={activeTab === 'date' ? '#FFF' : C.sub}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === 'date' && styles.tabBtnTextActive]}>
                Ngày {pad(selectedDay)}/{pad(selectedMonth + 1)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'time' && styles.tabBtnActive]}
              onPress={() => setActiveTab('time')}
            >
              <Feather
                name="clock"
                size={15}
                color={activeTab === 'time' ? '#FFF' : C.sub}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.tabBtnText, activeTab === 'time' && styles.tabBtnTextActive]}>
                Giờ {pad(selectedHour)}:{pad(selectedMinute)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Calendar */}
          {activeTab === 'date' ? (
            <View style={styles.calendarWrap}>
              {/* Month Navigator */}
              <View style={styles.monthNav}>
                <TouchableOpacity style={styles.navArrow} onPress={handlePrevMonth}>
                  <Ionicons name="chevron-back" size={18} color={C.heading} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>
                  Tháng {selectedMonth + 1}, {selectedYear}
                </Text>
                <TouchableOpacity style={styles.navArrow} onPress={handleNextMonth}>
                  <Ionicons name="chevron-forward" size={18} color={C.heading} />
                </TouchableOpacity>
              </View>

              {/* Weekdays */}
              <View style={styles.weekdayRow}>
                {WEEKDAYS.map((w) => (
                  <View key={w} style={styles.weekdayCol}>
                    <Text
                      style={[
                        styles.weekdayText,
                        w === 'CN' && { color: C.primary, fontWeight: '800' },
                      ]}
                    >
                      {w}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Days Grid - Vẽ từng hàng tuần 7 ngày, đảm bảo Chủ Nhật không bao giờ trống */}
              <View style={styles.daysGrid}>
                {calendarWeeks.map((week, weekIdx) => (
                  <View key={`week-${weekIdx}`} style={styles.weekRow}>
                    {week.map((cell, cellIdx) => {
                      if (cell.day === null) {
                        return <View key={`empty-${weekIdx}-${cellIdx}`} style={styles.dayCell} />;
                      }
                      const isSelected = cell.day === selectedDay;

                      return (
                        <TouchableOpacity
                          key={`day-${cell.day}`}
                          style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                          onPress={() => setSelectedDay(cell.day!)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.dayTextSelected,
                              cellIdx === 6 && !isSelected && { color: C.primaryDark },
                            ]}
                          >
                            {cell.day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            /* Tab 2: Time Picker (Hour & Minute - Hệ 24h dạng 2 cột trực quan) */
            <View style={styles.timeWrap}>
              <View style={styles.timeCol}>
                <Text style={styles.timeColLabel}>GIỜ (0 - 23H)</Text>
                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {HOURS.map((h) => {
                    const isSelected = h === selectedHour;
                    return (
                      <TouchableOpacity
                        key={`h-${h}`}
                        style={[styles.timeItem, isSelected && styles.timeItemSelected]}
                        onPress={() => setSelectedHour(h)}
                      >
                        <Text
                          style={[styles.timeItemText, isSelected && styles.timeItemTextSelected]}
                        >
                          {pad(h)}:00
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.timeCenterDivider}>
                <Text style={styles.timeColonText}>:</Text>
              </View>

              <View style={styles.timeCol}>
                <Text style={styles.timeColLabel}>PHÚT (0 - 55P)</Text>
                <ScrollView
                  style={styles.timeScroll}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  {MINUTES.map((m) => {
                    const isSelected = m === selectedMinute;
                    return (
                      <TouchableOpacity
                        key={`m-${m}`}
                        style={[styles.timeItem, isSelected && styles.timeItemSelected]}
                        onPress={() => setSelectedMinute(m)}
                      >
                        <Text
                          style={[styles.timeItemText, isSelected && styles.timeItemTextSelected]}
                        >
                          {pad(m)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Huỷ</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Xác nhận ngày giờ</Text>
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
  card: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: C.heading,
  },
  subTitle: {
    fontSize: 12,
    color: C.sub,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAE1D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5ECE3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  previewText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: C.heading,
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAE1D7',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.sub,
  },
  tabBtnTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  calendarWrap: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 280,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F7F3EE',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.heading,
  },
  weekdayRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DE',
    paddingBottom: 6,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
  },
  daysGrid: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
    marginVertical: 2,
  },
  dayCell: {
    flex: 1,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
  dayCellSelected: {
    backgroundColor: C.primary,
  },
  dayText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: C.heading,
  },
  dayTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    height: 280,
  },
  timeCol: {
    flex: 1,
    height: '100%',
  },
  timeColLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.sub,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  timeScroll: {
    flex: 1,
  },
  timeItem: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  timeItemSelected: {
    backgroundColor: C.primary,
  },
  timeItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  timeItemTextSelected: {
    color: '#FFF',
    fontWeight: '800',
  },
  timeCenterDivider: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  timeColonText: {
    fontSize: 24,
    fontWeight: '800',
    color: C.primary,
    marginTop: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '600',
    color: C.sub,
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default CustomDateTimePickerModal;
