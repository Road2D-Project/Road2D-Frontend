import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import type { HomeScreenNavigationProp } from '../../types/navigation';
import { useTripStore } from '../../store/useTripStore';
import { useAuthStore } from '../../store/useAuthStore';
import tripService from '../../services/api/tripService';

// ─── Theme Colors ─────────────────────────────────────────────────────────────
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
    });
  } catch {
    return 'Chưa định ngày';
  }
}

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  // Auth User
  const user = useAuthStore((s) => s.user);
  const displayName = user?.nickname || user?.username || 'Bạn';
  const avatarUri =
    user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=CD8554&color=fff`;

  // Trips from Backend Store
  const trips = useTripStore((s) => s.trips);
  const fetchTrips = useTripStore((s) => s.fetchTrips);
  const tripsLoading = useTripStore((s) => s.loading);
  const hasFetched = useTripStore((s) => s.hasFetched);

  const [refreshing, setRefreshing] = useState(false);

  // FAB Menu animation
  const [isFabMenuVisible, setIsFabMenuVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  // Invite code join modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inputInviteCode, setInputInviteCode] = useState('');
  const [joiningTrip, setJoiningTrip] = useState(false);

  // Custom styled alert modal theo phong cách ScanQR
  const [homeAlertModal, setHomeAlertModal] = useState<{
    visible: boolean;
    type: 'success' | 'notice' | 'error';
    title: string;
    message: string;
    primaryBtnText?: string;
    onPrimaryPress?: () => void;
  }>({
    visible: false,
    type: 'notice',
    title: '',
    message: '',
  });

  // Gọi fetchTrips ngay khi component vừa mount để tránh giật lag
  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Auto fetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, [fetchTrips]);

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isFabMenuVisible ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [isFabMenuVisible]);

  // Handle Join by Invite Code
  const handleJoinWithCode = async () => {
    const code = inputInviteCode.trim();
    if (!code) {
      setHomeAlertModal({
        visible: true,
        type: 'notice',
        title: 'Chưa nhập mã',
        message: 'Vui lòng nhập mã mời chuyến đi.',
      });
      return;
    }
    setJoiningTrip(true);
    try {
      const joinedTrip = await tripService.joinTrip(code);
      setShowInviteModal(false);
      setInputInviteCode('');
      fetchTrips();
      setHomeAlertModal({
        visible: true,
        type: 'success',
        title: 'Thành công',
        message: `Bạn đã tham gia chuyến đi "${joinedTrip.name}"!`,
        primaryBtnText: 'Xem chi tiết',
        onPrimaryPress: () => navigation.navigate('TripDetails', { tripId: joinedTrip.id }),
      });
    } catch (err: any) {
      const errorMsg = String(err?.response?.data?.message || err?.response?.data?.error || '');
      if (err?.response?.status === 409 || errorMsg.includes('already a trip member')) {
        setShowInviteModal(false);
        setInputInviteCode('');
        const existingTrip = (err as any).existingTrip;
        setHomeAlertModal({
          visible: true,
          type: 'notice',
          title: 'Đã tham gia',
          message: 'Bạn đã là thành viên trong chuyến đi này rồi!',
          primaryBtnText: existingTrip ? 'Xem chi tiết' : undefined,
          onPrimaryPress: existingTrip
            ? () => navigation.navigate('TripDetails', { tripId: existingTrip.id })
            : undefined,
        });
      } else {
        setHomeAlertModal({
          visible: true,
          type: 'error',
          title: 'Không thể tham gia',
          message: errorMsg || 'Mã mời không hợp lệ hoặc đã hết hạn.',
        });
      }
    } finally {
      setJoiningTrip(false);
    }
  };

  const qrOpacity = animation.interpolate({
    inputRange: [0, 0.3, 0.5],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const qrTranslateY = animation.interpolate({
    inputRange: [0, 0.3, 0.5],
    outputRange: [20, 20, 0],
    extrapolate: 'clamp',
  });

  const inviteOpacity = animation.interpolate({
    inputRange: [0, 0.25, 0.75],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const inviteTranslateY = animation.interpolate({
    inputRange: [0, 0.25, 0.75],
    outputRange: [20, 20, 0],
    extrapolate: 'clamp',
  });

  const newTripOpacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const newTripTranslateY = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [20, 20, 0],
    extrapolate: 'clamp',
  });

  const fabRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Filter Active and Upcoming Trips from real backend data
  const activeTrip = trips.find(
    (t) =>
      t.status === 'ACTIVE' ||
      (t.status as string) === 'active' ||
      t.status === 'LOCKED' ||
      (t.status as string) === 'locked'
  );

  const upcomingTrips = trips.filter(
    (t) => t.status === 'PLANNING' || (t.status as string) === 'planning'
  );

  // Khi mới vào app hoặc chưa lấy xong dữ liệu chuyến đi từ backend, xoay vòng ngay lập tức cho đến khi lấy được dữ liệu xong
  if (!hasFetched || (tripsLoading && trips.length === 0)) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.primary} />
      </SafeAreaView>
    );
  }

  // If no active trip, highlight the first upcoming trip, or fallback
  const featuredTrip = activeTrip || upcomingTrips[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            <View style={styles.onlineBadge} />
          </View>
        </View>

        {/* Featured / Active Trip Card */}
        {featuredTrip ? (
          <TouchableOpacity
            style={styles.activeCard}
            activeOpacity={0.9}
            onPress={() => {
              if (activeTrip) {
                navigation.navigate('LiveTracking', { tripId: activeTrip.id });
              } else {
                navigation.navigate('TripDetails', { tripId: featuredTrip.id });
              }
            }}
          >
            <Image
              source={{
                uri:
                  featuredTrip.coverImage ||
                  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800',
              }}
              style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
            />
            {/* Lớp phủ đen để nổi bật nội dung */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)', borderRadius: 16 }]} />

            <View style={styles.activeCardBgWatermarkContainer}>
              <Image
                source={require('../../assets/images/logoapp.png')}
                style={{ width: 150, height: 150, resizeMode: 'contain' }}
                tintColor="#FFFFFF"
              />
            </View>

            <View style={styles.statusRow}>
              <MaterialCommunityIcons
                name={activeTrip ? 'target' : 'clock-outline'}
                size={14}
                color={activeTrip ? '#B7D9CA' : '#FFE0B2'}
              />
              <View
                style={[
                  styles.greenDotStatus,
                  !activeTrip && { backgroundColor: C.warning },
                ]}
              />
              <Text style={[styles.statusText, !activeTrip && { color: '#FFE0B2' }]}>
                {activeTrip ? 'ĐANG THAM GIA' : 'HÀNH TRÌNH TIẾP THEO'}
              </Text>
            </View>

            <Text style={styles.activeCardTitle} numberOfLines={2}>
              {featuredTrip.name}
            </Text>

            <View style={styles.progressRow}>
              <View style={[styles.dot, { backgroundColor: '#FF3B30' }]} />
              <Text style={styles.progressText}>
                Quãng đường: {featuredTrip.distanceKm > 0 ? featuredTrip.distanceKm : 15} km
              </Text>
            </View>

            <View style={styles.progressRow}>
              <View style={[styles.dot, { backgroundColor: C.primary }]} />
              <Text style={styles.progressText}>
                Khởi hành: {formatTripDate(featuredTrip.startAt)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Feather name="users" size={13} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.metaPillText}>
                  {featuredTrip.members?.length ?? featuredTrip.currentMembers ?? 1}/{featuredTrip.maxMembers} thành viên
                </Text>
              </View>

              <View style={[styles.metaPill, { marginLeft: 8 }]}>
                <MaterialCommunityIcons name="motorbike" size={14} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.metaPillText}>{featuredTrip.vehicle || 'Xe máy'}</Text>
              </View>
            </View>

            <View style={styles.continueBtn}>
              <Text style={styles.continueBtnText}>
                {activeTrip ? 'Tiếp tục hành trình ' : 'Xem chi tiết chuyến đi '}
              </Text>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </View>
          </TouchableOpacity>
        ) : (
          /* Empty State Banner */
          <View style={styles.emptyWelcomeCard}>
            <View style={styles.emptyWelcomeIconWrap}>
              <MaterialCommunityIcons name="map-marker-path" size={32} color={C.primary} />
            </View>
            <Text style={styles.emptyWelcomeTitle}>Sẵn sàng cho chuyến đi mới?</Text>
            <Text style={styles.emptyWelcomeSub}>
              Bạn chưa tham gia chuyến đi nào. Tạo chuyến đi mới hoặc quét mã QR cùng bạn bè ngay hôm nay!
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={() => navigation.navigate('CreateTrip')}
            >
              <Feather name="plus" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCreateBtnText}>Tạo chuyến đi mới</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Trips Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CHUYẾN ĐI SẮP TỚI</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AllUpcomingTrips')}>
            <Text style={styles.seeAll}>Xem tất cả ({upcomingTrips.length})</Text>
          </TouchableOpacity>
        </View>

        {tripsLoading && trips.length === 0 ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách chuyến đi...</Text>
          </View>
        ) : upcomingTrips.length === 0 ? (
          <View style={styles.emptyUpcomingBox}>
            <Ionicons name="calendar-outline" size={36} color={C.primary} />
            <Text style={styles.emptyUpcomingTitle}>Chưa có chuyến đi sắp tới</Text>
            <Text style={styles.emptyUpcomingSub}>
              Bấm nút (+) bên dưới để tạo chuyến đi mới hoặc quét mã QR để tham gia cùng nhóm.
            </Text>
          </View>
        ) : (
          upcomingTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.upcomingCard}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
            >
              <Image
                source={{
                  uri:
                    trip.coverImage ||
                    'https://images.unsplash.com/photo-1549880181-56a44cf4a9a5?q=80&w=600',
                }}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
              />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14 }]} />

              <View style={styles.upcomingTopRow}>
                <View style={styles.upcomingInfoLeft}>
                  <Text style={styles.upcomingTitle} numberOfLines={1}>
                    {trip.name}
                  </Text>
                  <View style={styles.dateRow}>
                    <Feather name="calendar" size={14} color="#EAEAEA" />
                    <Text style={styles.dateText}>{formatTripDate(trip.startAt)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.upcomingBottomRow}>
                <View style={styles.bottomMetaRow}>
                  <Feather name="users" size={14} color="#EAEAEA" style={{ marginRight: 4 }} />
                  <Text style={styles.bottomMetaText}>
                    {trip.members?.length ?? trip.currentMembers ?? 1}/{trip.maxMembers}
                  </Text>
                  <Text style={styles.bottomMetaDivider}>•</Text>
                  <MaterialCommunityIcons name="motorbike" size={14} color="#EAEAEA" style={{ marginRight: 4 }} />
                  <Text style={styles.bottomMetaText}>{trip.vehicle || 'Xe máy'}</Text>
                </View>

                <View style={styles.distanceRow}>
                  <MaterialCommunityIcons name="map-marker-path" size={16} color="#EAEAEA" />
                  <Text style={styles.distanceText}>{trip.distanceKm > 0 ? trip.distanceKm : 15} km</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB Overlay Background */}
      <Animated.View
        style={[styles.modalOverlay, { opacity: overlayOpacity }]}
        pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
      >
        <TouchableWithoutFeedback onPress={() => setIsFabMenuVisible(false)}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* FAB and Items Container */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        {/* Item 3: Quét mã QR (Top) */}
        <Animated.View
          style={[styles.fabMenuItemContainer, { opacity: newTripOpacity, transform: [{ translateY: newTripTranslateY }] }]}
          pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setIsFabMenuVisible(false);
              navigation.navigate('ScanQR');
            }}
          >
            <Text style={styles.fabMenuItemText}>Quét mã QR</Text>
            <View style={styles.fabMenuIcon}>
              <MaterialCommunityIcons name="qrcode-scan" size={20} color={C.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Item 2: Nhập mã mời (Middle) */}
        <Animated.View
          style={[styles.fabMenuItemContainer, { opacity: inviteOpacity, transform: [{ translateY: inviteTranslateY }] }]}
          pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setIsFabMenuVisible(false);
              setShowInviteModal(true);
            }}
          >
            <Text style={styles.fabMenuItemText}>Nhập mã mời</Text>
            <View style={styles.fabMenuIcon}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color={C.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Item 1: Tạo chuyến đi mới (Bottom) */}
        <Animated.View
          style={[styles.fabMenuItemContainer, { opacity: qrOpacity, transform: [{ translateY: qrTranslateY }] }]}
          pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setIsFabMenuVisible(false);
              navigation.navigate('CreateTrip');
            }}
          >
            <Text style={styles.fabMenuItemText}>Tạo chuyến đi mới</Text>
            <View style={styles.fabMenuIcon}>
              <Feather name="plus" size={20} color={C.primary} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setIsFabMenuVisible(!isFabMenuVisible)}
        >
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Feather name="plus" size={28} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Modal Nhập Mã Mời */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.inviteModalOverlay}>
          <View style={styles.inviteModalBox}>
            <TouchableOpacity
              style={styles.inviteModalCloseBtn}
              onPress={() => setShowInviteModal(false)}
            >
              <Ionicons name="close" size={22} color={C.sub} />
            </TouchableOpacity>

            <View style={styles.inviteModalIconWrap}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={32} color={C.primary} />
            </View>

            <Text style={styles.inviteModalTitle}>Nhập Mã Chuyến Đi</Text>
            <Text style={styles.inviteModalSub}>
              Nhập mã mời hoặc token bạn nhận được từ bạn bè để tham gia chuyến đi.
            </Text>

            <TextInput
              style={styles.inviteModalInput}
              placeholder="Ví dụ: R2D-7F3K9"
              placeholderTextColor="#A0938C"
              value={inputInviteCode}
              onChangeText={setInputInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={[styles.inviteModalSubmitBtn, joiningTrip && { opacity: 0.7 }]}
              onPress={handleJoinWithCode}
              disabled={joiningTrip}
            >
              {joiningTrip ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.inviteModalSubmitText}>Tham gia ngay</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Custom Styled Alert Modal (ScanQR Style) ── */}
      <Modal
        visible={homeAlertModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setHomeAlertModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.alertModalBackdrop}>
          <View style={styles.alertModalBox}>
            <View
              style={[
                styles.alertModalIconCircle,
                homeAlertModal.type === 'error' && { backgroundColor: '#FFEBEE' },
                homeAlertModal.type === 'success' && { backgroundColor: '#E8F5E9' },
              ]}
            >
              <Ionicons
                name={
                  homeAlertModal.type === 'error'
                    ? 'alert-circle'
                    : homeAlertModal.type === 'success'
                    ? 'checkmark-circle'
                    : 'information-circle'
                }
                size={46}
                color={
                  homeAlertModal.type === 'error'
                    ? '#D32F2F'
                    : homeAlertModal.type === 'success'
                    ? C.success
                    : C.primary
                }
              />
            </View>

            <Text style={styles.alertModalTitle}>{homeAlertModal.title}</Text>
            <Text style={styles.alertModalMessage}>{homeAlertModal.message}</Text>

            <View style={styles.alertModalButtonColumn}>
              {homeAlertModal.primaryBtnText && homeAlertModal.onPrimaryPress && (
                <TouchableOpacity
                  style={styles.alertModalPrimaryBtn}
                  onPress={() => {
                    const fn = homeAlertModal.onPrimaryPress;
                    setHomeAlertModal((prev) => ({ ...prev, visible: false }));
                    if (fn) fn();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.alertModalPrimaryBtnText}>{homeAlertModal.primaryBtnText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={homeAlertModal.primaryBtnText ? styles.alertModalSecondaryBtn : styles.alertModalPrimaryBtn}
                onPress={() => setHomeAlertModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    homeAlertModal.primaryBtnText
                      ? styles.alertModalSecondaryBtnText
                      : styles.alertModalPrimaryBtnText
                  }
                >
                  {homeAlertModal.primaryBtnText ? 'Đóng' : 'Đã hiểu'}
                </Text>
              </TouchableOpacity>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#7E7069',
    marginBottom: 4,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: C.heading,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.bg,
  },

  // Active / Featured Card
  activeCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  activeCardBgWatermarkContainer: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    opacity: 0.1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  greenDotStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
    marginHorizontal: 6,
  },
  statusText: {
    color: '#B7D9CA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activeCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  progressText: {
    color: '#F4EBE3',
    fontSize: 13,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 18,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  metaPillText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '600',
  },
  continueBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Empty Welcome Card
  emptyWelcomeCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  emptyWelcomeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyWelcomeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 6,
  },
  emptyWelcomeSub: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  // Upcoming Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.heading,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primaryDark,
    marginBottom: 2,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: C.sub,
    marginTop: 10,
  },
  emptyUpcomingBox: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  emptyUpcomingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.heading,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyUpcomingSub: {
    fontSize: 12,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  upcomingCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  upcomingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  upcomingInfoLeft: {
    flex: 1,
    marginRight: 10,
  },
  upcomingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#EAEAEA',
  },
  planStatusBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planStatusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  upcomingBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomMetaText: {
    fontSize: 12,
    color: '#EAEAEA',
    fontWeight: '500',
  },
  bottomMetaDivider: {
    color: '#EAEAEA',
    marginHorizontal: 6,
    fontSize: 12,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EAEAEA',
  },

  // FAB Menu
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 11,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    marginTop: 12,
  },
  fabMenuItemContainer: {
    marginBottom: 16,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  fabMenuItemText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  fabMenuIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Invite Modal
  inviteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  inviteModalBox: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: C.border,
  },
  inviteModalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inviteModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  inviteModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 6,
  },
  inviteModalSub: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  inviteModalInput: {
    width: '100%',
    backgroundColor: '#FAF5EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    color: C.heading,
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1,
  },
  inviteModalSubmitBtn: {
    width: '100%',
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inviteModalSubmitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },

  // ── Custom Styled Alert Modal (ScanQR Style) ──
  alertModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  alertModalBox: {
    backgroundColor: C.card,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  alertModalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  alertModalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.heading,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertModalMessage: {
    fontSize: 15,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  alertModalButtonColumn: {
    width: '100%',
    gap: 10,
  },
  alertModalPrimaryBtn: {
    backgroundColor: C.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  alertModalPrimaryBtnText: {
    color: '#FFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  alertModalSecondaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5ECE3',
  },
  alertModalSecondaryBtnText: {
    color: C.heading,
    fontSize: 14.5,
    fontWeight: '700',
  },
});

export default HomeScreen;
