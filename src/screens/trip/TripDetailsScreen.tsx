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
  Alert,
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

function formatTripDate(isoString?: string): string {
  if (!isoString) return 'Chưa định ngày';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Chưa định ngày';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
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

  const handleShare = async () => {
    if (!trip) return;
    try {
      const inviteMsg = trip.inviteCode
        ? `\nMã mời tham gia: ${trip.inviteCode}\nLink tham gia: road2d://join/${trip.inviteCode}`
        : '';
      await Share.share({
        message: `Tham gia chuyến đi "${trip.name}" trên Road2D cùng mình!${inviteMsg}`,
      });
    } catch (err: any) {
      Alert.alert('Chia sẻ', err?.message || 'Không thể chia sẻ chuyến đi.');
    }
  };

  const isLeader = trip?.leaderId === currentUserId || trip?.myRole === 'leader';

  const handleLeaveTrip = () => {
    if (!trip) return;
    Alert.alert(
      'Rời chuyến đi',
      isLeader
        ? 'Bạn là Trưởng đoàn. Nếu bạn rời đi, quyền trưởng đoàn sẽ chuyển cho thành viên tiếp theo (hoặc huỷ nếu không còn ai). Bạn có chắc chắn muốn rời?'
        : 'Bạn có chắc chắn muốn rời khỏi chuyến đi này không?',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Rời chuyến đi',
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await leaveTripInStore(trip.id);
              Alert.alert('Thành công', 'Bạn đã rời khỏi chuyến đi.', [
                { text: 'OK', onPress: () => navigation.navigate('Home') },
              ]);
            } catch (err: any) {
              const msg = err?.response?.data?.message || 'Không thể rời chuyến đi.';
              Alert.alert('Lỗi', msg);
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteTrip = () => {
    if (!trip) return;
    Alert.alert(
      'Huỷ chuyến đi',
      'Hành động này sẽ xoá hoàn toàn chuyến đi khỏi hệ thống và không thể khôi phục. Bạn có chắc chắn muốn huỷ chuyến đi này không?',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Huỷ chuyến',
          style: 'destructive',
          onPress: async () => {
            setIsActionLoading(true);
            try {
              await deleteTripInStore(trip.id);
              Alert.alert('Thành công', 'Chuyến đi đã được huỷ.', [
                { text: 'OK', onPress: () => navigation.navigate('Home') },
              ]);
            } catch (err: any) {
              const msg = err?.response?.data?.message || 'Không thể huỷ chuyến đi.';
              Alert.alert('Lỗi', msg);
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Render Loading State ──────────────────────────────────────────────────
  if (loading && !trip) {
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
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Đang tải dữ liệu từ máy chủ...</Text>
        </View>
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

  if (!trip) {
    return null;
  }

  const isTripActive = trip.status === 'ACTIVE' || (trip.status as string) === 'active';
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          Chi tiết chuyến đi
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Feather name="share-2" size={20} color={C.heading} />
        </TouchableOpacity>
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

          {/* Badges on top */}
          <View style={styles.heroBadgeRow}>
            <View
              style={[
                styles.statusBadge,
                isTripActive
                  ? { backgroundColor: C.success }
                  : trip.status === 'LOCKED'
                  ? { backgroundColor: '#795548' }
                  : { backgroundColor: C.warning },
              ]}
            >
              <View style={styles.statusDot} />
              <Text style={styles.statusBadgeText}>
                {isTripActive ? 'ĐANG DIỄN RA' : trip.status === 'LOCKED' ? 'ĐÃ CHỐT ĐOÀN' : 'KẾ HOẠCH'}
              </Text>
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
            <Text style={styles.metricVal}>{trip.distanceKm} km</Text>
            <Text style={styles.metricLbl}>Quãng đường</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Thời gian */}
          <View style={styles.metricItem}>
            <Feather name="calendar" size={18} color={C.primary} />
            <Text style={styles.metricVal}>{formatTripDate(trip.startAt).split(' ')[0]}</Text>
            <Text style={styles.metricLbl}>Khởi hành</Text>
          </View>

          <View style={styles.metricDivider} />

          {/* Thành viên */}
          <View style={styles.metricItem}>
            <Feather name="users" size={18} color={C.primary} />
            <Text style={styles.metricVal}>
              {trip.members?.length || 1}/{trip.maxMembers}
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
                <MaterialCommunityIcons name="qrcode-scan" size={20} color={C.primary} />
                <Text style={styles.sectionTitle}>MÃ THAM GIA CHUYẾN ĐI</Text>
              </View>
              <TouchableOpacity style={styles.miniBtn} onPress={() => setShowQrModal(true)}>
                <MaterialCommunityIcons name="qrcode" size={14} color={C.primary} />
                <Text style={styles.miniBtnText}>Mã lớn</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inviteBoxRow}>
              <View style={styles.inviteCodeWrap}>
                <Text style={styles.inviteCodeLabel}>MÃ MỜI</Text>
                <Text style={styles.inviteCodeText}>{trip.inviteCode}</Text>
                <TouchableOpacity
                  style={styles.copyPill}
                  onPress={() => Alert.alert('Đã sao chép!', `Mã mời ${trip.inviteCode} đã được lưu.`)}
                >
                  <Feather name="copy" size={13} color={C.primary} />
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
            <Feather name="info" size={20} color={C.primary} />
            <Text style={styles.sectionTitle}>THÔNG TIN HÀNH TRÌNH</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Trưởng đoàn:</Text>
            <Text style={styles.infoValue}>{leaderMember?.name || 'Trưởng nhóm'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vai trò của bạn:</Text>
            <View style={[styles.rolePill, isLeader && styles.leaderRolePill]}>
              <Text style={[styles.rolePillText, isLeader && styles.leaderRolePillText]}>
                {isLeader ? 'Trưởng đoàn' : trip.myRole === 'admin' ? 'Quản trị viên' : 'Thành viên'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời gian xuất phát:</Text>
            <Text style={styles.infoValue}>{formatTripDate(trip.startAt)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chế độ hiển thị:</Text>
            <Text style={styles.infoValue}>
              {trip.isPublic ? 'Công khai (Bất kỳ ai có mã)' : 'Riêng tư (Chỉ thành viên được duyệt)'}
            </Text>
          </View>

          {/* Ghi chú */}
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>Ghi chú từ Trưởng đoàn</Text>
            <Text style={styles.noteContent}>
              {trip.note ? trip.note : 'Chưa có ghi chú đặc biệt cho chuyến đi này.'}
            </Text>
          </View>
        </View>

        {/* Danh sách thành viên */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Feather name="users" size={20} color={C.primary} />
              <Text style={styles.sectionTitle}>
                THÀNH VIÊN ({trip.members?.length || 1}/{trip.maxMembers})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.miniBtn}
              onPress={() => navigation.navigate('TeamRoster', { tripId: trip.id })}
            >
              <Text style={styles.miniBtnText}>Vào phòng chờ</Text>
              <Feather name="chevron-right" size={14} color={C.primary} />
            </TouchableOpacity>
          </View>

          {trip.members && trip.members.length > 0 ? (
            <View style={styles.memberListWrap}>
              {trip.members.map((member) => {
                const isMemberLeader = member.role === 'LEADER' || (member.role as string) === 'leader';
                const avatarUri =
                  member.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=CD8554&color=fff`;

                return (
                  <View key={member.userId} style={styles.memberRow}>
                    <Image source={{ uri: avatarUri }} style={styles.memberAvatar} />
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <Text style={styles.memberRoleText}>
                        {isMemberLeader ? 'Trưởng đoàn' : member.role === 'SWEEPER' ? 'Chốt đoàn' : 'Thành viên'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.memberStatusPill,
                        member.accepted ? styles.memberStatusActive : styles.memberStatusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.memberStatusText,
                          member.accepted ? styles.memberStatusTextActive : styles.memberStatusTextPending,
                        ]}
                      >
                        {member.accepted ? 'Đã tham gia' : 'Chờ xác nhận'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyMembersWrap}>
              <Text style={styles.emptyMembersText}>Chưa tải danh sách thành viên.</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        {/* Nút hành động chính */}
        {isTripActive ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('LiveTracking', { tripId: trip.id })}
          >
            <MaterialCommunityIcons name="navigation-variant" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Vào theo dõi hành trình</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('TeamRoster', { tripId: trip.id })}
          >
            <Ionicons name="people" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>
              {isLeader ? 'Phòng chờ & Chốt đoàn' : 'Vào phòng chờ'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Nút rời hoặc huỷ chuyến */}
        <View style={styles.bottomSubRow}>
          <TouchableOpacity
            style={styles.dangerTextBtn}
            onPress={handleLeaveTrip}
            disabled={isActionLoading}
          >
            <Feather name="log-out" size={15} color={C.danger} style={{ marginRight: 4 }} />
            <Text style={styles.dangerTextBtnLabel}>Rời chuyến đi</Text>
          </TouchableOpacity>

          {isLeader && (
            <TouchableOpacity
              style={styles.dangerTextBtn}
              onPress={handleDeleteTrip}
              disabled={isActionLoading}
            >
              <Feather name="trash-2" size={15} color={C.danger} style={{ marginRight: 4 }} />
              <Text style={styles.dangerTextBtnLabel}>Huỷ chuyến đi</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Modal xem mã QR lớn */}
      <Modal visible={showQrModal} transparent animationType="fade" onRequestClose={() => setShowQrModal(false)}>
        <View style={styles.modalOverlay}>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  headerBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.heading,
  },
  container: {
    padding: 20,
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
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
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
    padding: 18,
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: C.heading,
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  miniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FAF5EE',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    marginRight: 2,
  },

  // Invite & QR
  inviteBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteCodeWrap: {
    flex: 1,
    marginRight: 16,
  },
  inviteCodeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.sub,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inviteCodeText: {
    fontSize: 20,
    fontWeight: '900',
    color: C.primary,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  copyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
    marginLeft: 4,
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
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: C.sub,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: C.heading,
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: C.borderLight,
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

  // Bottom Sticky Bar
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
    marginBottom: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  bottomSubRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dangerTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dangerTextBtnLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.danger,
  },

  // Modal QR
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
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
