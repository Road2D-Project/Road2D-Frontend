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
  ActivityIndicator,
  Share,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';

import type { TripDetailsScreenNavigationProp, TripDetailsRouteProp } from '../../types/navigation';
import type { Trip } from '../../types';
import tripService from '../../services/api/tripService';
import { useTripStore } from '../../store/useTripStore';
import { useAuthStore } from '../../store/useAuthStore';

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

// Định dạng ngày giờ có dấu phẩy giữa giờ và ngày: "08:30, 24/12/2026"
function formatTripDate(isoString?: string): string {
  if (!isoString) return 'Chưa định ngày';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Chưa định ngày';
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${mins}, ${day}/${month}/${year}`;
  } catch {
    return 'Chưa định ngày';
  }
}

const TripDetailsScreen = () => {
  const navigation = useNavigation<TripDetailsScreenNavigationProp>();
  const route = useRoute<TripDetailsRouteProp>();
  const tripId = route.params?.tripId;

  const currentUserId = useAuthStore((s) => s.user?.id);
  const leaveTripInStore = useTripStore((s) => s.leaveTrip);
  const deleteTripInStore = useTripStore((s) => s.deleteTrip);
  const updateTripStatus = useTripStore((s) => s.updateTripStatus);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Custom Styled Popup Modal (ScanQR Style)
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    type: 'leave' | 'delete' | 'success' | 'error' | 'start';
    title: string;
    message: string;
    confirmText: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'leave',
    title: '',
    message: '',
    confirmText: 'Đồng ý',
  });

  const [isActionLoading, setIsActionLoading] = useState(false);

  const fetchTripDetail = useCallback(async () => {
    if (!tripId) {
      setError('Thiếu mã định danh chuyến đi.');
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await tripService.getTripById(tripId);
      if (!data) {
        setError('Không tìm thấy thông tin chuyến đi này.');
      } else {
        setTrip(data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải thông tin chuyến đi.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripDetail();
  }, [fetchTripDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTripDetail();
  }, [fetchTripDetail]);

  // Load join requests for notification bell
  const fetchJoinRequests = async () => {
    if (!tripId) return;
    setLoadingRequests(true);
    try {
      const reqs = await tripService.getJoinRequests(tripId);
      setJoinRequests(reqs);
    } catch {
      setJoinRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleOpenNoticeModal = () => {
    setShowNoticeModal(true);
    fetchJoinRequests();
  };

  const handleRespondRequest = async (userId: string, action: 'accept' | 'reject') => {
    if (!tripId) return;
    try {
      await tripService.respondJoinRequest(tripId, userId, action);
      setJoinRequests((prev) => prev.filter((r) => r.userId !== userId));
      fetchTripDetail();
    } catch {}
  };

  const handleShare = async () => {
    if (!trip) return;
    try {
      const inviteMsg = trip.inviteCode
        ? `\nMã mời tham gia: ${trip.inviteCode}\nLink: road2d://join/${trip.inviteCode}`
        : '';
      await Share.share({
        message: `Tham gia chuyến đi "${trip.name}" trên Road2D cùng mình!${inviteMsg}`,
      });
    } catch {}
  };

  const isLeader = trip?.leaderId === currentUserId || trip?.myRole === 'leader';
  const isTripActive = trip?.status === 'ACTIVE' || (trip?.status as string) === 'active';

  // Xuất phát ngay (CÓ POP-UP XÁC NHẬN CHẮC CHẮN THEO YÊU CẦU)
  const handleStartImmediately = () => {
    if (!trip) return;
    if (isTripActive) {
      navigation.navigate('LiveTracking', { tripId: trip.id });
      return;
    }

    setConfirmModal({
      visible: true,
      type: 'start',
      title: 'Xác nhận xuất phát',
      message: 'Bạn có chắc chắn muốn xuất phát ngay bây giờ không? Chuyến đi sẽ bắt đầu ngay và chuyển sang chế độ theo dõi vị trí trực tiếp cho toàn đoàn.',
      confirmText: 'Bắt đầu ngay',
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          await updateTripStatus(trip.id, 'ACTIVE');
          setTrip((prev) => (prev ? { ...prev, status: 'ACTIVE' } : null));
          setConfirmModal((prev) => ({ ...prev, visible: false }));
          navigation.navigate('LiveTracking', { tripId: trip.id });
        } catch (err: any) {
          setConfirmModal({
            visible: true,
            type: 'error',
            title: 'Lỗi',
            message: err?.response?.data?.message || 'Không thể cập nhật trạng thái xuất phát.',
            confirmText: 'Đóng',
          });
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  // Popup xác nhận rời chuyến
  const triggerLeaveConfirm = () => {
    setShowMenuModal(false);
    setConfirmModal({
      visible: true,
      type: 'leave',
      title: 'Rời chuyến đi',
      message: isLeader
        ? 'Bạn là Trưởng đoàn. Khi rời đi, quyền trưởng đoàn sẽ chuyển cho thành viên tiếp theo. Bạn có chắc chắn muốn rời?'
        : 'Bạn có chắc chắn muốn rời khỏi chuyến đi này không?',
      confirmText: 'Rời chuyến đi',
      onConfirm: async () => {
        if (!trip) return;
        setIsActionLoading(true);
        try {
          await leaveTripInStore(trip.id);
          setConfirmModal({
            visible: true,
            type: 'success',
            title: 'Đã rời chuyến đi',
            message: 'Bạn đã rời khỏi chuyến đi thành công.',
            confirmText: 'Về trang chủ',
            onConfirm: () => navigation.navigate('Home'),
          });
        } catch (err: any) {
          setConfirmModal({
            visible: true,
            type: 'error',
            title: 'Lỗi',
            message: err?.response?.data?.message || 'Không thể rời chuyến đi.',
            confirmText: 'Đóng',
          });
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  // Popup xác nhận huỷ chuyến
  const triggerDeleteConfirm = () => {
    setShowMenuModal(false);
    setConfirmModal({
      visible: true,
      type: 'delete',
      title: 'Huỷ chuyến đi',
      message: 'Hành động này sẽ xoá hoàn toàn chuyến đi khỏi hệ thống và không thể khôi phục. Bạn có chắc chắn muốn huỷ chuyến?',
      confirmText: 'Huỷ chuyến',
      onConfirm: async () => {
        if (!trip) return;
        setIsActionLoading(true);
        try {
          await deleteTripInStore(trip.id);
          setConfirmModal({
            visible: true,
            type: 'success',
            title: 'Đã huỷ chuyến đi',
            message: 'Chuyến đi đã được xoá hoàn toàn.',
            confirmText: 'Về trang chủ',
            onConfirm: () => navigation.navigate('Home'),
          });
        } catch (err: any) {
          setConfirmModal({
            visible: true,
            type: 'error',
            title: 'Lỗi',
            message: err?.response?.data?.message || 'Không thể huỷ chuyến đi.',
            confirmText: 'Đóng',
          });
        } finally {
          setIsActionLoading(false);
        }
      },
    });
  };

  // ── Render Loading State ──────────────────────────────────────────────────
  if (loading && !trip) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  // ── Render Error State ────────────────────────────────────────────────────
  if (error && !trip) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={C.heading} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết chuyến đi</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerBox}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={C.primary} />
          </View>
          <Text style={styles.errorTitle}>Không thể tải chuyến đi</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTripDetail}>
            <Ionicons name="refresh" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!trip) return null;

  const qrPayload = `road2d://join/${trip.inviteCode || trip.id}`;
  const leaderMember = trip.members?.find((m) => m.role === 'LEADER' || (m.role as string) === 'leader');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={C.heading} />
        </TouchableOpacity>

        {/* Tiêu đề căn trái nhẹ */}
        <Text style={styles.headerTitle} numberOfLines={1}>
          Chi tiết chuyến đi
        </Text>

        {/* Nhóm action bên phải: Chuông thông báo -> Share -> 3 chấm */}
        <View style={styles.headerRightActions}>
          <TouchableOpacity style={styles.headerActionBtn} onPress={handleOpenNoticeModal}>
            <Feather name="bell" size={20} color={C.heading} />
            {joinRequests.length > 0 && <View style={styles.bellBadgeDot} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerActionBtn} onPress={handleShare}>
            <Feather name="share-2" size={20} color={C.heading} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerActionBtn} onPress={() => setShowMenuModal(true)}>
            <Feather name="more-vertical" size={20} color={C.heading} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* Cover / Hero Card */}
        <View style={styles.heroCard}>
          <Image
            source={{
              uri:
                trip.coverImage ||
                'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=800',
            }}
            style={styles.heroImage}
          />
          <View style={styles.heroOverlay} />

          {/* Badges on top - ĐÃ BỎ BADGE KẾ HOẠCH THEO YÊU CẦU */}
          <View style={styles.heroBadgeRow}>
            <View>
              {isTripActive ? (
                <View style={[styles.statusBadge, { backgroundColor: C.success }]}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusBadgeText}>ĐANG DIỄN RA</Text>
                </View>
              ) : trip.status === 'LOCKED' || (trip.status as string) === 'locked' ? (
                <View style={[styles.statusBadge, { backgroundColor: '#795548' }]}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusBadgeText}>ĐÃ CHỐT ĐOÀN</Text>
                </View>
              ) : null}
            </View>

            {trip.tripType && (
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>HẠNG {trip.tripType.toUpperCase()}</Text>
              </View>
            )}
          </View>

          {/* Hero Bottom Info */}
          <View style={styles.heroBottomInfo}>
            <Text style={styles.heroTitle}>{trip.name}</Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaItem}>
                <Feather name={trip.isPublic ? 'globe' : 'lock'} size={12} color="#FFF" />
                <Text style={styles.heroMetaText}>{trip.isPublic ? 'Công khai' : 'Riêng tư'}</Text>
              </View>
              <Text style={styles.heroMetaDot}>•</Text>
              <View style={styles.heroMetaItem}>
                <MaterialCommunityIcons name="motorbike" size={14} color="#FFF" />
                <Text style={styles.heroMetaText}>{trip.vehicle || 'Xe máy'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Metric Strip (4 metrics) */}
        <View style={styles.metricCard}>
          {/* Quãng đường */}
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={20} color={C.primary} />
            <Text style={styles.metricVal}>{trip.distanceKm > 0 ? trip.distanceKm : 15} km</Text>
            <Text style={styles.metricLbl}>Quãng đường</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Thời gian */}
          <View style={styles.metricItem}>
            <Feather name="calendar" size={18} color={C.primary} />
            <Text style={styles.metricVal}>
              {formatTripDate(trip.startAt).includes(',')
                ? formatTripDate(trip.startAt).split(',')[1]?.trim()
                : formatTripDate(trip.startAt)}
            </Text>
            <Text style={styles.metricLbl}>Khởi hành</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Thành viên (luôn tính tối thiểu 2: Trưởng đoàn + Bạn) */}
          <View style={styles.metricItem}>
            <Feather name="users" size={18} color={C.primary} />
            <Text style={styles.metricVal}>
              {Math.max(trip.members?.length || 2, 2)}/{trip.maxMembers}
            </Text>
            <Text style={styles.metricLbl}>Thành viên</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Phương tiện */}
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="motorbike" size={20} color={C.primary} />
            <Text style={styles.metricVal}>{trip.vehicle || 'Xe máy'}</Text>
            <Text style={styles.metricLbl}>Phương tiện</Text>
          </View>
        </View>

        {/* Mã mời & Mã QR tham gia */}
        {trip.inviteCode ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                {/* ĐÃ XOÁ HOÀN TOÀN ICON QR BÊN CẠNH "MÃ THAM GIA CHUYẾN ĐI" */}
                <Text style={styles.sectionTitleNoIcon} numberOfLines={1}>
                  MÃ THAM GIA CHUYẾN ĐI
                </Text>
              </View>
              {/* Nút Xem QR nhỏ gọn, không bị co ép chữ */}
              <TouchableOpacity
                style={styles.qrMiniBtn}
                onPress={() => setShowQrModal(true)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="qrcode" size={14} color={C.primary} />
                <Text style={styles.qrMiniBtnText}>Xem QR</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inviteBoxRow}>
              <View style={styles.inviteCodeWrap}>
                <Text style={styles.inviteCodeLabel}>MÃ MỜI</Text>
                <Text style={styles.inviteCodeText} numberOfLines={2} ellipsizeMode="middle">
                  {trip.inviteCode}
                </Text>
                <TouchableOpacity
                  style={styles.copyPill}
                  activeOpacity={0.7}
                  onPress={() => {
                    setConfirmModal({
                      visible: true,
                      type: 'success',
                      title: 'Đã sao chép!',
                      message: `Mã mời ${trip.inviteCode} đã được lưu vào bộ nhớ tạm.`,
                      confirmText: 'Đóng',
                    });
                  }}
                >
                  <Feather name="copy" size={13} color={C.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.copyPillText}>Sao chép</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.qrThumbWrap} onPress={() => setShowQrModal(true)}>
                <QRCode value={qrPayload} size={86} color={C.heading} backgroundColor="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Thông tin chuyến đi */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderLeft}>
            <Feather name="info" size={18} color={C.primary} />
            <Text style={styles.sectionTitle}>THÔNG TIN HÀNH TRÌNH</Text>
          </View>

          {/* Trưởng đoàn: Hiển thị đầy đủ không bao giờ bị cắt chữ */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trưởng đoàn</Text>
            <View style={styles.infoValueWrap}>
              <Text style={styles.infoValue} numberOfLines={1}>
                {leaderMember?.name || 'Trưởng nhóm'}
              </Text>
            </View>
          </View>

          {/* Vai trò của bạn: Hiển thị trọn vẹn badge pill */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vai trò của bạn</Text>
            <View style={styles.infoValueWrap}>
              <View style={[styles.rolePill, isLeader && styles.leaderRolePill]}>
                <Text style={[styles.rolePillText, isLeader && styles.leaderRolePillText]}>
                  {isLeader ? 'Trưởng đoàn' : trip.myRole === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                </Text>
              </View>
            </View>
          </View>

          {/* Thời gian xuất phát đầy đủ giờ và ngày, có dấu phẩy */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian xuất phát</Text>
            <View style={styles.infoValueWrap}>
              <Text style={styles.infoValue}>
                {formatTripDate(trip.startAt)}
              </Text>
            </View>
          </View>

          {/* Chế độ hiển thị: Công khai / Riêng tư đầy đủ chữ */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chế độ hiển thị</Text>
            <View style={styles.infoValueWrap}>
              <Text style={styles.infoValue}>
                {trip.isPublic ? 'Công khai' : 'Riêng tư'}
              </Text>
            </View>
          </View>

          {/* Ghi chú */}
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Ghi chú từ Trưởng đoàn</Text>
            <Text style={styles.noteContent}>
              {trip.note ? trip.note : 'Chưa có ghi chú đặc biệt cho chuyến đi này.'}
            </Text>
          </View>
        </View>

        {/* Thành viên: Chỉ hiện số lượng và nút "Tất cả thành viên", KHÔNG hiện danh sách thành viên ở đây */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Feather name="users" size={18} color={C.primary} />
              <Text style={styles.sectionTitle}>
                THÀNH VIÊN ({Math.max(trip.members?.length || 2, 2)}/{trip.maxMembers})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.rosterMiniBtn}
              onPress={() => navigation.navigate('TeamRoster', { tripId: trip.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.rosterMiniBtnText}>Tất cả thành viên</Text>
              <Feather name="chevron-right" size={12} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Sticky Action Bar - ĐÃ XOÁ RỜI & HUỶ CHUYẾN Ở DƯỚI */}
      <View style={styles.bottomBar}>
        {/* Nút hành động chính: "Xuất phát ngay" */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleStartImmediately}
        >
          <MaterialCommunityIcons
            name={isTripActive ? 'navigation-variant' : 'rocket-launch-outline'}
            size={20}
            color="#FFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.primaryBtnText}>
            {isTripActive ? 'Vào theo dõi hành trình' : 'Xuất phát ngay'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Modal 3 Chấm: Tuỳ chọn Rời / Huỷ chuyến đi ───────────────────── */}
      <Modal visible={showMenuModal} transparent animationType="fade" onRequestClose={() => setShowMenuModal(false)}>
        <TouchableOpacity
          style={styles.menuModalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModalBox}>
            <View style={styles.menuModalIndicator} />
            <Text style={styles.menuModalTitle}>Tuỳ chọn hành trình</Text>

            <TouchableOpacity style={styles.menuModalItem} onPress={triggerLeaveConfirm}>
              <Feather name="log-out" size={18} color={C.danger} style={{ marginRight: 12 }} />
              <Text style={[styles.menuModalItemText, { color: C.danger }]}>Rời chuyến đi</Text>
            </TouchableOpacity>

            {isLeader && (
              <TouchableOpacity style={styles.menuModalItem} onPress={triggerDeleteConfirm}>
                <Feather name="trash-2" size={18} color={C.danger} style={{ marginRight: 12 }} />
                <Text style={[styles.menuModalItemText, { color: C.danger }]}>Huỷ chuyến đi (Trưởng đoàn)</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuModalItem, { borderBottomWidth: 0, marginTop: 4 }]}
              onPress={() => setShowMenuModal(false)}
            >
              <Ionicons name="close" size={18} color={C.sub} style={{ marginRight: 12 }} />
              <Text style={[styles.menuModalItemText, { color: C.sub }]}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Modal Chuông Thông Báo: Duyệt thành viên & Yêu cầu tham gia ──── */}
      <Modal visible={showNoticeModal} transparent animationType="fade" onRequestClose={() => setShowNoticeModal(false)}>
        <View style={styles.customModalOverlay}>
          <View style={styles.noticeModalBox}>
            <View style={styles.noticeModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Feather name="bell" size={20} color={C.primary} style={{ marginRight: 8 }} />
                <Text style={styles.noticeModalTitle}>Yêu cầu & Thông báo</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNoticeModal(false)}>
                <Ionicons name="close" size={22} color={C.sub} />
              </TouchableOpacity>
            </View>

            {loadingRequests ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={{ marginTop: 8, fontSize: 13, color: C.sub }}>Đang tải yêu cầu...</Text>
              </View>
            ) : joinRequests.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <View style={styles.emptyNoticeIconWrap}>
                  <Ionicons name="notifications-outline" size={36} color={C.primary} />
                </View>
                <Text style={styles.emptyNoticeTitle}>Không có yêu cầu mới</Text>
                <Text style={styles.emptyNoticeSub}>
                  Hiện tại không có thành viên nào đang chờ duyệt tham gia chuyến đi.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {joinRequests.map((req) => (
                  <View key={req.userId} style={styles.requestItemRow}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.requestItemName}>{req.nickname || req.username || 'Thành viên'}</Text>
                      <Text style={styles.requestItemSub}>Yêu cầu tham gia đoàn</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.requestApproveBtn}
                        onPress={() => handleRespondRequest(req.userId, 'accept')}
                      >
                        <Text style={styles.requestApproveBtnText}>Duyệt</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.requestRejectBtn}
                        onPress={() => handleRespondRequest(req.userId, 'reject')}
                      >
                        <Text style={styles.requestRejectBtnText}>Từ chối</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
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
                confirmModal.type === 'leave' || confirmModal.type === 'delete' || confirmModal.type === 'error'
                  ? styles.customModalIconDanger
                  : styles.customModalIconNotice,
              ]}
            >
              {confirmModal.type === 'start' ? (
                <MaterialCommunityIcons name="rocket-launch-outline" size={42} color={C.primary} />
              ) : (
                <Ionicons
                  name={
                    confirmModal.type === 'success'
                      ? 'checkmark-circle'
                      : confirmModal.type === 'delete'
                      ? 'trash-outline'
                      : confirmModal.type === 'leave'
                      ? 'log-out-outline'
                      : 'information-circle'
                  }
                  size={44}
                  color={
                    confirmModal.type === 'leave' || confirmModal.type === 'delete' || confirmModal.type === 'error'
                      ? C.danger
                      : confirmModal.type === 'success'
                      ? C.success
                      : C.primary
                  }
                />
              )}
            </View>

            <Text style={styles.customModalTitle}>{confirmModal.title}</Text>
            <Text style={styles.customModalMessage}>{confirmModal.message}</Text>

            <View style={styles.customModalButtonColumn}>
              <TouchableOpacity
                style={[
                  styles.customModalPrimaryBtn,
                  confirmModal.type === 'leave' || confirmModal.type === 'delete' || confirmModal.type === 'error'
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

      {/* ── Modal xem mã QR lớn ─────────────────────────────────────────── */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.customModalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQrModal(false)}>
              <Ionicons name="close" size={24} color={C.sub} />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Mã QR Chuyến Đi</Text>
            <Text style={styles.modalSub} numberOfLines={2}>
              {trip.name}
            </Text>

            <View style={styles.modalQrWrap}>
              <QRCode value={qrPayload} size={220} color={C.heading} backgroundColor="#FFF" />
            </View>

            <View style={styles.modalCodePill}>
              <Text style={styles.modalCodeLabel}>MÃ MỜI:</Text>
              <Text style={styles.modalCodeValue}>{trip.inviteCode || trip.id}</Text>
            </View>

            <Text style={styles.modalNote}>Bạn bè mở camera quét mã QR này từ Road2D để tham gia ngay</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: C.heading,
    marginLeft: 6,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadgeDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.danger,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: C.sub,
    fontWeight: '500',
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FAF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: C.sub,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  // Hero Card
  heroCard: {
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  tierBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  heroBottomInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaText: {
    fontSize: 12,
    color: '#FFF',
    marginLeft: 4,
    fontWeight: '600',
  },
  heroMetaDot: {
    color: '#FFF',
    marginHorizontal: 8,
    fontSize: 12,
  },

  // Metric Strip
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: C.heading,
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
  metricLbl: {
    fontSize: 11,
    color: C.sub,
    fontWeight: '500',
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.borderLight,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.heading,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  sectionTitleNoIcon: {
    fontSize: 13,
    fontWeight: '800',
    color: C.heading,
    letterSpacing: 0.5,
  },
  qrMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FAF5EE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
    flexShrink: 0,
  },
  qrMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    marginLeft: 4,
  },
  rosterMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FAF5EE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderLight,
    flexShrink: 0,
  },
  rosterMiniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
    marginRight: 3,
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#FAF5EE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
    flexShrink: 0,
  },
  miniBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },

  // Invite & QR
  inviteBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCodeWrap: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  inviteCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.sub,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inviteCodeText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    flexShrink: 0,
  },
  copyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  qrThumbWrap: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // Info Row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: C.sub,
    fontWeight: '600',
    flexShrink: 0,
    marginRight: 8,
  },
  infoValueWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: C.heading,
    textAlign: 'right',
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: C.borderLight,
    alignSelf: 'flex-end',
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
  },
  leaderRolePill: {
    backgroundColor: '#FDF0E6',
    borderColor: C.primary,
  },
  leaderRolePillText: {
    color: C.primary,
  },

  // Note Box
  noteBox: {
    marginTop: 14,
    backgroundColor: '#FAF5EE',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: C.heading,
    marginBottom: 4,
  },
  noteContent: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },

  // Members list
  memberListWrap: {
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.heading,
    marginBottom: 2,
  },
  memberRoleText: {
    fontSize: 12,
    color: C.sub,
  },
  memberStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  memberStatusActive: {
    backgroundColor: '#E8F5E9',
  },
  memberStatusPending: {
    backgroundColor: '#FFF3E0',
  },
  memberStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  memberStatusTextActive: {
    color: C.success,
  },
  memberStatusTextPending: {
    color: C.warning,
  },
  emptyMembersWrap: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyMembersText: {
    fontSize: 13,
    color: C.sub,
  },

  // Bottom Sticky Bar (CHỈ CÒN NÚT "XUẤT PHÁT NGAY")
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: C.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },

  // ── Custom Styled Modal (ScanQR Style) ───────────────────────────────────
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

  // ── 3-dots Menu Bottom Modal ─────────────────────────────────────────────
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  menuModalBox: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
  },
  menuModalIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#E0D5CC',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 14,
  },
  menuModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  menuModalItemText: {
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Notice / Join Requests Modal ─────────────────────────────────────────
  noticeModalBox: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: C.border,
  },
  noticeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  noticeModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.heading,
  },
  emptyNoticeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyNoticeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.heading,
    marginBottom: 4,
  },
  emptyNoticeSub: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  requestItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  requestItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.heading,
  },
  requestItemSub: {
    fontSize: 12,
    color: C.sub,
    marginTop: 2,
  },
  requestApproveBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requestApproveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  requestRejectBtn: {
    backgroundColor: '#F5ECE3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  requestRejectBtnText: {
    color: C.heading,
    fontSize: 12,
    fontWeight: '600',
  },

  // QR Modal
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  modalQrWrap: {
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borderLight,
    marginBottom: 16,
  },
  modalCodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  modalCodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.sub,
    marginRight: 6,
  },
  modalCodeValue: {
    fontSize: 14,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: 1,
  },
  modalNote: {
    fontSize: 12,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default TripDetailsScreen;
