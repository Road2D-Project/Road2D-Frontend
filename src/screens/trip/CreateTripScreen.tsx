/**
 * CreateTripScreen.tsx
 *
 * Flow tạo trip (mock data — chờ backend):
 *
 * [step 1] Chọn route (tên + ảnh minh hoạ)
 * [step 2] Thiết lập chuyến (thời gian, phương tiện, ghi chú, public/private)
 * [step 3] Chọn bạn bè từ danh sách friend mock
 * [step 4] Xác nhận → hiện invite link + QR code mock
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, CreateTripScreenNavigationProp } from '../../types/navigation';
import { useTripStore } from '../../store/useTripStore';
import QRCode from 'react-native-qrcode-svg';
import friendService, { FriendItem } from '../../services/api/friendService';
import planningService, { RoutePreviewSummary } from '../../services/api/planningService';

// ─── Brand colors ─────────────────────────────────────────────────────────────
const C = {
  primary: '#CD8554',
  primaryDark: '#A85A32',
  heading: '#5D3A29',
  text: '#3E2723',
  sub: '#6D4C41',
  bg: '#FDFBF7',
  card: '#FFFFFF',
  border: '#E0D5CC',
  success: '#4CAF50',
};

import Svg, { Path, Circle } from 'react-native-svg';

const VEHICLES = ['Xe máy'] as const;

// Huy chương gói: Dây đeo màu nâu app (#CD8554) của nút '+', đĩa bên dưới phân biệt màu Bronze/Silver/Gold
const MedalBadge = ({ tier }: { tier: 'bronze' | 'silver' | 'gold' }) => {
  const ribbonColor = '#CD8554'; // Màu nâu app chuẩn
  const medalColor = tier === 'gold' ? '#FFD700' : tier === 'silver' ? '#D1D5DB' : '#CD7F32';
  const strokeColor = tier === 'gold' ? '#D97706' : tier === 'silver' ? '#9CA3AF' : '#92400E';

  return (
    <View style={{ width: 34, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
      <Svg width="30" height="36" viewBox="0 0 30 36" fill="none">
        {/* Dây đeo huy chương màu nâu app (#CD8554) */}
        <Path d="M6 2 L15 16 L11 16 L3 2 Z" fill={ribbonColor} />
        <Path d="M24 2 L15 16 L19 16 L27 2 Z" fill={ribbonColor} />
        <Path d="M11 13 L15 19 L19 13 Z" fill="#A85A32" />

        {/* Đĩa huy chương bên dưới phân biệt màu sắc */}
        <Circle cx="15" cy="24" r="10" fill={medalColor} stroke={strokeColor} strokeWidth="1.5" />
        <Circle cx="15" cy="24" r="7.5" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
        <Path
          d="M15 19.8 L16.3 22.8 L19.5 23.2 L17.2 25.4 L17.8 28.5 L15 27 L12.2 28.5 L12.8 25.4 L10.5 23.2 L13.7 22.8 Z"
          fill="#FFFFFF"
        />
      </Svg>
    </View>
  );
};

// Trip type — backend dùng để tính member limit
const TRIP_TYPES = [
  { key: 'bronze', label: 'Bronze', desc: 'Tối đa 15 người' },
  { key: 'silver', label: 'Silver', desc: 'Tối đa 30 người' },
  { key: 'gold', label: 'Gold', desc: 'Tối đa 50 người' },
] as const;
type TripTypeKey = typeof TRIP_TYPES[number]['key'];

// ─── Sub-components ────────────────────────────────────────────────────────────

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <View style={stepStyles.container}>
    {Array.from({ length: total }).map((_, i) => (
      <React.Fragment key={i}>
        <View style={[stepStyles.dot, i <= current && stepStyles.dotActive]}>
          {i < current ? (
            <Ionicons name="checkmark" size={10} color="#FFF" />
          ) : (
            <Text style={[stepStyles.dotText, i === current && stepStyles.dotTextActive]}>
              {i + 1}
            </Text>
          )}
        </View>
        {i < total - 1 && (
          <View style={[stepStyles.line, i < current && stepStyles.lineActive]} />
        )}
      </React.Fragment>
    ))}
  </View>
);

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8DDD5',
    justifyContent: 'center', alignItems: 'center',
  },
  dotActive: { backgroundColor: C.primary },
  dotText: { fontSize: 12, fontWeight: '700', color: C.sub },
  dotTextActive: { color: '#FFF' },
  line: { flex: 1, height: 2, backgroundColor: '#E8DDD5', marginHorizontal: 4 },
  lineActive: { backgroundColor: C.primary },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

