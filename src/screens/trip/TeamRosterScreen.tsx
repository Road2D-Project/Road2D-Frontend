import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TeamRosterRouteProp } from '../../types/navigation';
import { useTripStore } from '../../store/useTripStore';
import { useAuthStore } from '../../store/useAuthStore';
import tripService from '../../services/api/tripService';

// ─── Theme Tokens (Tuân thủ UI_GUIDELINES.md) ─────────────────────────────────
const C = {
  primary: '#CD8554',
  primaryDark: '#A85A32',
  heading: '#5D3A29',
  text: '#3E2723',
  sub: '#6D4C41',
  bg: '#FDFBF7',
  card: '#FFFFFF',
  border: '#E8D0BC',
  borderLight: '#F0E6DE',
  success: '#4CAF50',
  warning: '#FF9800',
  danger: '#D32F2F',
  dangerBg: '#FFEBEE',
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TeamRoster'>;

const TeamRosterScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TeamRosterRouteProp>();
  const tripId = route.params?.tripId;

  const currentUserId = useAuthStore((s) => s.user?.id);
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId));

  const [members, setMembers] = useState<any[]>(trip?.members || []);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Danh sách các user bị chặn chat trong chuyến đi (quản lý bởi Trưởng đoàn)
  const [blockedChatUsers, setBlockedChatUsers] = useState<Set<string>>(new Set());

  // Thành viên đang được chọn để mở menu 3 chấm
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  // Modal xác nhận thao tác (phong cách ScanQR)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: 'kick' | 'mute' | 'success' | 'error';
    title: string;
    message: string;
    confirmText: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'kick',
    title: '',
    message: '',
    confirmText: 'Đồng ý',
  });

  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!tripId) return;
    try {
      const list = await tripService.getTripMembers(tripId);
      if (Array.isArray(list) && list.length > 0) {
        setMembers(list);
      } else if (trip?.members && trip.members.length > 0) {
        setMembers(trip.members);
      }
    } catch {
      if (trip?.members) {
        setMembers(trip.members);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId, trip?.members]);

  useEffect(() => {
    setLoading(true);
    fetchMembers();
  }, [fetchMembers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMembers();
  }, [fetchMembers]);

  // Kiểm tra quyền Trưởng đoàn của người dùng hiện tại
  const isLeader =
    trip?.leaderId === currentUserId ||
    trip?.myRole === 'leader' ||
    (trip?.myRole as string) === 'LEADER' ||
    members.find((m) => m.userId === currentUserId)?.role === 'LEADER';

  // Mở menu 3 chấm cho thành viên
  const handleOpenMemberMenu = (member: any) => {
    setSelectedMember(member);
    setShowActionModal(true);
  };

  // Toggle chặn chat thành viên
  const handleToggleBlockChat = () => {
    if (!selectedMember) return;
    const isCurrentlyBlocked = blockedChatUsers.has(selectedMember.userId);
    setShowActionModal(false);

    setBlockedChatUsers((prev) => {
      const next = new Set(prev);
      if (isCurrentlyBlocked) {
        next.delete(selectedMember.userId);
      } else {
        next.add(selectedMember.userId);
      }
      return next;
    });

    setConfirmModal({
      visible: true,
      type: 'success',
      title: isCurrentlyBlocked ? 'Đã mở chặn chat' : 'Đã chặn chat',
      message: isCurrentlyBlocked
        ? `Thành viên ${selectedMember.name} đã có thể gửi tin nhắn trong nhóm chat.`
        : `Thành viên ${selectedMember.name} đã bị chặn gửi tin nhắn trong nhóm chat của chuyến đi.`,
      confirmText: 'Đóng',
    });
  };

  // Xác nhận Kick thành viên khỏi đoàn
  const handleConfirmKick = () => {
    if (!selectedMember || !tripId) return;
    setShowActionModal(false);

    setConfirmModal({
      visible: true,
      type: 'kick',
      title: 'Xoá thành viên khỏi đoàn?',
      message: `Bạn có chắc chắn muốn kick "${selectedMember.name}" khỏi chuyến đi này không? Thành viên này sẽ không thể theo dõi hành trình cùng đoàn.`,
      confirmText: 'Xoá thành viên',
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          await tripService.kickMember(tripId, selectedMember.userId);
          setMembers((prev) => prev.filter((m) => m.userId !== selectedMember.userId));
          setConfirmModal({
            visible: true,
            type: 'success',
            title: 'Đã xoá thành viên',
            message: `Đã loại bỏ ${selectedMember.name} khỏi chuyến đi.`,
            confirmText: 'Đóng',
          });
        } catch (err: any) {
          setConfirmModal({
            visible: true,
            type: 'error',
            title: 'Lỗi',
            message: err?.response?.data?.message || 'Không thể xoá thành viên khỏi đoàn.',
            confirmText: 'Đóng',
          });
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  const maxMembers = trip?.maxMembers || 15;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={C.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Thành viên đoàn ({members.length}/{maxMembers})
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {loading && members.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách thành viên...</Text>
          </View>
        ) : members.length === 0 ? (
          <View style={styles.centerBox}>
            <View style={styles.emptyIconCircle}>
              <Feather name="users" size={36} color={C.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có thành viên nào</Text>
            <Text style={styles.emptySub}>Chưa có ai tham gia chuyến đi này.</Text>
          </View>
        ) : (
          members.map((member, index) => {
            const isMemberLeader =
              member.role === 'LEADER' ||
              (member.role as string) === 'leader' ||
              member.userId === trip?.leaderId;
            const isMe = member.userId === currentUserId;
            const isChatBlocked = blockedChatUsers.has(member.userId);

            return (
              <View key={member.userId || `member-${index}`} style={styles.memberCard}>
                {/* Avatar */}
                <Image
                  source={{
                    uri:
                      member.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        member.name || 'User'
                      )}&background=CD8554&color=fff`,
                  }}
                  style={styles.memberAvatar}
                />

                {/* Info */}
                <View style={styles.memberInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {member.name || member.username || 'Thành viên'}
                    </Text>
                    {isMe && <Text style={styles.meTag}>(Bạn)</Text>}
                  </View>

                  <View style={styles.badgeRow}>
                    {/* Badge Vai trò */}
                    <View style={[styles.rolePill, isMemberLeader ? styles.leaderRolePill : styles.memberRolePill]}>
                      <Text style={isMemberLeader ? styles.leaderRolePillText : styles.memberRolePillText}>
                        {isMemberLeader ? 'Trưởng đoàn' : 'Thành viên'}
                      </Text>
                    </View>

                    {/* Badge Chặn chat nếu có */}
                    {isChatBlocked && (
                      <View style={styles.blockedPill}>
                        <Ionicons name="chatbubble-ellipses-outline" size={11} color={C.warning} />
                        <Text style={styles.blockedPillText}>Đã chặn chat</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Nút 3 chấm dọc: Chỉ hiển thị thao tác nếu người xem là Trưởng đoàn và không phải chính mình */}
                {isLeader && !isMemberLeader && !isMe ? (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleOpenMemberMenu(member)}
                    activeOpacity={0.7}
                  >
                    <Feather name="more-vertical" size={20} color={C.heading} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 28 }} />
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal Menu 3 Chấm Dọc cho Trưởng đoàn ───────────────────────── */}
      <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
        <TouchableOpacity
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={() => setShowActionModal(false)}
        >
          <View style={styles.actionModalBox}>
            <View style={styles.actionModalIndicator} />

            {/* Thông tin thành viên đang chọn */}
            {selectedMember && (
              <View style={styles.actionModalHeader}>
                <Image
                  source={{
                    uri:
                      selectedMember.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedMember.name || 'User'
                      )}&background=CD8554&color=fff`,
                  }}
                  style={styles.actionModalAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionModalName} numberOfLines={1}>
                    {selectedMember.name || 'Thành viên'}
                  </Text>
                  <Text style={styles.actionModalSub}>Quản lý thành viên chuyến đi</Text>
                </View>
              </View>
            )}

            {/* Tuỳ chọn 1: Chặn chat / Bỏ chặn chat */}
            <TouchableOpacity style={styles.actionModalItem} onPress={handleToggleBlockChat}>
              <Ionicons
                name={selectedMember && blockedChatUsers.has(selectedMember.userId) ? 'chatbubbles-outline' : 'chatbubble-ellipses-outline'}
                size={20}
                color={C.heading}
                style={{ marginRight: 12 }}
              />
              <Text style={styles.actionModalItemText}>
                {selectedMember && blockedChatUsers.has(selectedMember.userId)
                  ? 'Bỏ chặn chat thành viên'
                  : 'Chặn chat thành viên'}
              </Text>
            </TouchableOpacity>

            {/* Tuỳ chọn 2: Xoá thành viên khỏi đoàn (Kick) */}
            <TouchableOpacity style={styles.actionModalItem} onPress={handleConfirmKick}>
              <Ionicons name="person-remove-outline" size={20} color={C.danger} style={{ marginRight: 12 }} />
              <Text style={[styles.actionModalItemText, { color: C.danger }]}>
                Xoá khỏi đoàn (Kick)
              </Text>
            </TouchableOpacity>

            {/* Nút Đóng */}
            <TouchableOpacity
              style={[styles.actionModalItem, { borderBottomWidth: 0, marginTop: 4 }]}
              onPress={() => setShowActionModal(false)}
            >
              <Ionicons name="close" size={20} color={C.sub} style={{ marginRight: 12 }} />
              <Text style={[styles.actionModalItemText, { color: C.sub }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal Cảnh Báo Custom (ScanQR Style) ─────────────────────────── */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View
              style={[
                styles.customModalIconWrap,
                confirmModal.type === 'kick' || confirmModal.type === 'error'
                  ? styles.customModalIconDanger
                  : styles.customModalIconNotice,
              ]}
            >
              <Ionicons
                name={
                  confirmModal.type === 'success'
                    ? 'checkmark-circle'
                    : confirmModal.type === 'kick'
                      ? 'person-remove-outline'
                      : 'information-circle'
                }
                size={44}
                color={
                  confirmModal.type === 'kick' || confirmModal.type === 'error'
                    ? C.danger
                    : confirmModal.type === 'success'
                      ? C.success
                      : C.primary
                }
              />
            </View>

            <Text style={styles.customModalTitle}>{confirmModal.title}</Text>
            <Text style={styles.customModalMessage}>{confirmModal.message}</Text>

            <View style={styles.customModalButtonColumn}>
              <TouchableOpacity
                style={[
                  styles.customModalPrimaryBtn,
                  confirmModal.type === 'kick' || confirmModal.type === 'error'
                    ? { backgroundColor: C.danger }
                    : { backgroundColor: C.primary },
                  isActionLoading && { opacity: 0.7 },
                ]}
                disabled={isActionLoading}
                onPress={() => {
                  if (confirmModal.onConfirm) {
                    confirmModal.onConfirm();
                  } else {
                    setConfirmModal((prev) => ({ ...prev, visible: false }));
                  }
                }}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.customModalPrimaryBtnText}>{confirmModal.confirmText}</Text>
                )}
              </TouchableOpacity>

              {confirmModal.type !== 'success' && confirmModal.type !== 'error' && (
                <TouchableOpacity
                  style={styles.customModalSecondaryBtn}
                  onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
                >
                  <Text style={styles.customModalSecondaryBtnText}>Quay lại</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: Platform.OS === 'android' ? 14 : 8,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  backButton: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.heading,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: C.sub,
    fontWeight: '500',
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FAF5EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
  },

  // Member Card
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.heading,
  },
  meTag: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
    marginLeft: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rolePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  leaderRolePill: {
    backgroundColor: '#FDF0E6',
    borderWidth: 1,
    borderColor: C.primary,
  },
  leaderRolePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  memberRolePill: {
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  memberRolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.sub,
  },
  blockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  blockedPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E65100',
  },
  actionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#FAF5EE',
    marginLeft: 8,
  },

  // Action Bottom Modal
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  actionModalBox: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
  },
  actionModalIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#E0D5CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    marginBottom: 4,
  },
  actionModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 12,
  },
  actionModalName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.heading,
  },
  actionModalSub: {
    fontSize: 12,
    color: C.sub,
    marginTop: 2,
  },
  actionModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  actionModalItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.heading,
  },

  // ScanQR Style Custom Modal
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customModalBox: {
    backgroundColor: C.card,
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 22,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: C.border,
  },
  customModalIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  customModalIconNotice: {
    backgroundColor: '#FDF1E8',
  },
  customModalIconDanger: {
    backgroundColor: '#FFEBEE',
  },
  customModalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.heading,
    textAlign: 'center',
    marginBottom: 8,
  },
  customModalMessage: {
    fontSize: 14.5,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  customModalButtonColumn: {
    width: '100%',
    gap: 10,
  },
  customModalPrimaryBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  customModalPrimaryBtnText: {
    color: '#FFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  customModalSecondaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5ECE3',
    width: '100%',
  },
  customModalSecondaryBtnText: {
    color: C.heading,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default TeamRosterScreen;
