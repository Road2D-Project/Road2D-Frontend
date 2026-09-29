import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

const MEMBERS = [
  { id: '1', name: 'Nguyễn Văn A', role: 'Trưởng đoàn (Xế)', fund: 'Đã nộp', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150' },
  { id: '2', name: 'Trần Thị B', role: 'Thành viên (Ôm)', fund: 'Chưa nộp', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150' },
  { id: '3', name: 'Lê Văn C', role: 'Thành viên (Xế)', fund: 'Đã nộp', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150' },
];

const TeamRosterScreen = () => {
  const navigation = useNavigation<any>();
  const [checklist, setChecklist] = useState([
    { id: 1, text: 'Đổ đầy bình xăng', checked: true },
    { id: 2, text: 'Áo mưa bộ', checked: false },
    { id: 3, text: 'Bộ sơ cứu y tế', checked: false }
  ]);

  const toggleCheck = (id: number) => {
    setChecklist(checklist.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phòng chờ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        {/* Code Display */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>MÃ CHUYẾN ĐI</Text>
          <Text style={styles.codeText}>R2D-9X42</Text>
          <TouchableOpacity style={styles.shareButton}>
            <Ionicons name="share-social" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.shareButtonText}>Chia sẻ</Text>
          </TouchableOpacity>
        </View>

        {/* Group Note */}
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>📌 Ghi chú từ Trưởng đoàn</Text>
          <Text style={styles.noteText}>Nhớ mang áo mưa. Góp quỹ chung 500k/người. Xuất phát đúng 5h sáng.</Text>
        </View>

        {/* Checklist */}
        <View style={styles.checklistSection}>
          <Text style={styles.listTitle}>Checklist trước khi đi</Text>
          {checklist.map(item => (
            <TouchableOpacity key={item.id} style={styles.checkItem} onPress={() => toggleCheck(item.id)}>
              <View style={[styles.checkbox, item.checked && styles.checkboxActive]}>
                {item.checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <Text style={[styles.checkText, item.checked && styles.checkTextDone]}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Member List */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Danh sách đoàn</Text>
          <Text style={styles.listCount}>3/15</Text>
        </View>

        {MEMBERS.map((member) => (
          <View key={member.id} style={styles.memberCard}>
            <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={[styles.memberRole, member.role.includes('Trưởng đoàn') && styles.leaderRole]}>{member.role}</Text>
            </View>
            <View style={styles.fundStatus}>
              <Text style={[styles.fundText, member.fund === 'Đã nộp' ? styles.fundDone : styles.fundPending]}>
                {member.fund}
              </Text>
            </View>
          </View>
        ))}

        {/* Group Chat Button */}
        <TouchableOpacity style={styles.chatButton}>
          <Ionicons name="chatbubbles" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.chatBtnText}>Chat nhóm</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('LiveTracking')} // Bắt đầu -> Về trang Live Tracking
        >
          <Text style={styles.primaryButtonText}>Chốt Đoàn - Bắt Đầu!</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  icon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  container: {
    padding: 20,
  },
  codeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 8,
  },
  codeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.textPrimary,
    fontFamily: 'UTM Facebook',
    marginBottom: 20,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  shareIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  listCount: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  leaderRole: {
    color: colors.primary,
    fontWeight: '600',
  },
  fundStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  fundText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  fundDone: {
    color: '#4CAF50',
  },
  fundPending: {
    color: '#FF5252',
  },
  noteBox: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8F00',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  checklistSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D7CCC8',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkIcon: {
    width: 14,
    height: 14,
  },
  checkText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  checkTextDone: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3E2723',
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
  },
  chatIcon: {
    width: 20,
    height: 20,
    marginRight: 8,
  },
  chatBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: '#4CAF50', // Màu xanh success cho nút Bắt đầu
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default TeamRosterScreen;