const CreateTripScreen = () => {
  const navigation = useNavigation<CreateTripScreenNavigationProp>();
  const route = useRoute<any>();

  // Navigation state
  const [step, setStep] = useState(0); // 0-3

  // Step 0 state: selected route (hoặc customRoute từ bản đồ)
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);

  // Trips từ Supabase DB thông qua useTripStore
  const trips = useTripStore((s: any) => s.trips);
  const fetchTrips = useTripStore((s: any) => s.fetchTrips);
  const tripsLoading = useTripStore((s: any) => s.loading);
  const [showAllTripsModal, setShowAllTripsModal] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, []);

  // Lắng nghe lộ trình vừa tạo từ CreateRouteScreen
  useEffect(() => {
    if (route.params?.customRoute) {
      const cr = route.params.customRoute;
      setSelectedRoute({ ...cr, isCustomRoute: true, isPastTrip: false });
      if (!tripName) {
        setTripName(cr.name);
      }
      setStep(0); // Luôn ở Bước 1 (Step 0) để hiển thị toàn bộ tóm tắt lộ trình vừa tạo
    }
  }, [route.params?.customRoute]);

  // Step 1 state
  const [tripName, setTripName] = useState('');
  const [vehicle, setVehicle] = useState<typeof VEHICLES[number]>('Xe máy');
  const [startDate, setStartDate] = useState('05:00 — 24/12/2026');
  const [note, setNote] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isRequireApproval, setIsRequireApproval] = useState(false);
  const [maxMembers, setMaxMembers] = useState('15');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tripType, setTripType] = useState<TripTypeKey>('bronze');

  // Step 2 state (Mời bạn bè)
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchFriend, setSearchFriend] = useState('');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);

  // Step 3 result (Hoàn tất + QR Code)
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const currentTripId = useTripStore((s: any) => s.currentTripId);
  const createTrip = useTripStore((s: any) => s.createTrip);

  // Preview route via planning API (v1/planning/review / preview)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<RoutePreviewSummary | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handlePreviewTripRoute = async (customRoute: any) => {
    const origin = customRoute.origin || customRoute.waypoints?.[0];
    const destination = customRoute.destination || customRoute.waypoints?.[customRoute.waypoints?.length - 1];
    const waypoints = [
      ...(origin ? [origin] : []),
      ...(customRoute.stops || []),
      ...(destination ? [destination] : []),
    ];

    if (waypoints.length < 2) {
      Alert.alert('Chưa đủ điểm', 'Lộ trình cần ít nhất 2 điểm để xem trước đường đi.');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const summary = await planningService.previewRouteFromWaypoints(waypoints);
      setPreviewSummary(summary);
      setShowPreviewModal(true);
    } catch {
      // Fallback hiển thị dữ liệu sẵn có từ customRoute
      setPreviewSummary({
        locations: waypoints.map((w, idx) => ({
          locationId: String(idx),
          name: w.name,
          lat: w.lat,
          lng: w.lng,
        })),
        legs: customRoute.legs || [],
        totalDistanceM: customRoute.distanceM || 0,
        totalDurationS: customRoute.totalDurationS || customRoute.travelDurationS || 0,
        distanceFormatted: customRoute.distance || '0 km',
        durationFormatted: customRoute.duration || '0 phút',
        polylineCoords: customRoute.polylineCoords || [],
        raw: {} as any,
      });
      setShowPreviewModal(true);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    setFriendError(null);
    try {
      const res = await friendService.getFriends();
      setFriends(res.friends || []);
    } catch {
      setFriendError('Không thể tải danh sách bạn bè.');
    } finally {
      setLoadingFriends(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  // ── Navigation helpers ──
  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goBack = () => {
    if (step === 0) navigation.goBack();
    else setStep((s) => s - 1);
  };

  // Custom alert modal theo phong cách ScanQR
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    type: 'notice' | 'error';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'notice',
    title: '',
    message: '',
  });

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!selectedRoute) return;
    if (selectedFriends.length === 0) {
      setAlertModal({
        visible: true,
        type: 'notice',
        title: 'Chưa chọn bạn bè',
        message:
          'Theo quy định hệ thống, chuyến đi cần có ít nhất 1 bạn bè cùng tham gia. Vui lòng chọn ít nhất 1 bạn từ danh sách.',
      });
      return;
    }
    setIsCreating(true);
    try {
      const realDist = selectedRoute.distanceM
        ? Math.round((selectedRoute.distanceM / 1000) * 10) / 10
        : (parseFloat(selectedRoute.distance) || selectedRoute.distanceKm || 0);

      const payload = {
        name: tripName || selectedRoute.name,
        routeId: selectedRoute.id,
        routeName: selectedRoute.name,
        distanceKm: realDist,
        startAt: new Date().toISOString(),
        vehicle: vehicle as any,
        tripType,
        maxMembers: parseInt(maxMembers) || 15,
        isPublic,
        note,
        invitedUserIds: selectedFriends,
        coverImage: selectedRoute.image,
      };
      const trip = await createTrip(payload);
      // Mã mời / invite token đã được tripService xử lý chuẩn với backend
      const inviteCode = (trip as any)?.inviteCode || 'R2D-' + Math.random().toString(36).slice(2, 7).toUpperCase();
      setCreatedInviteCode(inviteCode);
      setStep(3);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Không thể tạo chuyến đi.';
      setAlertModal({
        visible: true,
        type: 'error',
        title: 'Lỗi tạo chuyến đi',
        message: msg,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // ── STEP LABELS ──
  const STEP_LABELS = ['Chọn lộ trình', 'Thiết lập', 'Mời bạn bè', 'Hoàn tất'];

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 0 — Chọn route
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStep0 = () => {
    // ── Trường hợp 1: Đã có lộ trình vừa tạo từ bản đồ (customRoute) ──
    const isCustomRouteFromMap =
      selectedRoute &&
      !selectedRoute.isPastTrip &&
      (selectedRoute.isCustomRoute === true || (Array.isArray(selectedRoute.waypoints) && selectedRoute.waypoints.length > 0));

    if (isCustomRouteFromMap) {
      const cr = selectedRoute as any;
      return (
        <View style={styles.customRouteContainer}>
          <View style={styles.customRouteBadge}>
            <Ionicons name="sparkles" size={13} color="#FFF" />
            <Text style={styles.customRouteBadgeText}>LỘ TRÌNH VỪA TẠO TỪ BẢN ĐỒ</Text>
          </View>
          <Text style={styles.stepHeading}>{cr.name}</Text>
          <Text style={styles.stepSub}>Chi tiết cung đường bạn vừa thiết lập</Text>

          {/* Metric Strip (như bước 3 cũ trên bản đồ) */}
          <View style={styles.metricStrip}>
            <View style={styles.metricItem}>
              <Ionicons name="bicycle" size={18} color={C.primary} />
              <Text style={styles.metricVal}>{cr.distance}</Text>
              <Text style={styles.metricLbl}>Quãng đường</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={18} color={C.primary} />
              <Text style={styles.metricVal}>{cr.duration}</Text>
              <Text style={styles.metricLbl}>Tổng thời gian</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Ionicons name="location-outline" size={18} color={C.primary} />
              <Text style={styles.metricVal}>{cr.stopsCount || cr.stops?.length || 0}</Text>
              <Text style={styles.metricLbl}>Trạm dừng</Text>
            </View>
          </View>

          {/* Chi tiết cộng thời gian nghỉ */}
          {cr.restDurationMinutes > 0 && (
            <View style={styles.timeNoteCard}>
              <Ionicons name="information-circle-outline" size={16} color={C.primary} />
              <Text style={styles.timeNoteText}>
                Đã cộng {cr.restDurationMinutes} phút dừng nghỉ tại các trạm vào tổng thời gian chuyến đi (thời gian chạy xe: {cr.travelDurationFormatted || cr.duration}).
              </Text>
            </View>
          )}

          {/* Danh sách các chặng dọc đường (timeline) */}
          <Text style={styles.timelineSectionTitle}>CÁC CHẶNG DỪNG CHÂN</Text>
          <View style={styles.timelineCard}>
            {/* Điểm xuất phát */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: C.success }]} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineRole, { color: C.success }]}>ĐIỂM XUẤT PHÁT</Text>
                <Text style={styles.timelineName}>{cr.origin?.name || cr.waypoints?.[0]?.name}</Text>
                <Text style={styles.timelineAddr}>{cr.origin?.address || cr.waypoints?.[0]?.address}</Text>
              </View>
            </View>

            {/* Các điểm dừng */}
            {Array.isArray(cr.stops) && cr.stops.map((s: any, idx: number) => (
              <View key={s.place_id || idx} style={styles.timelineRow}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: C.primary }]} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.stopHeaderRow}>
                    <Text style={[styles.timelineRole, { color: C.primary }]}>TRẠM {idx + 1}</Text>
                    <View style={styles.restTimeBadge}>
                      <Ionicons name="time-outline" size={11} color={C.primaryDark} />
                      <Text style={styles.restTimeText}>Nghỉ {s.stayMinutes || 15} phút</Text>
                    </View>
                  </View>
                  <Text style={styles.timelineName}>{s.name}</Text>
                  <Text style={styles.timelineAddr}>{s.address}</Text>
                </View>
              </View>
            ))}

            {/* Điểm đến */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: '#FF5252' }]} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineRole, { color: '#FF5252' }]}>ĐIỂM ĐẾN</Text>
                <Text style={styles.timelineName}>
                  {cr.destination?.name || cr.waypoints?.[cr.waypoints.length - 1]?.name}
                </Text>
                <Text style={styles.timelineAddr}>
                  {cr.destination?.address || cr.waypoints?.[cr.waypoints.length - 1]?.address}
                </Text>
              </View>
            </View>
          </View>

          {/* Nút Xem trước đường đi (gọi API v1/planning/review) */}
          <TouchableOpacity
            style={styles.previewTripRouteBtn}
            onPress={() => handlePreviewTripRoute(cr)}
            disabled={isPreviewLoading}
            activeOpacity={0.8}
          >
            {isPreviewLoading ? (
              <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="map-outline" size={17} color="#FFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.previewTripRouteBtnText}>
              {isPreviewLoading ? 'Đang tính đường đi...' : 'Xem trước đường đi'}
            </Text>
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.routeActionRow}>
            <TouchableOpacity
              style={styles.editRouteBtn}
              onPress={() => navigation.navigate('CreateRoute')}
            >
              <Feather name="edit-2" size={15} color={C.primary} />
              <Text style={styles.editRouteBtnText}>Sửa trên bản đồ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changeRouteBtn}
              onPress={() => setSelectedRoute(null)}
            >
              <Ionicons name="swap-horizontal" size={16} color={C.sub} />
              <Text style={styles.changeRouteBtnText}>Đổi lộ trình khác</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ── Trường hợp 2: Danh sách lộ trình đã đi từ DB ──
    const recentTrips = trips.slice(0, 3);

    return (
      <>
        <Text style={styles.stepHeading}>Chọn lộ trình</Text>
        <Text style={styles.stepSub}>Chọn cung đường đã đi hoặc tạo mới từ bản đồ</Text>

        {tripsLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Đang tải lộ trình từ hệ thống...</Text>
          </View>
        ) : trips.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="map-outline" size={36} color={C.primary} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có lộ trình nào đã đi</Text>
            <Text style={styles.emptySub}>
              Bạn chưa có chuyến đi nào được lưu lại. Hãy bấm nút dưới đây để tạo lộ trình mới trên bản đồ!
            </Text>
          </View>
        ) : (
          <>
            {recentTrips.map((t: any) => {
              const isSelected = selectedRoute?.id === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.routeCard, isSelected && styles.routeCardActive]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const stopsCnt = Array.isArray(t.stops)
                      ? t.stops.length
                      : (typeof t.stops === 'number' ? t.stops : 0);
                    setSelectedRoute({
                      id: t.id,
                      name: t.name || t.routeName,
                      distance: `${t.distanceKm || 0} km`,
                      distanceKm: t.distanceKm || 0,
                      duration: t.duration || `${Math.max(15, Math.round(((t.distanceKm || 10) / 35) * 60))} phút`,
                      stops: Array.isArray(t.stops) ? t.stops : [],
                      stopsCount: stopsCnt,
                      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600',
                      isPastTrip: true,
                    });
                    if (!tripName) {
                      setTripName(t.name || t.routeName);
                    }
                  }}
                >
                  <Image
                    source={{
                      uri: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600',
                    }}
                    style={styles.routeCardImage}
                  />
                  <View style={styles.routeCardOverlay} />
                  {isSelected && (
                    <View style={styles.routeSelectedBadge}>
                      <Ionicons name="checkmark-circle" size={22} color={C.primary} />
                    </View>
                  )}
                  <View style={styles.routeCardContent}>
                    <Text style={styles.routeCardName}>{t.name || t.routeName}</Text>
                    <View style={styles.routeCardMeta}>
                      <View style={styles.routeMetaItem}>
                        <MaterialCommunityIcons name="map-marker-path" size={13} color="#EAEAEA" />
                        <Text style={styles.routeMetaText}>{t.distanceKm || 0} km</Text>
                      </View>
                      <View style={styles.routeMetaItem}>
                        <Ionicons name="calendar-outline" size={13} color="#EAEAEA" />
                        <Text style={styles.routeMetaText}>
                          {new Date(t.startAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {trips.length > 3 && (
              <TouchableOpacity
                style={styles.seeMoreBtn}
                onPress={() => setShowAllTripsModal(true)}
              >
                <Text style={styles.seeMoreBtnText}>
                  Xem thêm ({trips.length - 3} lộ trình khác)
                </Text>
                <Ionicons name="chevron-forward" size={15} color={C.primary} />
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity
          style={styles.createRouteBtn}
          onPress={() => navigation.navigate('CreateRoute')}
        >
          <Feather name="plus" size={18} color={C.primary} />
          <Text style={styles.createRouteBtnText}>Tạo lộ trình mới trên bản đồ</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Thiết lập chuyến đi
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStep1 = () => {
    const stopsCount =
      selectedRoute?.stopsCount ??
      (Array.isArray(selectedRoute?.stops)
        ? selectedRoute.stops.length
        : typeof selectedRoute?.stops === 'number'
          ? selectedRoute.stops
          : 0);

    const durationText =
      selectedRoute?.duration ||
      selectedRoute?.travelDurationFormatted ||
      (selectedRoute?.distanceKm
        ? `${Math.max(15, Math.round((selectedRoute.distanceKm / 35) * 60))} phút`
        : '30 phút');

    return (
      <>
        <Text style={styles.stepHeading}>Thiết lập chuyến đi</Text>

        {selectedRoute && (
          <View style={styles.routeSummaryBox}>
            <View style={styles.routeSummaryHeader}>
              <View style={styles.routeSummaryHeaderLeft}>
                <View style={styles.routeSummaryIconCircle}>
                  <MaterialCommunityIcons name="map-marker-distance" size={18} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeSummaryBadge}>LỘ TRÌNH ĐÃ CHỌN</Text>
                  <Text style={styles.routeSummaryName} numberOfLines={2}>
                    {selectedRoute.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.changeRouteMiniBtn}
                onPress={() => setStep(0)}
              >
                <Ionicons name="swap-horizontal" size={13} color={C.primary} />
                <Text style={styles.changeRouteMiniBtnText}>Đổi</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.routeSummaryDivider} />

            <View style={styles.routeSummaryStatsRow}>
              {/* Quãng đường */}
              <View style={styles.routeSummaryStatItem}>
                <Ionicons name="speedometer-outline" size={16} color={C.primary} />
                <Text style={styles.routeSummaryStatVal}>
                  {selectedRoute.distance || `${selectedRoute.distanceKm || 0} km`}
                </Text>
                <Text style={styles.routeSummaryStatLbl}>Quãng đường</Text>
              </View>

              <View style={styles.routeSummaryStatDivider} />

              {/* Thời gian */}
              <View style={styles.routeSummaryStatItem}>
                <Ionicons name="time-outline" size={16} color={C.primary} />
                <Text style={styles.routeSummaryStatVal}>{durationText}</Text>
                <Text style={styles.routeSummaryStatLbl}>
                  {selectedRoute?.restDurationMinutes > 0
                    ? `Gồm ${selectedRoute.restDurationMinutes}p nghỉ`
                    : 'Tổng thời gian'}
                </Text>
              </View>

              <View style={styles.routeSummaryStatDivider} />

              {/* Số trạm dừng */}
              <View style={styles.routeSummaryStatItem}>
                <Ionicons name="flag-outline" size={16} color={C.primary} />
                <Text style={styles.routeSummaryStatVal}>{stopsCount} trạm</Text>
                <Text style={styles.routeSummaryStatLbl}>Điểm dừng</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tên chuyến đi */}
        <Text style={styles.fieldLabel}>Tên chuyến đi</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Ví dụ: Hà Giang Loop tháng 12"
          placeholderTextColor={C.border}
          value={tripName}
          onChangeText={setTripName}
        />

        {/* Phương tiện */}
        <Text style={styles.fieldLabel}>Phương tiện</Text>
        <View style={styles.vehicleRow}>
          {VEHICLES.map((v) => (
            <TouchableOpacity
              key={v}
              style={[styles.vehicleBtn, vehicle === v && styles.vehicleBtnActive]}
              onPress={() => setVehicle(v)}
            >
              <Text style={[styles.vehicleBtnText, vehicle === v && styles.vehicleBtnTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Thời gian */}
        <Text style={styles.fieldLabel}>Thời gian xuất phát</Text>
        <TouchableOpacity
          style={styles.inputBox}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.inputBoxText}>{startDate}</Text>
          <Ionicons name="calendar-outline" size={18} color={C.sub} />
        </TouchableOpacity>

        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <Text style={{ fontSize: 19.5, fontWeight: 'bold', marginBottom: 16, color: C.heading }}>Chọn thời gian xuất phát</Text>
              {['05:00 — 24/12/2026', '06:00 — 25/12/2026', '07:30 — 01/01/2027', '08:00 — 15/01/2027'].map(d => (
                <TouchableOpacity key={d} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }} onPress={() => { setStartDate(d); setShowDatePicker(false); }}>
                  <Text style={{ fontSize: 17.5, color: startDate === d ? C.primary : C.text, fontWeight: startDate === d ? 'bold' : 'normal' }}>{d}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={{ marginTop: 20, padding: 16, backgroundColor: C.primary, borderRadius: 14, alignItems: 'center' }} onPress={() => setShowDatePicker(false)}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 17.5 }}>Xong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Loại trip (tripType — backend dùng để xác định giới hạn thành viên) */}
        <Text style={styles.fieldLabel}>Loại chuyến đi</Text>
        <View style={styles.tripTypeRow}>
          {TRIP_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tripTypeBtn, tripType === t.key && styles.tripTypeBtnActive]}
              onPress={() => setTripType(t.key)}
            >
              <MedalBadge tier={t.key} />
              <Text style={[styles.tripTypeLabel, tripType === t.key && styles.tripTypeLabelActive]}>
                {t.label}
              </Text>
              <Text style={[styles.tripTypeDesc, tripType === t.key && { color: '#FFF' }]}>
                {t.desc}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ghi chú */}
        <Text style={styles.fieldLabel}>Giới thiệu</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Nhớ mang áo mưa. Góp quỹ 500k/người..."
          placeholderTextColor={C.border}
          multiline
          value={note}
          onChangeText={setNote}
        />

        {/* Public / Private */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.switchLabel}>Hiển thị công khai</Text>
            <Text style={styles.switchDesc}>Những người có thể thấy được nhóm của bạn ở trên cộng đồng</Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: C.border, true: C.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Yêu cầu phê duyệt */}
        <View style={[styles.switchRow, { marginTop: 16 }]}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={styles.switchLabel}>Yêu cầu phê duyệt</Text>
            <Text style={styles.switchDesc}>Thành viên mới tham gia vào nhóm phải thông qua sự phê duyệt của trưởng nhóm</Text>
          </View>
          <Switch
            value={isRequireApproval}
            onValueChange={setIsRequireApproval}
            trackColor={{ false: C.border, true: C.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </>
    );
  };

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2 — Mời bạn bè
    // ═══════════════════════════════════════════════════════════════════════════
    const renderStep2 = () => {
      const filteredFriends = friends.filter((f) =>
        f.username.toLowerCase().includes(searchFriend.toLowerCase())
      );

      return (
        <>
          <Text style={styles.stepHeading}>Mời bạn bè</Text>
          <Text style={styles.stepSub}>
            Chọn bạn từ danh sách bạn bè để cùng tham gia chuyến đi.
            {'\n'}Hệ thống yêu cầu chuyến đi cần có ít nhất 1 bạn bè tham gia.
          </Text>

          {/* Thanh tìm kiếm */}
          <View style={[styles.inputBox, { marginBottom: 16 }]}>
            <Ionicons name="search-outline" size={20} color={C.sub} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.textInput, { marginBottom: 0, flex: 1, borderWidth: 0, padding: 0 }]}
              placeholder="Tìm kiếm bạn bè theo tên..."
              placeholderTextColor={C.border}
              value={searchFriend}
              onChangeText={setSearchFriend}
            />
            {searchFriend.length > 0 && (
              <TouchableOpacity onPress={() => setSearchFriend('')}>
                <Ionicons name="close-circle" size={18} color={C.sub} />
              </TouchableOpacity>
            )}
          </View>

          {/* Selected chips row */}
          {selectedFriends.length > 0 && (
            <View style={styles.selectedChipsRow}>
              {selectedFriends.map((id) => {
                const f = friends.find((fr) => fr.userId === id);
                if (!f) return null;
                const avatarUri = f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.username)}&background=CD8554&color=fff`;
                return (
                  <TouchableOpacity
                    key={id}
                    style={styles.selectedChip}
                    onPress={() => toggleFriend(id)}
                  >
                    <Image source={{ uri: avatarUri }} style={styles.chipAvatar} />
                    <Text style={styles.chipName}>@{f.username}</Text>
                    <Ionicons name="close" size={12} color={C.sub} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Danh sách bạn bè */}
          {loadingFriends ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={styles.loadingText}>Đang tải danh sách bạn bè...</Text>
            </View>
          ) : friendError ? (
            <View style={styles.emptyBox}>
              <Ionicons name="alert-circle-outline" size={36} color={C.primary} />
              <Text style={styles.emptyTitle}>Lỗi tải bạn bè</Text>
              <Text style={styles.emptySub}>{friendError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadFriends}>
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="people-outline" size={36} color={C.primary} />
              </View>
              <Text style={styles.emptyTitle}>Chưa có bạn bè nào</Text>
              <Text style={styles.emptySub}>
                Bạn chưa kết bạn với ai trong hệ thống. Hãy kết bạn trước để có thể tạo chuyến đi nhóm nhé!
              </Text>
            </View>
          ) : filteredFriends.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
              <Text style={styles.emptySub}>Không có bạn bè nào khớp với từ khóa "{searchFriend}".</Text>
            </View>
          ) : (
            filteredFriends.map((friend) => {
              const selected = selectedFriends.includes(friend.userId);
              const avatarUri = friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.username)}&background=CD8554&color=fff`;
              return (
                <TouchableOpacity
                  key={friend.userId}
                  style={[styles.friendRow, selected && styles.friendRowSelected]}
                  activeOpacity={0.75}
                  onPress={() => toggleFriend(friend.userId)}
                >
                  <Image source={{ uri: avatarUri }} style={styles.friendAvatar} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>@{friend.username}</Text>
                    <Text style={styles.friendUsername}>Bạn bè</Text>
                  </View>
                  <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
                    {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </>
      );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3 — Hoàn tất
    // ═══════════════════════════════════════════════════════════════════════════
    const renderStep3 = () => {
      const invitedFriends = friends.filter((f) => selectedFriends.includes(f.userId));
      const qrPayload = `road2d://join/${createdInviteCode}?tripId=${currentTripId || ''}`;

      return (
        <>
          {/* Success icon */}
          <View style={styles.successIconWrap}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={40} color="#FFF" />
            </View>
            <Text style={styles.successTitle}>Tạo chuyến đi thành công!</Text>
            <Text style={styles.successSub}>
              {selectedRoute?.name ?? 'Chuyến đi'} · {selectedRoute?.distance}
            </Text>
          </View>

          {/* QR Code Preview Card */}
          <View style={styles.qrCard}>
            <Text style={styles.qrCardTitle}>MÃ QR CHUYẾN ĐI</Text>
            <Text style={styles.qrCardSub}>Bạn bè có thể quét mã này từ camera để tham gia ngay</Text>
            <View style={styles.qrWrapper}>
              <QRCode
                value={qrPayload}
                size={160}
                color={C.heading}
                backgroundColor="#FFF"
              />
            </View>
          </View>

          {/* Invite code */}
          <View style={styles.inviteCard}>
            <Text style={styles.inviteCardLabel}>MÃ MỜI</Text>
            <Text style={styles.inviteCode}>{createdInviteCode || 'R2D-7F3K9'}</Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => Alert.alert('Đã sao chép!', `Mã ${createdInviteCode} đã được sao chép.`)}
            >
              <Feather name="copy" size={16} color={C.primary} />
              <Text style={styles.copyBtnText}>Sao chép mã</Text>
            </TouchableOpacity>
          </View>

          {/* Share link & Xem QR Fullsize */}
          <View style={styles.shareRow}>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => Alert.alert('Chia sẻ link', `https://road2d.app/join/${createdInviteCode}`)}
            >
              <Feather name="share-2" size={18} color="#FFF" />
              <Text style={styles.shareBtnText}>Chia sẻ link</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.primary }]}
              onPress={() => setShowQrModal(true)}
            >
              <MaterialCommunityIcons name="qrcode" size={18} color={C.primary} />
              <Text style={[styles.shareBtnText, { color: C.primary }]}>Xem QR lớn</Text>
            </TouchableOpacity>
          </View>

          {/* Invited members */}
          {invitedFriends.length > 0 && (
            <View style={styles.invitedSection}>
              <Text style={styles.invitedTitle}>Đã mời ({invitedFriends.length} người)</Text>
              {invitedFriends.map((f) => {
                const avatarUri = f.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(f.username)}&background=CD8554&color=fff`;
                return (
                  <View key={f.userId} style={styles.invitedRow}>
                    <Image source={{ uri: avatarUri }} style={styles.invitedAvatar} />
                    <Text style={styles.invitedName}>@{f.username}</Text>
                    <View style={styles.invitedStatus}>
                      <Text style={styles.invitedStatusText}>Đang chờ xác nhận</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Xem chi tiết chuyến đi */}
          <TouchableOpacity
            style={[styles.rosterBtn, { backgroundColor: C.primary, borderColor: C.primary, marginBottom: 10 }]}
            onPress={() => {
              if (currentTripId) {
                navigation.navigate('TripDetails', { tripId: currentTripId });
              } else {
                navigation.navigate('Home');
              }
            }}
          >
            <Text style={[styles.rosterBtnText, { color: '#FFF' }]}>Xem chi tiết chuyến đi</Text>
            <Feather name="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>

          {/* Go to team roster */}
          <TouchableOpacity
            style={styles.rosterBtn}
            onPress={() => {
              if (currentTripId) {
                navigation.navigate('TeamRoster', { tripId: currentTripId });
              } else {
                navigation.navigate('Home');
              }
            }}
          >
            <Text style={styles.rosterBtnText}>Xem danh sách thành viên</Text>
            <Feather name="users" size={16} color={C.primary} />
          </TouchableOpacity>

          {/* Return Home */}
          <TouchableOpacity
            style={[styles.rosterBtn, { backgroundColor: 'transparent', borderColor: 'transparent', marginTop: 4 }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.rosterBtnText, { color: C.sub }]}>Về trang chủ</Text>
          </TouchableOpacity>

          {/* Modal xem mã QR lớn */}
          <Modal
            visible={showQrModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowQrModal(false)}
          >
            <View style={styles.qrModalBackdrop}>
              <View style={styles.qrModalBox}>
                <TouchableOpacity
                  style={styles.qrModalCloseBtn}
                  onPress={() => setShowQrModal(false)}
                >
                  <Ionicons name="close" size={24} color={C.sub} />
                </TouchableOpacity>

                <Text style={styles.qrModalTitle}>Mã QR Chuyến Đi</Text>
                <Text style={styles.qrModalTripName}>{tripName || selectedRoute?.name}</Text>

                <View style={styles.qrModalImageWrap}>
                  <QRCode
                    value={qrPayload}
                    size={220}
                    color={C.heading}
                    backgroundColor="#FFF"
                  />
                </View>

                <View style={styles.qrModalCodePill}>
                  <Text style={styles.qrModalCodeText}>{createdInviteCode}</Text>
                </View>

                <TouchableOpacity
                  style={styles.qrModalCopyBtn}
                  onPress={() => {
                    Alert.alert('Đã sao chép!', `Mã mời ${createdInviteCode} đã được sao chép.`);
                  }}
                >
                  <Feather name="copy" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.qrModalCopyBtnText}>Sao chép mã mời</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      );
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // Bottom CTA button text
    // ═══════════════════════════════════════════════════════════════════════════
    const getCtaLabel = () => {
      if (step === 0) return selectedRoute ? 'Tiếp tục' : 'Chọn lộ trình để tiếp tục';
      if (step === 1) return 'Tiếp tục';
      if (step === 2) return `Tạo chuyến đi${selectedFriends.length > 0 ? ` & mời ${selectedFriends.length} bạn` : ''}`;
      return 'Về trang chủ';
    };

    const handleCta = () => {
      if (step === 0 && !selectedRoute) return;
      if (step === 1 && !tripName.trim()) {
        Alert.alert('Thiếu tên', 'Vui lòng nhập tên chuyến đi.');
        return;
      }
      if (step === 2) {
        if (selectedFriends.length === 0) {
          Alert.alert(
            'Chưa chọn bạn bè',
            'Theo quy định hệ thống, chuyến đi cần có ít nhất 1 bạn bè cùng tham gia. Vui lòng chọn ít nhất 1 bạn từ danh sách.'
          );
          return;
        }
        if (!isCreating) handleCreate();
        return;
      }
      if (step === 3) { navigation.navigate('Home'); return; }
      goNext();
    };

    const ctaDisabled = (step === 0 && !selectedRoute) || isCreating;

    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color={C.heading} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{STEP_LABELS[step]}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <StepIndicator current={step} total={4} />
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.ctaBtn, ctaDisabled && styles.ctaBtnDisabled]}
            onPress={handleCta}
            activeOpacity={ctaDisabled ? 1 : 0.85}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                {step === 3
                  ? <Ionicons name="home-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  : step === 2
                    ? <Ionicons name="paper-plane-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    : null
                }
                <Text style={styles.ctaBtnText}>{getCtaLabel()}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Modal xem tất cả lộ trình cũ */}
        <Modal visible={showAllTripsModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Tất cả lộ trình đã đi</Text>
                <TouchableOpacity
                  onPress={() => setShowAllTripsModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={24} color={C.heading} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
                {trips.map((t: any) => {
                  const isSelected = selectedRoute?.id === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.modalTripItem, isSelected && styles.modalTripItemSelected]}
                      onPress={() => {
                        const stopsCnt = Array.isArray(t.stops)
                          ? t.stops.length
                          : (typeof t.stops === 'number' ? t.stops : 0);
                        setSelectedRoute({
                          id: t.id,
                          name: t.name || t.routeName,
                          distance: `${t.distanceKm || 0} km`,
                          distanceKm: t.distanceKm || 0,
                          duration: t.duration || `${Math.max(15, Math.round(((t.distanceKm || 10) / 35) * 60))} phút`,
                          stops: Array.isArray(t.stops) ? t.stops : [],
                          stopsCount: stopsCnt,
                          image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600',
                          isPastTrip: true,
                        });
                        if (!tripName) {
                          setTripName(t.name || t.routeName);
                        }
                        setShowAllTripsModal(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalTripName}>{t.name || t.routeName}</Text>
                        <Text style={styles.modalTripMeta}>
                          {t.distanceKm || 0} km · {new Date(t.startAt).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Custom Styled Alert Modal (ScanQR Style) */}
        <Modal
          visible={alertModal.visible}
          transparent
          animationType="fade"
          onRequestClose={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.customAlertBackdrop}>
            <View style={styles.customAlertBox}>
              <View
                style={[
                  styles.customAlertIconCircle,
                  alertModal.type === 'error' && { backgroundColor: '#FFEBEE' },
                ]}
              >
                <Ionicons
                  name={alertModal.type === 'error' ? 'alert-circle' : 'information-circle'}
                  size={46}
                  color={alertModal.type === 'error' ? '#D32F2F' : C.primary}
                />
              </View>

              <Text style={styles.customAlertTitle}>{alertModal.title}</Text>
              <Text style={styles.customAlertMessage}>{alertModal.message}</Text>

              <TouchableOpacity
                style={[
                  styles.customAlertBtn,
                  alertModal.type === 'error' && { backgroundColor: '#D32F2F' },
                ]}
                onPress={() => setAlertModal((prev) => ({ ...prev, visible: false }))}
                activeOpacity={0.85}
              >
                <Text style={styles.customAlertBtnText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Xem trước đường đi (gọi API v1/planning/review) */}
        <Modal
          visible={showPreviewModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowPreviewModal(false)}
        >
          <View style={styles.previewModalOverlay}>
            <View style={styles.previewModalCard}>
              <View style={styles.previewModalHeader}>
                <View style={styles.previewModalHeaderLeft}>
                  <View style={styles.previewModalIconCircle}>
                    <Ionicons name="map" size={20} color={C.primary} />
                  </View>
                  <View>
                    <Text style={styles.previewModalTitle}>Xem trước đường đi</Text>
                    <Text style={styles.previewModalSub}>
                      Dữ liệu lộ trình tối ưu từ Road2D Backend
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.previewModalCloseBtn}
                  onPress={() => setShowPreviewModal(false)}
                >
                  <Ionicons name="close" size={20} color={C.heading} />
                </TouchableOpacity>
              </View>

              <View style={styles.previewMetricsRow}>
                <View style={styles.previewMetricItem}>
                  <Ionicons name="navigate-circle-outline" size={20} color={C.primary} />
                  <Text style={styles.previewMetricVal}>
                    {previewSummary?.distanceFormatted || '0 km'}
                  </Text>
                  <Text style={styles.previewMetricLbl}>Quãng đường</Text>
                </View>
                <View style={styles.previewMetricDivider} />
                <View style={styles.previewMetricItem}>
                  <Ionicons name="time-outline" size={20} color={C.primary} />
                  <Text style={styles.previewMetricVal}>
                    {previewSummary?.durationFormatted || '0 phút'}
                  </Text>
                  <Text style={styles.previewMetricLbl}>Thời gian xe máy</Text>
                </View>
              </View>

              <View style={styles.previewWaypointsList}>
                <View style={styles.previewWpRow}>
                  <View style={[styles.previewWpDot, { backgroundColor: C.success }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.previewWpRole}>ĐIỂM XUẤT PHÁT</Text>
                    <Text style={styles.previewWpName} numberOfLines={1}>
                      {previewSummary?.locations?.[0]?.name || selectedRoute?.origin?.name || 'Điểm xuất phát'}
                    </Text>
                  </View>
                </View>

                <View style={styles.previewWpLine} />

                <View style={styles.previewWpRow}>
                  <View style={[styles.previewWpDot, { backgroundColor: '#FF5252' }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.previewWpRole, { color: '#FF5252' }]}>ĐIỂM ĐẾN</Text>
                    <Text style={styles.previewWpName} numberOfLines={1}>
                      {previewSummary?.locations?.[previewSummary.locations.length - 1]?.name ||
                        selectedRoute?.destination?.name ||
                        'Điểm đến'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.previewClosePrimaryBtn}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.previewClosePrimaryBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  };

  // ─── Styles ────────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: C.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      backgroundColor: C.bg,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#F0E8E0',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: C.heading,
    },

    scrollContent: {
      padding: 20,
    },

    // Step content
    stepHeading: {
      fontSize: 22,
      fontWeight: '800',
      color: C.heading,
      marginBottom: 6,
    },
    stepSub: {
      fontSize: 14,
      color: C.sub,
      marginBottom: 20,
      lineHeight: 20,
    },

    // Step 0 — Route cards
    routeCard: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 14,
      height: 110,
      position: 'relative',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    routeCardActive: {
      borderColor: C.primary,
    },
    routeCardImage: {
      ...StyleSheet.absoluteFill,
      width: '100%',
      height: '100%',
    },
    routeCardOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    routeSelectedBadge: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: '#FFF',
      borderRadius: 12,
    },
    routeCardContent: {
      position: 'absolute',
      bottom: 12,
      left: 14,
      right: 14,
    },
    routeCardName: {
      fontSize: 17,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    routeCardMeta: { flexDirection: 'row', gap: 12 },
    routeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    routeMetaText: { fontSize: 12, color: '#EAEAEA', fontWeight: '500' },

    createRouteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderColor: C.primary,
      borderStyle: 'dashed',
      borderRadius: 14,
      paddingVertical: 14,
      marginTop: 4,
    },
    createRouteBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.primary,
    },

    // Step 1 — Form Route Summary
    routeSummaryBox: {
      width: '100%',
      backgroundColor: '#FAF5EE',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: '#E8D0BC',
      marginBottom: 20,
    },
    routeSummaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    routeSummaryHeaderLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginRight: 8,
    },
    routeSummaryIconCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#FDF0E6',
      borderWidth: 1,
      borderColor: '#E8D0BC',
      justifyContent: 'center',
      alignItems: 'center',
    },
    routeSummaryBadge: {
      fontSize: 10,
      fontWeight: '800',
      color: C.primary,
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    routeSummaryName: {
      fontSize: 14,
      fontWeight: '700',
      color: C.heading,
    },
    changeRouteMiniBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FDF0E6',
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#E8D0BC',
    },
    changeRouteMiniBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: C.primary,
    },
    routeSummaryDivider: {
      height: 1,
      backgroundColor: '#EFE6DE',
      marginVertical: 12,
    },
    routeSummaryStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    routeSummaryStatItem: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    routeSummaryStatVal: {
      fontSize: 14,
      fontWeight: '800',
      color: C.heading,
    },
    routeSummaryStatLbl: {
      fontSize: 11,
      color: C.sub,
      textAlign: 'center',
    },
    routeSummaryStatDivider: {
      width: 1,
      height: 28,
      backgroundColor: '#E5D8CC',
    },

    fieldLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: C.sub,
      marginBottom: 8,
      marginTop: 4,
    },
    textInput: {
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: C.text,
      marginBottom: 16,
    },
    textArea: {
      height: 90,
      textAlignVertical: 'top',
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: C.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
      marginBottom: 16,
    },
    inputBoxText: { fontSize: 15, color: C.text },
    vehicleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    vehicleBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: C.card,
      borderWidth: 1.5,
      borderColor: C.border,
    },
    vehicleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    vehicleBtnText: { fontSize: 13, fontWeight: '600', color: C.sub },
    vehicleBtnTextActive: { color: '#FFF' },

    // Trip type
    tripTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    tripTypeBtn: {
      flex: 1, alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 14, borderWidth: 1.5, borderColor: C.border,
      paddingVertical: 12, paddingHorizontal: 6,
    },
    tripTypeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
    tripTypeIcon: { fontSize: 22, marginBottom: 4 },
    tripTypeLabel: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
    tripTypeLabelActive: { color: '#FFF' },
    tripTypeDesc: { fontSize: 10, color: C.sub, textAlign: 'center' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    switchLabel: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
    switchDesc: { fontSize: 12, color: C.sub },

    // Step 2 — Friends
    selectedChipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    selectedChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: '#FDF0E6',
      borderRadius: 20,
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: '#E8D0BC',
    },
    chipAvatar: { width: 20, height: 20, borderRadius: 10 },
    chipName: { fontSize: 12, fontWeight: '600', color: C.primaryDark },

    friendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1.5,
      borderColor: C.border,
    },
    friendRowSelected: {
      borderColor: C.primary,
      backgroundColor: '#FDF8F4',
    },
    friendAvatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12 },
    friendInfo: { flex: 1 },
    friendName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
    friendUsername: { fontSize: 12, color: C.sub },
    checkCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: C.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkCircleActive: { backgroundColor: C.primary, borderColor: C.primary },

    // Step 3 — Success
    successIconWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
    successCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: C.success,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
      shadowColor: C.success,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: C.heading, marginBottom: 4 },
    successSub: { fontSize: 14, color: C.sub },

    qrCard: {
      backgroundColor: C.card,
      borderRadius: 18,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#E8D0BC',
      marginBottom: 14,
      shadowColor: C.heading,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    qrCardTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: C.primaryDark,
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    qrCardSub: {
      fontSize: 12.5,
      color: C.sub,
      textAlign: 'center',
      marginBottom: 16,
    },
    qrWrapper: {
      padding: 12,
      backgroundColor: '#FFF',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#EFE6DE',
      alignItems: 'center',
      justifyContent: 'center',
    },

    inviteCard: {
      backgroundColor: C.card,
      borderRadius: 18,
      padding: 20,
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: '#E8D0BC',
      marginBottom: 14,
      shadowColor: C.heading,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    inviteCardLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: C.sub,
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    inviteCode: {
      fontSize: 36,
      fontWeight: '900',
      color: C.heading,
      letterSpacing: 4,
      marginBottom: 14,
    },
    copyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    copyBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },

    shareRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    shareBtn: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      backgroundColor: C.primary,
      borderRadius: 14,
      paddingVertical: 13,
    },
    shareBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    invitedSection: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    invitedTitle: { fontSize: 14, fontWeight: '700', color: C.heading, marginBottom: 12 },
    invitedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    invitedAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
    invitedName: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
    invitedStatus: {
      backgroundColor: '#FFF8E6',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: '#FFE082',
    },
    invitedStatusText: { fontSize: 11, color: '#A07800', fontWeight: '600' },

    rosterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderWidth: 1.5,
      borderColor: C.primary,
      borderRadius: 14,
    },
    rosterBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

    // QR Modal Styles
    qrModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    qrModalBox: {
      backgroundColor: C.card,
      borderRadius: 24,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: 'center',
      width: '100%',
      maxWidth: 340,
      position: 'relative',
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
    qrModalCloseBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#FAF5EE',
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrModalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: C.heading,
      marginBottom: 4,
    },
    qrModalTripName: {
      fontSize: 14,
      color: C.sub,
      textAlign: 'center',
      marginBottom: 20,
    },
    qrModalImageWrap: {
      padding: 16,
      backgroundColor: '#FFF',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: '#EFE6DE',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    qrModalCodePill: {
      backgroundColor: '#FAF5EE',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 20,
    },
    qrModalCodeText: {
      fontSize: 18,
      fontWeight: '800',
      color: C.heading,
      letterSpacing: 2,
    },
    qrModalCopyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primary,
      width: '100%',
      paddingVertical: 13,
      borderRadius: 14,
    },
    qrModalCopyBtnText: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
    },
    retryBtn: {
      marginTop: 12,
      paddingHorizontal: 18,
      paddingVertical: 8,
      backgroundColor: C.primary,
      borderRadius: 10,
    },
    retryBtnText: {
      color: '#FFF',
      fontSize: 13,
      fontWeight: '700',
    },

    // Bottom bar
    bottomBar: {
      backgroundColor: C.bg,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 28 : 16,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    ctaBtn: {
      backgroundColor: C.primary,
      height: 54,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 5,
    },
    ctaBtnDisabled: {
      backgroundColor: '#D7CCC8',
      shadowOpacity: 0,
      elevation: 0,
    },
    ctaBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },

    // ── Step 0: Custom Route Detail & Timeline ──
    customRouteContainer: {
      marginBottom: 10,
    },
    customRouteBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: C.primary,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 10,
    },
    customRouteBadgeText: {
      color: '#FFF',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    metricStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FAF5EE',
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 8,
      marginVertical: 14,
      borderWidth: 1,
      borderColor: C.border,
    },
    metricItem: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
    },
    metricVal: {
      fontSize: 15,
      fontWeight: '800',
      color: C.heading,
    },
    metricLbl: {
      fontSize: 11,
      color: C.sub,
    },
    metricDivider: {
      width: 1,
      height: 30,
      backgroundColor: C.border,
    },
    timeNoteCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      backgroundColor: '#FDF0E6',
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E8D0BC',
      marginBottom: 16,
    },
    timeNoteText: {
      flex: 1,
      fontSize: 12,
      color: C.primaryDark,
      lineHeight: 18,
      fontWeight: '500',
    },
    timelineSectionTitle: {
      fontSize: 12,
      fontWeight: '800',
      color: C.sub,
      letterSpacing: 1,
      marginBottom: 10,
    },
    timelineCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1.5,
      borderColor: '#EFE6DE',
      marginBottom: 16,
    },
    timelineRow: {
      flexDirection: 'row',
    },
    timelineLeft: {
      alignItems: 'center',
      width: 20,
      marginRight: 12,
      paddingTop: 4,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    timelineLine: {
      flex: 1,
      width: 2,
      backgroundColor: '#E8DDD5',
      marginVertical: 4,
      minHeight: 28,
    },
    timelineContent: {
      flex: 1,
      paddingBottom: 14,
    },
    timelineRole: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 2,
    },
    timelineName: {
      fontSize: 14,
      fontWeight: '700',
      color: C.heading,
      marginBottom: 2,
    },
    timelineAddr: {
      fontSize: 11,
      color: C.sub,
    },
    stopHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    restTimeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#FAF5EE',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#EFE6DE',
    },
    restTimeText: {
      fontSize: 11,
      color: C.primaryDark,
      fontWeight: '600',
    },
    routeActionRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
      marginBottom: 16,
    },
    editRouteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#FAF5EE',
      borderWidth: 1.5,
      borderColor: C.primary,
    },
    editRouteBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: C.primary,
    },
    changeRouteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C.card,
      borderWidth: 1,
      borderColor: C.border,
    },
    changeRouteBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: C.sub,
    },

    // ── Step 0: Empty state & loading ──
    loadingBox: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 10,
    },
    loadingText: {
      fontSize: 13,
      color: C.sub,
    },
    emptyBox: {
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 18,
      padding: 28,
      borderWidth: 1.5,
      borderColor: '#EFE6DE',
      marginVertical: 16,
    },
    emptyIconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#FAF5EE',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 14,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: C.heading,
      marginBottom: 6,
    },
    emptySub: {
      fontSize: 13,
      color: C.sub,
      textAlign: 'center',
      lineHeight: 19,
    },
    seeMoreBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      backgroundColor: '#FAF5EE',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EFE6DE',
      marginBottom: 12,
    },
    seeMoreBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: C.primary,
    },

    // ── Modal All Trips ──
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: '#FFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F0E8E0',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: C.heading,
    },
    modalTripItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#EFE6DE',
      marginBottom: 8,
      backgroundColor: '#FAF5EE',
    },
    modalTripItemSelected: {
      borderColor: C.primary,
      backgroundColor: '#FDF0E6',
    },
    modalTripName: {
      fontSize: 14,
      fontWeight: '700',
      color: C.heading,
      marginBottom: 3,
    },
    modalTripMeta: {
      fontSize: 12,
      color: C.sub,
    },

    // ── Custom Alert Modal (ScanQR Style) ──
    customAlertBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    customAlertBox: {
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
    customAlertIconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: '#FDF1E8',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    customAlertTitle: {
      fontSize: 19,
      fontWeight: '700',
      color: C.heading,
      textAlign: 'center',
      marginBottom: 8,
    },
    customAlertMessage: {
      fontSize: 15,
      color: C.sub,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
    customAlertBtn: {
      backgroundColor: C.primary,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    customAlertBtnText: {
      color: '#FFF',
      fontSize: 15.5,
      fontWeight: '700',
    },
    // Nút Xem trước đường đi trong Step 1
    previewTripRouteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginBottom: 12,
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 3,
    },
    previewTripRouteBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    // Preview Modal styles in CreateTripScreen
    previewModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    previewModalCard: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: C.bg,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    previewModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    previewModalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    previewModalIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#F5ECE3',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewModalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.heading,
    },
    previewModalSub: {
      fontSize: 12,
      color: C.sub,
      marginTop: 1,
    },
    previewModalCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EAE1D7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewMetricsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      paddingVertical: 12,
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    previewMetricItem: {
      flex: 1,
      alignItems: 'center',
    },
    previewMetricVal: {
      fontSize: 14,
      fontWeight: '700',
      color: C.heading,
      marginTop: 4,
    },
    previewMetricLbl: {
      fontSize: 11,
      color: C.sub,
      marginTop: 2,
    },
    previewMetricDivider: {
      width: 1,
      height: 32,
      backgroundColor: C.border,
    },
    previewWaypointsList: {
      backgroundColor: C.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      marginBottom: 18,
    },
    previewWpRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    previewWpDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      flexShrink: 0,
    },
    previewWpLine: {
      width: 2,
      height: 18,
      backgroundColor: '#E5DCD3',
      marginLeft: 4,
      marginVertical: 4,
    },
    previewWpRole: {
      fontSize: 10,
      fontWeight: '700',
      color: C.success,
      letterSpacing: 0.5,
      marginBottom: 2,
    },
    previewWpName: {
      fontSize: 13,
      fontWeight: '700',
      color: C.heading,
    },
    previewClosePrimaryBtn: {
      height: 44,
      borderRadius: 12,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 5,
      elevation: 3,
    },
    previewClosePrimaryBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#FFF',
    },
  });

export default CreateTripScreen;
