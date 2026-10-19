import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Alert,
  Animated,
  PanResponder,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import { runtimeTripBranchesCache, runtimeTripRouteCache } from '../../services/storage/runtimeCache';
import { goongMapService, PlacePrediction, decodePolyline } from '../../services/api/goongMapService';
import { BRANCH_PALETTES } from '../trip/CreateBranchScreen';
// @ts-ignore
const polyline: any = require('@mapbox/polyline');

import {
  STATUS_COLORS,
  type TrackingMember,
  type MemberStatus,
} from '../../data/mockTrackingData';
import { useTripStore } from '../../store/useTripStore';
import { useAuthStore } from '../../store/useAuthStore';
import tripService from '../../services/api/tripService';
import tokenStorage from '../../services/storage/tokenStorage';
import { API_BASE_URL } from '../../config/env';
import { colors } from '../../theme/colors';
import type { Trip } from '../../types';
import { SharedGoongMap, MapWaypoint, MapMember } from '../../components/map/SharedGoongMap';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_MIN_HEIGHT = 68; // Kéo xuống hẳn để xem toàn cảnh map, chừa thanh tiêu đề 68px
const SHEET_COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.38;
const SHEET_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.78;

// Tính khoảng cách giữa 2 toạ độ theo công thức Haversine (mét)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ------------------------------------------------------------------
// Member Status Helper
// ------------------------------------------------------------------
function getMemberStatusIcon(status: MemberStatus): React.ReactNode {
  switch (status) {
    case 'lost':
      // Mỗi lạc đường: tam giác màu xám
      return <Ionicons name="warning" size={16} color="#757575" />;
    case 'no_signal':
    case 'lost_and_no_signal':
      // Mất sóng hoặc vừa lạc đường vừa mất sóng (ưu tiên mất sóng): tam giác màu đỏ
      return <Ionicons name="warning" size={16} color="#E53935" />;
    default:
      return null;
  }
}

function getSignalBars(signal: number | null): React.ReactNode {
  if (signal === null) {
    return <MaterialCommunityIcons name="signal-off" size={14} color={colors.border} />;
  }
  return (
    <View style={styles.signalBarsWrap}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.signalBar,
            {
              height: 3 + i * 2.5,
              backgroundColor: i <= signal ? colors.primary : colors.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ------------------------------------------------------------------
// Member Row Component (Chuẩn UI Guidelines, không dùng emoji)
// ------------------------------------------------------------------
const MemberRow = ({
  member,
  isMe,
}: {
  member: TrackingMember;
  isMe: boolean;
}) => {
  const sc = STATUS_COLORS[member.status] || STATUS_COLORS.normal;
  const roleLabel =
    member.role === 'leader'
      ? 'Trưởng đoàn'
      : member.role === 'sweeper'
        ? 'Chốt đoàn'
        : 'Thành viên';

  return (
    <View
      style={[
        styles.memberRow,
        { backgroundColor: sc.bg, borderColor: sc.border },
        member.status !== 'normal' && { borderWidth: 1.5 },
      ]}
    >
      <View style={styles.memberAvatarWrap}>
        <Image
          source={{
            uri:
              member.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=CD853F&color=fff`,
          }}
          style={styles.memberAvatar}
        />
        {member.role === 'leader' && (
          <View style={styles.leaderBadge}>
            <Ionicons name="ribbon" size={10} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberName, isMe && { color: colors.primary }]}>
            {member.name}
            {isMe ? ' (Bạn)' : ''}
          </Text>
          {getMemberStatusIcon(member.status)}
        </View>
        <Text
          style={[styles.memberSub, member.status !== 'normal' && { color: sc.border }]}
          numberOfLines={1}
        >
          {member.status === 'normal' ? roleLabel : member.locationDesc}
        </Text>
      </View>

      <View style={styles.memberRight}>
        {getSignalBars(member.signal)}
        <View style={styles.batteryRow}>
          <Ionicons
            name={
              (member.battery ?? 100) > 50
                ? 'battery-charging-outline'
                : (member.battery ?? 100) > 20
                  ? 'battery-half-outline'
                  : 'battery-dead-outline'
            }
            size={13}
            color={(member.battery ?? 100) > 20 ? colors.textSecondary : colors.error}
          />
          <Text style={styles.batteryText}>{member.battery ?? 100}%</Text>
        </View>
      </View>
    </View>
  );
};

// ------------------------------------------------------------------
// Main Screen: LiveTrackingScreen
// ------------------------------------------------------------------
const LiveTrackingScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tripId = route.params?.tripId;

  const currentUserId = useAuthStore((s) => s.user?.id);
  const currentUser = useAuthStore((s) => s.user);
  const stopTripMidway = useTripStore((s) => s.stopTripMidway);
  const completeTrip = useTripStore((s) => s.completeTrip);
  const startTrip = useTripStore((s) => s.startTrip);

  const [realTrip, setRealTrip] = useState<Trip | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [activatingTrip, setActivatingTrip] = useState(false);

  // Vị trí GPS thật của người dùng
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trackedMembers, setTrackedMembers] = useState<TrackingMember[]>([]);

  // Trạng thái kết nối WebSocket Realtime Backend
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [wsError, setWsError] = useState<string | null>(null);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  // WebView Ref
  const webViewRef = useRef<WebView>(null);

  // Trạng thái nghỉ chân / Stay mode từ module/tracking/model/message
  const [isStayMode, setIsStayMode] = useState(false);
  const [isStayPublic, setIsStayPublic] = useState(true);

  // Popup chúc mừng hoàn thành khi bán kính < 200m
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Xác nhận dừng chuyến đi giữa chừng (Chỉ trưởng đoàn)
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);
  // Xác nhận chuyển sang chế độ nghỉ chân (Thông báo tối ưu pin & tạm dừng cảnh báo)
  const [showStayConfirmModal, setShowStayConfirmModal] = useState(false);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showCheckIn, setShowCheckIn] = useState(false);

  // ── SOS Modal State (Mock khẩn cấp) ──
  const [showSosModal, setShowSosModal] = useState(false);
  const [sosType, setSosType] = useState<string>('Hỏng xe');
  const [sosNote, setSosNote] = useState('');
  const [isSosSending, setIsSosSending] = useState(false);

  // ── Cảnh báo hành trình & Simulation Events (Lạc đường, Yếu sóng, Mất kết nối) ──
  const [showOffRouteModal, setShowOffRouteModal] = useState(false);
  const [showWeakSignalModal, setShowWeakSignalModal] = useState(false);
  const [showDisconnectedModal, setShowDisconnectedModal] = useState(false);
  const [isOfflineMapActive, setIsOfflineMapActive] = useState(false);
  const [isDownloadingOfflineMap, setIsDownloadingOfflineMap] = useState(false);

  const hasTriggeredOffRouteRef = useRef(false);
  const hasTriggeredWeakSignalRef = useRef(false);
  const hasTriggeredDisconnectedRef = useRef(false);

  // Focus GPS lần đầu khi vừa vào chuyến đi
  const initialGpsFocusedRef = useRef(false);

  // ── Tìm kiếm địa điểm nhanh trên bản đồ Tracking ──
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchPredictions, setSearchPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Địa điểm đã tìm kiếm
  const [searchedPlace, setSearchedPlace] = useState<{
    name: string;
    lat: number;
    lng: number;
    place_id?: string;
  } | null>(null);
  const [draftSavedStatus, setDraftSavedStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');

  // Khoảng cách và thời gian dự kiến tới điểm tìm kiếm (cho dòng 2 nút dẫn đường)
  const [searchedPlaceDistance, setSearchedPlaceDistance] = useState<string>('');
  const [searchedPlaceDuration, setSearchedPlaceDuration] = useState<string>('');

  // Tuyến đường phụ dẫn tới điểm vừa tìm
  const [secondaryRouteCoords, setSecondaryRouteCoords] = useState<[number, number][]>([]);
  const [isCalculatingSecondaryRoute, setIsCalculatingSecondaryRoute] = useState(false);

  // Tuyến đường chính và trạm dừng lấy từ Backend Trip Graph (GET /trips/:tripId/graph)
  const [graphMainRouteCoords, setGraphMainRouteCoords] = useState<[number, number][]>([]);
  const [graphMainWaypoints, setGraphMainWaypoints] = useState<MapWaypoint[]>([]);

  // Đa nhánh hành trình (lấy từ cache hoặc fetch trực tiếp từ Backend GET /trips/:tripId/graph)
  const [liveBranches, setLiveBranches] = useState<any[]>([]);

  useEffect(() => {
    if (!tripId) return;
    let isMounted = true;

    // 1. Đọc ngay từ in-memory cache nếu đã có
    const cached = runtimeTripBranchesCache.get(tripId);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setLiveBranches(cached);
    }

    // 2. Fetch mới nhất từ Backend graph để lấy cả tuyến chính và các nhánh phụ
    tripService
      .getTripGraph(tripId)
      .then((graph) => {
        if (!isMounted || !graph || !Array.isArray(graph.branches) || graph.branches.length === 0) return;

        // 2a. Trích xuất nhánh chính (Tuyến đường chính cả đoàn)
        const mainBranch = graph.branches[0];
        if (mainBranch) {
          let mainCoords: [number, number][] = [];
          if (mainBranch.travels && mainBranch.travels.length > 0) {
            mainBranch.travels.forEach((t) => {
              if (t?.polyline) {
                mainCoords.push(...decodePolyline(t.polyline));
              }
            });
          } else if (mainBranch.stops && mainBranch.stops.length > 0) {
            mainBranch.stops.forEach((s) => {
              if (Number.isFinite(s.lng) && Number.isFinite(s.lat)) {
                mainCoords.push([s.lng, s.lat]);
              }
            });
          }
          if (mainCoords.length > 0) {
            setGraphMainRouteCoords(mainCoords);
          }

          if (mainBranch.stops && mainBranch.stops.length > 0) {
            const stopsWps: MapWaypoint[] = mainBranch.stops.map((s, idx) => ({
              id: s.destinationId || String(idx),
              name: s.name || (idx === 0 ? 'Điểm xuất phát' : idx === mainBranch.stops.length - 1 ? 'Điểm đến' : `Trạm ${idx + 1}`),
              lat: s.lat,
              lng: s.lng,
              type: (idx === 0 ? 'start' : idx === mainBranch.stops.length - 1 ? 'end' : 'stop') as 'start' | 'stop' | 'end',
            }));
            setGraphMainWaypoints(stopsWps);
          }
        }

        // 2b. Trích xuất các nhánh phụ (lọc bỏ các nhánh rác không có điểm dừng)
        const subBranches = graph.branches.slice(1).filter((b) => {
          return (b.stops && b.stops.length >= 2) || (b.travels && b.travels.length > 0);
        });

        const formatted = subBranches
          .map((b, idx) => {
            const coords: [number, number][] = [];
            if (b.travels && b.travels.length > 0) {
              b.travels.forEach((t) => {
                if (t?.polyline) {
                  coords.push(...decodePolyline(t.polyline));
                }
              });
            } else if (b.stops && b.stops.length > 0) {
              b.stops.forEach((s) => {
                if (Number.isFinite(s.lng) && Number.isFinite(s.lat)) {
                  coords.push([s.lng, s.lat]);
                }
              });
            }

            const palColor = b.color || BRANCH_PALETTES[idx % BRANCH_PALETTES.length].hex;
            return {
              id: b.id,
              name: b.label || `Nhánh ${idx + 1}`,
              color: palColor,
              coords,
              splitFromDestinationId: b.splitFromDestinationId,
              mergeToDestinationId: b.mergeToDestinationId,
            };
          })
          .filter((b) => b.coords && b.coords.length >= 2);

        setLiveBranches(formatted);
        runtimeTripBranchesCache.set(tripId, formatted);

        // Gửi lệnh sang WebView bản đồ để vẽ các nhánh rẽ đa màu sắc
        if (webViewRef.current && formatted.length > 0) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'UPDATE_BRANCHES',
              branches: formatted,
            })
          );
        }
      })
      .catch((err) => {
        console.warn('[LiveTracking] Load graph branches error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  // Xử lý tìm kiếm autocomplete
  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim() || text.trim().length < 2) {
      setSearchPredictions([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await goongMapService.searchPlaces(text);
      setSearchPredictions(results);
      setIsSearching(false);
    }, 350);
  };

  const handleSelectSearchedPlace = async (pred: PlacePrediction) => {
    setIsSearching(true);
    const detail = await goongMapService.getPlaceDetail(pred.place_id);
    setIsSearching(false);
    if (!detail) return;

    const newPlace = {
      name: detail.name || pred.description,
      lat: detail.lat,
      lng: detail.lng,
      place_id: pred.place_id,
    };
    setSearchedPlace(newPlace);
    setSecondaryRouteCoords([]); // Reset route tới điểm cũ nếu có
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchPredictions([]);

    // Tự động lưu địa điểm phát sinh vào draft của chuyến đi trên Backend
    const targetTripId = tripId || realTrip?.id;
    if (targetTripId && pred.place_id) {
      setDraftSavedStatus('saving');
      tripService
        .saveDiscoveredPlaceToDraft(targetTripId, pred.place_id, newPlace.name)
        .then(() => {
          setDraftSavedStatus('saved');
        })
        .catch((err) => {
          console.warn('[LiveTracking] Lưu draft backend thất bại:', err?.response?.data || err?.message || err);
          setDraftSavedStatus('failed');
        });
    } else {
      setDraftSavedStatus('idle');
    }

    // Tính trước khoảng cách & thời gian tới điểm này từ vị trí hiện tại
    let myLat = userLocation?.lat || realTrip?.waypoints?.[0]?.lat || 21.0285;
    let myLng = userLocation?.lng || realTrip?.waypoints?.[0]?.lng || 105.8542;
    if (!userLocation) {
      const me = trackedMembers.find((m) => currentUserId && m.id.toLowerCase() === currentUserId.toLowerCase());
      if (me && me.lngLat) {
        myLng = me.lngLat[0];
        myLat = me.lngLat[1];
      }
    }
    const distM = getDistanceMeters(myLat, myLng, detail.lat, detail.lng);
    const distKm = (distM / 1000).toFixed(1);
    const estMins = Math.max(1, Math.round((distM / 1000) / 40 * 60));
    setSearchedPlaceDistance(`${distKm} km`);
    setSearchedPlaceDuration(`${estMins} phút`);

    // Gửi lệnh sang WebView vẽ marker màu vàng và di chuyển camera tới điểm đó
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'SHOW_SEARCHED_LOCATION',
        lat: detail.lat,
        lng: detail.lng,
        name: detail.name,
      })
    );
  };

  const handleClearSearchedPlace = () => {
    setSearchedPlace(null);
    setSearchedPlaceDistance('');
    setSearchedPlaceDuration('');
    setDraftSavedStatus('idle');
    setSecondaryRouteCoords([]);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'CLEAR_SEARCHED_LOCATION' }));
    webViewRef.current?.postMessage(JSON.stringify({ type: 'CLEAR_SECONDARY_ROUTE' }));
  };

  const handleMapLongPress = useCallback(async (coord: { lat: number; lng: number }) => {
    try {
      const detail = await goongMapService.reverseGeocode(coord.lat, coord.lng);
      if (!detail) return;
      handleSelectSearchedPlace({
        place_id: detail.place_id,
        description: detail.address,
        structured_formatting: { main_text: detail.name, secondary_text: detail.address },
      });
      Alert.alert('Đã ghim vị trí trên bản đồ', detail.name);
    } catch (err) {
      console.warn('[LiveTracking] Map long press error:', err);
    }
  }, []);

  const handleToggleSearchedRoute = async () => {
    if (!searchedPlace) return;
    if (secondaryRouteCoords.length > 0) {
      // Đang hiển thị thì ẩn tuyến đường phụ đi
      setSecondaryRouteCoords([]);
      webViewRef.current?.postMessage(JSON.stringify({ type: 'CLEAR_SECONDARY_ROUTE' }));
      return;
    }

    // Lấy toạ độ vị trí hiện tại của mình
    let myLat = userLocation?.lat || realTrip?.waypoints?.[0]?.lat || 21.0285;
    let myLng = userLocation?.lng || realTrip?.waypoints?.[0]?.lng || 105.8542;
    if (!userLocation) {
      const me = trackedMembers.find((m) => currentUserId && m.id.toLowerCase() === currentUserId.toLowerCase());
      if (me && me.lngLat) {
        myLng = me.lngLat[0];
        myLat = me.lngLat[1];
      }
    }

    setIsCalculatingSecondaryRoute(true);
    const leg = await goongMapService.getDirections(
      { lat: myLat, lng: myLng },
      { lat: searchedPlace.lat, lng: searchedPlace.lng }
    );
    setIsCalculatingSecondaryRoute(false);

    if (leg && leg.coords && leg.coords.length > 0) {
      if (leg.distanceM) {
        setSearchedPlaceDistance(`${(leg.distanceM / 1000).toFixed(1)} km`);
      }
      if (leg.durationS) {
        setSearchedPlaceDuration(`${Math.max(1, Math.round(leg.durationS / 60))} phút`);
      }
      setSecondaryRouteCoords(leg.coords);
      webViewRef.current?.postMessage(
        JSON.stringify({
          type: 'SET_SECONDARY_ROUTE',
          coords: leg.coords,
        })
      );
    } else {
      Alert.alert('Thông báo', 'Không tìm thấy đường đi tới địa điểm này.');
    }
  };

  // ── Xử lý các hành động cảnh báo hành trình & Simulation ──
  const handleRerouteBackToMain = async () => {
    setShowOffRouteModal(false);

    // Điểm xuất phát của tuyến dẫn đường quay lại
    const currentPos = prevGpsCoordRef.current || {
      lat: mapWaypoints[0]?.lat || 10.7725,
      lng: mapWaypoints[0]?.lng || 106.6980,
    };

    // Điểm đến trên lộ trình chính (trạm dừng tiếp theo hoặc điểm giữa tuyến)
    const targetPoint = mapWaypoints.length > 1
      ? { lat: mapWaypoints[1].lat, lng: mapWaypoints[1].lng }
      : (routePolylineCoords.length > 5
        ? { lat: routePolylineCoords[Math.min(10, routePolylineCoords.length - 1)][1], lng: routePolylineCoords[Math.min(10, routePolylineCoords.length - 1)][0] }
        : { lat: 10.7800, lng: 106.7050 });

    try {
      const leg = await goongMapService.getDirections(currentPos, targetPoint, 'bike');
      if (leg && leg.coords && leg.coords.length > 0) {
        setSecondaryRouteCoords(leg.coords);
        webViewRef.current?.postMessage(
          JSON.stringify({
            type: 'SET_SECONDARY_ROUTE',
            coords: leg.coords,
          })
        );
        Alert.alert(
          'Đã kích hoạt dẫn đường',
          'Tuyến đường màu vàng đã được hiển thị trên bản đồ để hướng dẫn bạn quay trở lại lộ trình chính của đoàn.'
        );
        return;
      }
    } catch (err) {
      console.warn('[handleRerouteBackToMain] Directions error:', err);
    }

    // Fallback vẽ đường nối trực tiếp nếu không thể lấy directions
    const fallbackCoords: [number, number][] = [
      [currentPos.lng, currentPos.lat],
      [targetPoint.lng, targetPoint.lat],
    ];
    setSecondaryRouteCoords(fallbackCoords);
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'SET_SECONDARY_ROUTE',
        coords: fallbackCoords,
      })
    );
    Alert.alert(
      'Đã kích hoạt dẫn đường',
      'Đã vẽ lộ trình chỉ dẫn quay trở lại tuyến chính của đoàn trên bản đồ.'
    );
  };

  const handleDownloadOfflineMap = () => {
    setIsDownloadingOfflineMap(true);
    setTimeout(() => {
      setIsDownloadingOfflineMap(false);
      setShowWeakSignalModal(false);
      setIsOfflineMapActive(true);
      Alert.alert(
        'Tải bản đồ offline thành công',
        'Dữ liệu cung đường và địa hình của khu vực tiếp theo đã được tải về thiết bị. Bạn có thể yên tâm tiếp tục di chuyển ngay cả khi mất sóng hoàn toàn.'
      );
    }, 1200);
  };

  const handleActivateOfflineMap = () => {
    setShowDisconnectedModal(false);
    setIsOfflineMapActive(true);
    Alert.alert(
      'Chế độ bản đồ offline',
      'Đã kích hoạt chế độ bản đồ offline. Hệ thống vẫn tiếp tục định vị vị trí của bạn qua GPS vệ tinh cục bộ của thiết bị.'
    );
  };

  // ── 3 KỊCH BẢN CẢNH BÁO MÔ PHỎNG / REALTIME ──
  // 1. Giây thứ 10: Mock FE phát hiện lệch tuyến đường gốc -> hỏi có nhận sự dẫn đường trở về tuyến gốc
  // 2. Giây thứ 20-21: Cảnh báo sắp rơi vào vùng mất sóng (sóng yếu) -> gợi ý dừng lại & tải bản đồ offline
  // 3. Giây thứ 25: Mất kết nối tới máy chủ (disconnect/hết pin/rơi vỡ) -> gợi ý chuyển sang dùng bản đồ offline
  useEffect(() => {
    let isCancelled = false;

    // Timer 1: Sau 10 giây báo lệch lộ trình
    const offRouteTimer = setTimeout(() => {
      if (isCancelled || hasTriggeredOffRouteRef.current) return;
      hasTriggeredOffRouteRef.current = true;
      setShowOffRouteModal(true);
    }, 10000);

    // Timer 2: Sau 20.5 giây cảnh báo sắp vào vùng mất sóng
    const weakSignalTimer = setTimeout(() => {
      if (isCancelled || hasTriggeredWeakSignalRef.current || hasTriggeredDisconnectedRef.current) return;
      hasTriggeredWeakSignalRef.current = true;
      setShowWeakSignalModal(true);
    }, 20500);

    // Timer 3: Sau 25 giây báo mất kết nối máy chủ
    const disconnectedTimer = setTimeout(() => {
      if (isCancelled || hasTriggeredDisconnectedRef.current) return;
      hasTriggeredDisconnectedRef.current = true;
      setShowWeakSignalModal(false); // Đóng modal yếu sóng nếu đang hiển thị
      setShowDisconnectedModal(true);
    }, 25000);

    return () => {
      isCancelled = true;
      clearTimeout(offRouteTimer);
      clearTimeout(weakSignalTimer);
      clearTimeout(disconnectedTimer);
    };
  }, []);

  // Pin thật từ thiết bị và tín hiệu kết nối
  const [deviceBattery, setDeviceBattery] = useState<number>(100);
  const [deviceSignal, setDeviceSignal] = useState<number>(4);

  // Quãng đường cá nhân tích luỹ khi đi GPS thật (km)
  const [gpsTraveledKm, setGpsTraveledKm] = useState<number>(0);
  const prevGpsCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  // Lắng nghe % pin thật từ thiết bị bằng expo-battery
  useEffect(() => {
    let batterySub: Battery.Subscription | null = null;
    const initBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (level >= 0) {
          setDeviceBattery(Math.round(level * 100));
        }
        batterySub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
          if (batteryLevel >= 0) {
            setDeviceBattery(Math.round(batteryLevel * 100));
          }
        });
      } catch (e) {
        console.log('[LiveTracking] Battery read error:', e);
      }
    };
    initBattery();
    return () => {
      batterySub?.remove();
    };
  }, []);

  // Lắng nghe trạng thái sóng mạng thật từ expo-network
  useEffect(() => {
    let isMounted = true;
    const readNetworkSignal = async () => {
      try {
        const netState = await Network.getNetworkStateAsync();
        if (!isMounted) return;
        if (!netState.isConnected) {
          setDeviceSignal(0);
        } else if (netState.type === Network.NetworkStateType.WIFI) {
          setDeviceSignal(4);
        } else if (netState.type === Network.NetworkStateType.CELLULAR) {
          setDeviceSignal(netState.isInternetReachable ? 4 : 2);
        } else {
          setDeviceSignal(netState.isInternetReachable ? 3 : 1);
        }
      } catch (e) {
        console.log('[LiveTracking] Network read error:', e);
      }
    };

    readNetworkSignal();
    const interval = setInterval(readNetworkSignal, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Cập nhật pin và sóng của tài khoản DatNT / chính mình trong danh sách đoàn
  useEffect(() => {
    setTrackedMembers((prev) =>
      prev.map((m) => {
        const nameLower = (m.name || '').toLowerCase();
        const idLower = (m.id || '').toLowerCase();
        const isDatNT =
          nameLower.includes('đạt') ||
          nameLower.includes('dat') ||
          idLower === (currentUserId || '').toLowerCase() ||
          idLower === 'u1' ||
          idLower === 'm2' ||
          idLower === 'm3';
        if (isDatNT) {
          return { ...m, battery: deviceBattery, signal: deviceSignal };
        }
        return m;
      })
    );
  }, [currentUserId, deviceBattery, deviceSignal]);

  // Khi mới bắt đầu trip thì flyTo GPS của người dùng
  useEffect(() => {
    if (initialGpsFocusedRef.current) return;
    const targetLat = userLocation?.lat || realTrip?.waypoints?.[0]?.lat;
    const targetLng = userLocation?.lng || realTrip?.waypoints?.[0]?.lng;
    if (targetLat && targetLng && webViewRef.current) {
      initialGpsFocusedRef.current = true;
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'FOCUS_ME',
          lat: targetLat,
          lng: targetLng,
          zoom: 15.5,
        })
      );
    }
  }, [userLocation, realTrip]);

  // Xử lý gửi tín hiệu SOS (Mock ở FE)
  const handleSendSos = () => {
    setIsSosSending(true);
    const myId = currentUserId || 'm2';

    // 1. Gắn cờ SOS lên thành viên trong danh sách đoàn
    setTrackedMembers((prev) =>
      prev.map((m) => {
        const isMe =
          m.id === myId ||
          m.id === 'u1' ||
          (m.name || '').toLowerCase().includes('đạt') ||
          (m.name || '').toLowerCase().includes('bạn');
        if (isMe) {
          return { ...m, status: 'lost', hasSOS: true };
        }
        return m;
      })
    );

    // 2. Gửi lệnh sang WebView map để vẽ tam giác đỏ SOS trên góc trái avatar
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'TRIGGER_SOS',
        memberId: myId,
      })
    );

    // 3. Gửi thông điệp qua WebSocket nếu có
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'tracking.sos',
          payload: {
            reason: sosType,
            message: sosNote,
          },
        })
      );
    }

    setIsSosSending(false);
    setShowSosModal(false);
    Alert.alert(
      'Đã phát tín hiệu SOS',
      `Sự cố [${sosType}] đã được gửi đến đoàn. Biểu tượng tam giác đỏ SOS đã được hiển thị trên avatar của bạn trên bản đồ.`
    );
  };

  // Check-in trạm dừng: Chỉ Trưởng đoàn mới được bấm
  const handlePressCheckIn = () => {
    if (!isLeader) {
      Alert.alert(
        'Quyền hạn hạn chế',
        'Chỉ Trưởng đoàn mới có quyền check-in xác nhận trạm dừng cho cả đoàn!'
      );
      return;
    }
    setShowCheckIn(true);
  };

  // Load chi tiết trip thật và đảm bảo trip đã được kích hoạt ở backend
  useEffect(() => {
    let isMounted = true;
    const fetchTrip = async () => {
      if (!tripId) {
        setLoadingTrip(false);
        return;
      }
      try {
        const data = await tripService.getTripById(tripId);
        if (isMounted && data) {
          // Khôi phục lộ trình thật từ data hoặc AsyncStorage
          let tripRoute = (data as any)?.route;
          let waypoints = (data as any)?.waypoints || [];
          let polylineCoords = (data as any)?.polylineCoords || [];

          if (!tripRoute || waypoints.length === 0 || polylineCoords.length === 0) {
            const cachedRoute = runtimeTripRouteCache.get(tripId);
            if (cachedRoute) {
              tripRoute = cachedRoute;
              waypoints = cachedRoute.waypoints || [];
              polylineCoords = cachedRoute.polylineCoords || [];
              (data as any).route = cachedRoute;
              (data as any).waypoints = waypoints;
              (data as any).polylineCoords = polylineCoords;
            }
          }

          // Nếu chưa có toạ độ (chưa có trong cache thiết bị), tự động phân giải từ tên chuyến đi (VD: "Chợ Bến Thành → UIT")
          if (
            polylineCoords.length === 0 &&
            data.name &&
            (data.name.includes('→') || data.name.includes('->'))
          ) {
            try {
              const parts = data.name.split(/→|->/);
              if (parts.length >= 2) {
                const origQuery = parts[0].trim();
                const destQuery = parts[1].trim();

                const [preds1, preds2] = await Promise.all([
                  goongMapService.searchPlaces(origQuery),
                  goongMapService.searchPlaces(destQuery),
                ]);

                if (preds1.length > 0 && preds2.length > 0) {
                  const [d1, d2] = await Promise.all([
                    goongMapService.getPlaceDetail(preds1[0].place_id),
                    goongMapService.getPlaceDetail(preds2[0].place_id),
                  ]);

                  if (d1 && d2) {
                    const leg = await goongMapService.getDirections(
                      { lat: d1.lat, lng: d1.lng },
                      { lat: d2.lat, lng: d2.lng },
                      'bike'
                    );

                    if (leg) {
                      waypoints = [
                        { id: 'origin', name: d1.name, lat: d1.lat, lng: d1.lng, type: 'start' },
                        { id: 'destination', name: d2.name, lat: d2.lat, lng: d2.lng, type: 'end' },
                      ];
                      polylineCoords = leg.coords;
                      (data as any).waypoints = waypoints;
                      (data as any).polylineCoords = polylineCoords;

                      runtimeTripRouteCache.set(tripId, {
                        origin: d1,
                        destination: d2,
                        waypoints,
                        polylineCoords,
                        legs: [leg],
                      });
                    }
                  }
                }
              }
            } catch (autoErr) {
              console.warn('[LiveTracking] Auto resolve route error:', autoErr);
            }
          }

          setRealTrip({ ...data, waypoints, polylineCoords } as any);

          // Nếu là Leader và chuyến đi chưa ở trạng thái ACTIVE trên Backend -> gọi API kích hoạt
          const isUserLeader = data.leaderId === currentUserId || data.myRole === 'leader';
          const tripStatus = (data.status || '').toLowerCase();
          if (isUserLeader && tripStatus === 'planning') {
            try {
              setActivatingTrip(true);
              await startTrip(tripId);
              data.status = 'ACTIVE';
              setRealTrip({ ...data, status: 'ACTIVE', waypoints, polylineCoords } as any);
            } catch (actErr) {
              console.warn('[LiveTracking] Auto-start trip API error:', actErr);
            } finally {
              if (isMounted) setActivatingTrip(false);
            }
          }

          // Ánh xạ thành viên thật
          const rawMembers = data.members && data.members.length > 0 ? data.members : [];
          const defaultLngLat: [number, number] =
            polylineCoords && polylineCoords.length > 0
              ? [polylineCoords[0][0], polylineCoords[0][1]]
              : waypoints && waypoints.length > 0
                ? [waypoints[0].lng, waypoints[0].lat]
                : userLocation
                  ? [userLocation.lng, userLocation.lat]
                  : [106.698, 10.772];

          const mapped: TrackingMember[] = rawMembers.map((m: any, idx: number) => ({
            id: m.userId || String(idx),
            name: m.name || m.nickname || `Thành viên ${idx + 1}`,
            avatar: m.avatar || '',
            role: ((m.role || '').toLowerCase() as any) || (m.userId === data.leaderId ? 'leader' : 'member'),
            status: 'normal' as MemberStatus,
            lngLat: [defaultLngLat[0] + idx * 0.002, defaultLngLat[1] + idx * 0.002] as [number, number],
            speed: 40,
            battery: 95 - idx * 5,
            distanceToLeader: idx * 0.2,
            signal: 4,
            locationDesc: 'Đang di chuyển trên lộ trình',
          }));

          // Đảm bảo chính mình luôn có mặt trong danh sách đội hình
          const hasMe = mapped.some((m) => currentUserId && m.id.toLowerCase() === currentUserId.toLowerCase());
          if (!hasMe && currentUserId) {
            mapped.unshift({
              id: currentUserId,
              name: currentUser?.name || currentUser?.username || 'Bạn',
              avatar: currentUser?.avatar || '',
              role: (data.leaderId === currentUserId ? 'leader' : 'member') as any,
              status: 'normal',
              lngLat: defaultLngLat,
              speed: 40,
              battery: 100,
              distanceToLeader: 0,
              signal: 4,
              locationDesc: 'Vị trí của bạn',
            });
          }

          if (mapped.length > 0) {
            setTrackedMembers(mapped);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải trip thật:', err);
      } finally {
        if (isMounted) setLoadingTrip(false);
      }
    };
    fetchTrip();
    return () => {
      isMounted = false;
    };
  }, [tripId, currentUserId, startTrip]);

  const isLeader = useMemo(() => {
    if (!realTrip) return true;
    return realTrip.leaderId === currentUserId || realTrip.myRole === 'leader';
  }, [realTrip, currentUserId]);

  // Decode lộ trình thật nếu có (Ưu tiên số 1: Toạ độ từ Backend Trip Graph)
  const routePolylineCoords = useMemo(() => {
    if (graphMainRouteCoords.length > 0) {
      return graphMainRouteCoords;
    }
    const crCoords = (realTrip as any)?.polylineCoords;
    if (Array.isArray(crCoords) && crCoords.length > 0) {
      return crCoords;
    }
    const tripRoute = (realTrip as any)?.route;
    if (tripRoute?.polylineCoords && tripRoute.polylineCoords.length > 0) {
      return tripRoute.polylineCoords;
    }
    if (tripRoute?.polyline) {
      try {
        const decoded = polyline.decode(tripRoute.polyline);
        return decoded.map((coord: any) => [coord[1], coord[0]] as [number, number]);
      } catch { }
    }
    return [];
  }, [graphMainRouteCoords, realTrip]);

  // Điểm đến cuối cùng (Destination)
  const destinationCoord = useMemo(() => {
    const waypoints: any[] = (realTrip as any)?.waypoints || (realTrip as any)?.route?.waypoints || [];
    if (waypoints.length > 0) {
      const last = waypoints[waypoints.length - 1];
      return { lat: last.lat, lng: last.lng, name: last.name || 'Điểm kết thúc' };
    }
    if (realTrip?.name && (realTrip.name.includes('→') || realTrip.name.includes('->'))) {
      const parts = realTrip.name.split(/→|->/);
      return { lat: 10.870, lng: 106.803, name: parts[1].trim() };
    }
    return { lat: 10.870, lng: 106.803, name: 'Điểm đến' };
  }, [realTrip]);

  // ── Bottom Sheet Gesture (3 Trạng thái: Thu nhỏ hẳn 68px, Vừa 38%, Mở rộng 78%) ──
  const EXPANDED_OFFSET = 0;
  const COLLAPSED_OFFSET = SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT;
  const MINIMIZED_OFFSET = SHEET_EXPANDED_HEIGHT - SHEET_MIN_HEIGHT;

  type SheetState = 'minimized' | 'collapsed' | 'expanded';
  const currentSheetState = useRef<SheetState>('collapsed');
  const sheetY = useRef(new Animated.Value(COLLAPSED_OFFSET)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        let baseY = COLLAPSED_OFFSET;
        if (currentSheetState.current === 'expanded') baseY = EXPANDED_OFFSET;
        else if (currentSheetState.current === 'minimized') baseY = MINIMIZED_OFFSET;

        const next = baseY + g.dy;
        sheetY.setValue(Math.max(EXPANDED_OFFSET, Math.min(MINIMIZED_OFFSET, next)));
      },
      onPanResponderRelease: (_, g) => {
        let nextState: SheetState = 'collapsed';
        if (currentSheetState.current === 'expanded') {
          if (g.dy > 130) {
            nextState = 'minimized';
          } else if (g.dy > 45) {
            nextState = 'collapsed';
          } else {
            nextState = 'expanded';
          }
        } else if (currentSheetState.current === 'collapsed') {
          if (g.dy < -50) {
            nextState = 'expanded';
          } else if (g.dy > 50) {
            nextState = 'minimized';
          } else {
            nextState = 'collapsed';
          }
        } else {
          // currently minimized
          if (g.dy < -130) {
            nextState = 'expanded';
          } else if (g.dy < -35) {
            nextState = 'collapsed';
          } else {
            nextState = 'minimized';
          }
        }

        currentSheetState.current = nextState;
        const toVal =
          nextState === 'expanded'
            ? EXPANDED_OFFSET
            : nextState === 'minimized'
            ? MINIMIZED_OFFSET
            : COLLAPSED_OFFSET;

        Animated.spring(sheetY, {
          toValue: toVal,
          bounciness: 4,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Toggle thu gọn / mở rộng nhanh khi bấm vào thanh nắm
  const handleToggleSheet = useCallback(() => {
    let next: SheetState = 'collapsed';
    if (currentSheetState.current === 'minimized') {
      next = 'collapsed';
    } else if (currentSheetState.current === 'collapsed') {
      next = 'minimized';
    } else {
      next = 'collapsed';
    }
    currentSheetState.current = next;
    const toVal = next === 'minimized' ? MINIMIZED_OFFSET : COLLAPSED_OFFSET;
    Animated.spring(sheetY, { toValue: toVal, bounciness: 4, useNativeDriver: true }).start();
  }, [sheetY, MINIMIZED_OFFSET, COLLAPSED_OFFSET]);

  // ── WebSocket Connection theo module/tracking/model/message ────────────────
  const wsRef = useRef<WebSocket | null>(null);

  // Hàm thử kết nối lại WebSocket thủ công
  const handleRetryWs = useCallback(() => {
    setWsStatus('connecting');
    setWsError(null);
    setReconnectTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!tripId) return;
    let ws: WebSocket | null = null;
    let isCancelled = false;

    const connectWs = async () => {
      try {
        setWsStatus('connecting');
        setWsError(null);
        const token = await tokenStorage.getAccessToken();
        const wsHost = API_BASE_URL.replace(/^http/, 'ws').replace(/\/v1\/?$/, '');
        // Backend LiftAccessToken.go yêu cầu param ?access_token=
        const wsUrl = `${wsHost}/v1/realtime/rooms/${tripId}${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isCancelled) return;
          setWsStatus('connected');
          setWsError(null);
        };

        ws.onmessage = (event) => {
          if (isCancelled) return;
          try {
            const data = JSON.parse(event.data);

            // 1. Nhận cập nhật toạ độ toàn đoàn: type = 'tracking.positions' (OnTick.go)
            if (data.type === 'tracking.positions' && Array.isArray(data.payload)) {
              setTrackedMembers((prev) => {
                const updated = [...prev];
                for (const p of data.payload) {
                  const pId = (p.UserId || p.userId || '').toLowerCase();
                  const lat = p.Lat ?? p.lat;
                  const lng = p.Lng ?? p.lng;
                  if (!pId || !lat || !lng) continue;

                  // Bỏ qua toạ độ của chính mình từ socket vì do GPS điện thoại phát
                  if (currentUserId && pId === currentUserId.toLowerCase()) continue;

                  const battery = p.BatteryPercent ?? p.batteryPercent ?? 100;
                  const signal = p.SignalBars ?? p.signalBars ?? 4;
                  const driveStatus = String(p.DriveStatus ?? p.driveStatus ?? 'OnROUTE');
                  const connStatus = String(p.ConnectionStatus ?? p.connectionStatus ?? 'CONNECTING');

                  const isDeviated = driveStatus === 'DEVIATED' || driveStatus === '1';
                  const isEmergency = driveStatus === 'EMERGENCY' || driveStatus === '3';
                  const isDisconnected =
                    connStatus === 'DISCONNECTED' ||
                    connStatus === '2' ||
                    connStatus === 'UNSTABLE' ||
                    connStatus === '1';

                  let newStatus: MemberStatus = 'normal';
                  if (isDisconnected) {
                    // Ưu tiên mất sóng: mất sóng hoặc vừa lạc đường vừa mất sóng -> ám đỏ, tam giác đỏ
                    newStatus = isDeviated ? 'lost_and_no_signal' : 'no_signal';
                  } else if (isDeviated) {
                    // Mỗi lạc đường -> ám xám, tam giác xám
                    newStatus = 'lost';
                  } else if (isEmergency) {
                    newStatus = 'lost_and_no_signal';
                  }

                  if (connStatus === 'DISCONNECTED' || connStatus === '2') {
                    if (!hasTriggeredDisconnectedRef.current) {
                      hasTriggeredDisconnectedRef.current = true;
                      setShowWeakSignalModal(false);
                      setShowDisconnectedModal(true);
                    }
                  } else if (connStatus === 'UNSTABLE' || connStatus === '1' || signal <= 1) {
                    if (!hasTriggeredWeakSignalRef.current && !hasTriggeredDisconnectedRef.current) {
                      hasTriggeredWeakSignalRef.current = true;
                      setShowWeakSignalModal(true);
                    }
                  }

                  let locationDesc = 'Đang di chuyển trên lộ trình';
                  if (isDeviated) locationDesc = 'Đang lệch khỏi lộ trình';
                  else if (driveStatus === 'STOP' || driveStatus === '2') locationDesc = 'Đang tạm dừng';
                  else if (connStatus === 'DISCONNECTED' || connStatus === '2') locationDesc = 'Mất kết nối máy chủ';
                  else if (connStatus === 'UNSTABLE' || connStatus === '1') locationDesc = 'Tín hiệu không ổn định';
                  else if (driveStatus === 'StayPublic' || driveStatus === '4') locationDesc = 'Đang nghỉ ngơi (công khai)';
                  else if (driveStatus === 'COMPLETED' || driveStatus === '6') locationDesc = 'Đã hoàn thành chuyến đi';

                  const idx = updated.findIndex((m) => m.id.toLowerCase() === pId);

                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
                      lngLat: [lng, lat],
                      status: newStatus,
                      battery,
                      signal,
                      locationDesc,
                      hasSOS: isEmergency || updated[idx].hasSOS,
                    };
                  } else {
                    // Thành viên mới trong phòng (VD: các account giả lập anhnam, baokhoa...)
                    updated.push({
                      id: p.UserId || p.userId,
                      name: p.Nickname || p.nickname || p.Username || p.username || `Rider ${pId.slice(0, 4)}`,
                      avatar: '',
                      role: 'member',
                      status: newStatus,
                      lngLat: [lng, lat],
                      speed: driveStatus === 'STOP' || driveStatus === '2' ? 0 : 35,
                      battery,
                      distanceToLeader: 0.5,
                      signal,
                      locationDesc,
                      hasSOS: isEmergency,
                    });
                  }

                  // Cập nhật marker trên webview map tức thì không reload
                  webViewRef.current?.postMessage(
                    JSON.stringify({
                      type: 'UPDATE_POSITION',
                      id: p.UserId || p.userId,
                      lat: lat,
                      lng: lng,
                      isMe: false,
                      hasSOS: isEmergency,
                      status: newStatus,
                    })
                  );
                }
                return updated;
              });
            }

            // 2. Nhận thông báo chế độ nghỉ ngơi: type = 'stayMode' (OnMessage.go)
            if (data.type === 'stayMode' && data.payload) {
              const isModeStay = !!data.payload.isChangeMode;
              setIsStayMode(isModeStay);
            }

            // 3. Nhận thông báo hiện diện: type = 'system.presence' (Room.go)
            if (data.type === 'system.presence' && data.payload) {
              const { userId, online } = data.payload;
              setTrackedMembers((prev) =>
                prev.map((m) =>
                  m.id === userId
                    ? {
                      ...m,
                      signal: online ? 4 : 0,
                      status: online ? 'normal' : 'no_signal',
                    }
                    : m
                )
              );
            }
          } catch (e) {
            console.warn('[LiveTracking] WS message parse error:', e);
          }
        };

        ws.onerror = () => {
          if (isCancelled) return;
          setWsStatus('error');
          setWsError('Không thể kết nối tới phòng Realtime của chuyến đi');
        };

        ws.onclose = (e) => {
          if (isCancelled) return;
          setWsStatus('disconnected');
          setWsError(
            e.code === 1000
              ? 'Phòng theo dõi đã kết thúc'
              : 'Mất kết nối máy chủ Realtime (mã: ' + e.code + ')'
          );
          if (!hasTriggeredDisconnectedRef.current) {
            hasTriggeredDisconnectedRef.current = true;
            setShowWeakSignalModal(false);
            setShowDisconnectedModal(true);
          }
        };
      } catch (e) {
        if (!isCancelled) {
          setWsStatus('error');
          setWsError('Lỗi khởi tạo kết nối Realtime');
        }
      }
    };

    connectWs();

    return () => {
      isCancelled = true;
      if (ws) ws.close();
    };
  }, [tripId, currentUserId, reconnectTrigger]);

  // Helper chuyển đổi số vạch sóng mạng (0 - 4/5) thành dBm chuẩn theo PositionMessage.go
  const signalBarsToDbm = useCallback((bars: number): number => {
    switch (bars) {
      case 5:
      case 4:
        return -74;
      case 3:
        return -95;
      case 2:
        return -105;
      case 1:
        return -115;
      default:
        return -130;
    }
  }, []);

  // Gửi thông điệp toạ độ lên WebSocket (module/tracking/model/message/PositionMessage.go)
  const sendPositionWs = useCallback(
    (lat: number, lng: number) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'tracking.position',
            payload: {
              lat,
              lng,
              batteryPercent: Math.max(0, Math.min(100, Math.round(deviceBattery))),
              signalDbm: signalBarsToDbm(deviceSignal),
            },
          })
        );
      }
    },
    [deviceBattery, deviceSignal, signalBarsToDbm]
  );

  // Leader chuyển đổi chế độ nghỉ chân (module/tracking/model/message/ChangeToStayMode.go)
  const handleToggleStayMode = useCallback(() => {
    if (!isLeader) return;
    const nextStay = !isStayMode;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'tracking.stayMode',
          payload: nextStay,
        })
      );
    }
    setIsStayMode(nextStay);
  }, [isLeader, isStayMode]);

  // Xử lý khi nhấn nút Nghỉ chân: Hiện popup báo tạm dừng cảnh báo & tối ưu pin
  const handlePressStayBtn = useCallback(() => {
    if (!isLeader) return;
    if (isStayMode) {
      // Đang nghỉ chân -> bấm để tiếp tục di chuyển ngay
      handleToggleStayMode();
    } else {
      // Chưa nghỉ chân -> hiện popup cảnh báo tối ưu pin & tạm dừng theo dõi
      setShowStayConfirmModal(true);
    }
  }, [isLeader, isStayMode, handleToggleStayMode]);

  // Thành viên chuyển đổi quyền hiển thị vị trí khi nghỉ chân (module/tracking/model/message/StayPublic.go)
  const handleToggleStayPublic = useCallback(() => {
    const nextPublic = !isStayPublic;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'tracking.userStayPublic',
          payload: nextPublic,
        })
      );
    }
    setIsStayPublic(nextPublic);
  }, [isStayPublic]);

  // ── Kiểm tra điều kiện hoàn thành (Bán kính < 200m) ──────────────────
  const checkArrivalCondition = useCallback(
    (currentLat: number, currentLng: number, allMembers: TrackingMember[]) => {
      if (hasCompleted) return;
      const myDist = getDistanceMeters(currentLat, currentLng, destinationCoord.lat, destinationCoord.lng);

      // Kiểm tra tất cả thành viên trong đoàn có đều nằm trong bán kính 200m
      const allArrived =
        myDist <= 200 &&
        allMembers.every((m) => {
          const dist = getDistanceMeters(m.lngLat[1], m.lngLat[0], destinationCoord.lat, destinationCoord.lng);
          return dist <= 200;
        });

      if (allArrived) {
        setHasCompleted(true);
        setShowCelebrationModal(true);
      }
    },
    [destinationCoord, hasCompleted]
  );

  // ── GPS Thật với expo-location (Live Realtime Tracking) ───────────────────
  useEffect(() => {
    let locSub: Location.LocationSubscription | null = null;
    let isMounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;
      if (status !== 'granted') {
        Alert.alert(
          'Yêu cầu quyền vị trí',
          'Chế độ Live Tracking cần quyền GPS để chia sẻ vị trí của bạn với đoàn theo thời gian thực.'
        );
        return;
      }

      try {
        // Lấy toạ độ ban đầu
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted && initialLoc?.coords) {
          const { latitude, longitude } = initialLoc.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          sendPositionWs(latitude, longitude);
        }

        // Theo dõi di chuyển liên tục
        locSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 3,
          },
          (loc) => {
            if (!isMounted) return;
            const { latitude, longitude } = loc.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            // Tích luỹ quãng đường cá nhân của người dùng
            if (prevGpsCoordRef.current) {
              const deltaM = getDistanceMeters(
                prevGpsCoordRef.current.lat,
                prevGpsCoordRef.current.lng,
                latitude,
                longitude
              );
              if (deltaM >= 3 && deltaM < 3000) {
                setGpsTraveledKm((prev) => prev + deltaM / 1000);
              }
            }
            prevGpsCoordRef.current = { lat: latitude, lng: longitude };

            // Cập nhật marker bản thân trên WebView map
            webViewRef.current?.postMessage(
              JSON.stringify({
                type: 'UPDATE_POSITION',
                id: currentUserId || 'u1',
                lat: latitude,
                lng: longitude,
                isMe: true,
              })
            );

            // Gửi toạ độ qua WebSocket theo chuẩn PositionMessage.go
            sendPositionWs(latitude, longitude);

            // Kiểm tra điều kiện tới đích
            checkArrivalCondition(latitude, longitude, trackedMembers);
          }
        );
      } catch (err) {
        console.warn('[LiveTracking] GPS watch error:', err);
      }
    })();

    return () => {
      isMounted = false;
      locSub?.remove();
    };
  }, [checkArrivalCondition, currentUserId, trackedMembers, sendPositionWs]);

  // ── Quay lại vị trí GPS hiện tại của bản thân trên bản đồ ─────────────────
  const handleRecenterMap = useCallback(() => {
    let targetLat = userLocation?.lat || null;
    let targetLng = userLocation?.lng || null;

    if (targetLat == null || targetLng == null) {
      const me = trackedMembers.find(
        (m) => currentUserId && m.id.toLowerCase() === currentUserId.toLowerCase()
      );
      if (me && me.lngLat) {
        targetLng = me.lngLat[0];
        targetLat = me.lngLat[1];
      } else if (routePolylineCoords.length > 0) {
        targetLng = routePolylineCoords[0][0];
        targetLat = routePolylineCoords[0][1];
      }
    }

    if (targetLat != null && targetLng != null && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'RECENTER',
          lat: targetLat,
          lng: targetLng,
          zoom: 15,
        })
      );
    } else {
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        .then((loc) => {
          if (loc?.coords && webViewRef.current) {
            setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'RECENTER',
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                zoom: 15,
              })
            );
          }
        })
        .catch(() => { });
    }
  }, [userLocation, trackedMembers, currentUserId, routePolylineCoords]);

  // Xử lý dừng chuyến đi giữa chừng (Chỉ trưởng đoàn)
  const handlePressStopTrip = () => {
    if (!isLeader) {
      Alert.alert('Thông báo', 'Chỉ Trưởng đoàn mới có quyền dừng chuyến đi giữa chừng.');
      return;
    }
    setShowStopConfirmModal(true);
  };

  const handleConfirmStopTrip = async () => {
    setShowStopConfirmModal(false);
    const targetId = tripId || realTrip?.id;
    if (targetId) {
      try {
        await stopTripMidway(targetId);
      } catch (err) {
        console.warn('Lỗi dừng chuyến đi:', err);
      }
    }
    navigation.navigate('Home');
  };

  // Xử lý hoàn thành chuyến đi khi về đích
  const handleConfirmCompleteCelebration = async () => {
    setShowCelebrationModal(false);
    const targetId = tripId || realTrip?.id;
    if (targetId) {
      try {
        await completeTrip(targetId);
      } catch (err) {
        console.warn('Lỗi hoàn thành chuyến đi:', err);
      }
    }
    navigation.navigate('Home');
  };

  const normalCount = trackedMembers.filter((m) => m.status === 'normal').length;
  const alertCount = trackedMembers.length - normalCount;

  // Waypoints cho GoongMap (Ưu tiên số 1: Trạm dừng từ Backend Trip Graph)
  const mapWaypoints: MapWaypoint[] = useMemo(() => {
    if (graphMainWaypoints.length > 0) {
      return graphMainWaypoints;
    }
    const waypoints: any[] = (realTrip as any)?.waypoints || (realTrip as any)?.route?.waypoints || [];
    if (waypoints.length > 0) {
      return waypoints.map((wp: any, idx: number) => ({
        id: wp.id || wp.place_id || String(idx),
        name: wp.name || (idx === 0 ? 'Điểm xuất phát' : idx === waypoints.length - 1 ? 'Điểm đến' : `Trạm ${idx}`),
        lat: wp.lat,
        lng: wp.lng,
        type: (idx === 0 ? 'start' : idx === waypoints.length - 1 ? 'end' : 'stop') as 'start' | 'stop' | 'end',
      }));
    }
    return [];
  }, [graphMainWaypoints, realTrip]);

  // Vị trí tâm khởi tạo ổn định (không reload lại WebView khi GPS / simulation tick)
  const mapInitialCenter = useMemo<[number, number]>(() => {
    if (routePolylineCoords.length > 0) {
      return routePolylineCoords[0];
    }
    if (mapWaypoints.length > 0) {
      return [mapWaypoints[0].lng, mapWaypoints[0].lat];
    }
    if (userLocation) {
      return [userLocation.lng, userLocation.lat];
    }
    return [106.698, 10.772];
  }, [
    routePolylineCoords.length > 0 ? `${routePolylineCoords[0][0]},${routePolylineCoords[0][1]}` : '',
    mapWaypoints.length > 0 ? `${mapWaypoints[0].lng},${mapWaypoints[0].lat}` : '',
  ]);

  const mapMembers: MapMember[] = useMemo(() => {
    return trackedMembers.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      lng: m.lngLat[0],
      lat: m.lngLat[1],
      role: m.role,
      status: m.status,
    }));
  }, [trackedMembers]);

  const totalDist = realTrip?.distanceKm || 0;
  // Quãng đường đã đi tính theo GPS thực tế của người dùng
  const personalTraveledKm = gpsTraveledKm;
  const currentTraveled = personalTraveledKm > 0 ? personalTraveledKm : 0;
  const progressPct = Math.min(100, Math.round((currentTraveled / (totalDist || 1)) * 100));

  // Điểm đến tiếp theo (Trạm dừng kế tiếp hoặc Đích cuối cùng)
  const nextTargetCoord = useMemo(() => {
    const waypoints: any[] = (realTrip as any)?.waypoints || (realTrip as any)?.route?.waypoints || [];
    if (waypoints.length > 1) {
      const myLat = userLocation?.lat || null;
      const myLng = userLocation?.lng || null;

      // Nếu có toạ độ hiện tại, tìm trạm dừng đầu tiên phía trước mà user chưa đến (khoảng cách > 150m)
      if (myLat != null && myLng != null) {
        for (let i = 1; i < waypoints.length; i++) {
          const wp = waypoints[i];
          const dist = getDistanceMeters(myLat, myLng, wp.lat, wp.lng);
          if (dist > 150 || i === waypoints.length - 1) {
            return {
              lat: wp.lat,
              lng: wp.lng,
              name: wp.name || (i === waypoints.length - 1 ? 'Điểm kết thúc' : `Trạm ${i}`),
              isFinal: i === waypoints.length - 1,
              index: i,
            };
          }
        }
      }

      const last = waypoints[waypoints.length - 1];
      return {
        lat: last.lat,
        lng: last.lng,
        name: last.name || 'Điểm kết thúc',
        isFinal: true,
        index: waypoints.length - 1,
      };
    }

    if (waypoints.length === 1) {
      return {
        lat: waypoints[0].lat,
        lng: waypoints[0].lng,
        name: waypoints[0].name || 'Điểm kết thúc',
        isFinal: true,
        index: 0,
      };
    }

    if (realTrip?.name && (realTrip.name.includes('→') || realTrip.name.includes('->'))) {
      const parts = realTrip.name.split(/→|->/);
      return { lat: 10.870, lng: 106.803, name: parts[1].trim(), isFinal: true, index: 1 };
    }
    return { lat: 10.870, lng: 106.803, name: 'Điểm đến', isFinal: true, index: 1 };
  }, [realTrip, userLocation]);

  // Khoảng cách còn lại đến điểm đến tiếp theo
  const remainingDistanceKm = useMemo(() => {
    let myLat = userLocation?.lat || null;
    let myLng = userLocation?.lng || null;

    if (myLat == null || myLng == null) {
      const me = trackedMembers.find(
        (m) => currentUserId && m.id.toLowerCase() === currentUserId.toLowerCase()
      );
      if (me && me.lngLat) {
        myLng = me.lngLat[0];
        myLat = me.lngLat[1];
      }
    }

    if (myLat != null && myLng != null && nextTargetCoord.lat && nextTargetCoord.lng) {
      const distMeters = getDistanceMeters(myLat, myLng, nextTargetCoord.lat, nextTargetCoord.lng);
      if (distMeters < 1000) {
        return `${Math.round(distMeters)} m`;
      }
      return `${(distMeters / 1000).toFixed(1)} km`;
    }

    if (totalDist > 0) {
      const rem = Math.max(0, totalDist - currentTraveled);
      return `${rem.toFixed(1)} km`;
    }
    return null;
  }, [userLocation, trackedMembers, currentUserId, nextTargetCoord, totalDist, currentTraveled]);

  if (loadingTrip || activatingTrip) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>
          {activatingTrip ? 'Đang kích hoạt chuyến đi...' : 'Đang kết nối hành trình...'}
        </Text>
      </View>
    );
  }

  // Báo lỗi rõ ràng nếu không chạy được Backend Live hoặc không có thông tin trip
  if (!realTrip) {
    return (
      <SafeAreaView style={[styles.container, styles.errorScreenContainer]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorScreenContent}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.error} />
          <Text style={styles.errorScreenTitle}>Không thể kết nối chuyến đi</Text>
          <Text style={styles.errorScreenSubtitle}>
            Không tìm thấy dữ liệu hành trình trên Backend hoặc bạn chưa tham gia vào chuyến đi này.
          </Text>
          <View style={styles.errorScreenActions}>
            <TouchableOpacity
              style={styles.errorScreenBackBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.errorScreenBackText}>Quay lại</Text>
            </TouchableOpacity>
            {!!tripId && (
              <TouchableOpacity
                style={styles.errorScreenRetryBtn}
                onPress={() => setLoadingTrip(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.errorScreenRetryText}>Thử lại</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* ── BẢN ĐỒ GOONG TONE NÂU ĐẬM CAO CẤP ── */}
      <View style={styles.mapContainer}>
        <SharedGoongMap
          ref={webViewRef}
          style={styles.webview}
          initialCenter={mapInitialCenter}
          initialZoom={13}
          waypoints={mapWaypoints}
          routeCoords={routePolylineCoords}
          secondaryRouteCoords={secondaryRouteCoords}
          branchRoutes={liveBranches.map((b) => ({
            id: b.id,
            name: b.name,
            color: b.color,
            coords: b.coords || [],
          }))}
          searchedMarker={searchedPlace ? { lat: searchedPlace.lat, lng: searchedPlace.lng } : null}
          members={mapMembers}
          variant="default"
          onMapLongPress={handleMapLongPress}
          onMarkerPress={(memberId) => {
            const member = trackedMembers.find((m) => m.id === memberId);
            if (member) {
              Alert.alert(
                member.name,
                `Trạng thái: ${STATUS_COLORS[member.status as MemberStatus]?.label || 'Bình thường'}\n${member.locationDesc}`
              );
            }
          }}
        />

        {/* OVERLAY: Top Header & Actions */}
        <SafeAreaView style={styles.mapOverlaySafe} pointerEvents="box-none">
          {/* Header Bar */}
          <View style={styles.mapHeader} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            {/* Trạng thái kết nối Trực tiếp Backend */}
            <View style={styles.liveStatusBadge}>
              <View
                style={[
                  styles.liveStatusDot,
                  wsStatus === 'connected'
                    ? styles.liveStatusDotConnected
                    : wsStatus === 'connecting'
                      ? styles.liveStatusDotConnecting
                      : styles.liveStatusDotError,
                ]}
              />
              <Text style={styles.liveStatusText}>
                {wsStatus === 'connected'
                  ? 'Trực tiếp'
                  : wsStatus === 'connecting'
                    ? 'Đang kết nối...'
                    : 'Mất kết nối'}
              </Text>
            </View>

            {/* Nút Nghỉ Chân (Chỉ Trưởng Đoàn) bay lên thay thế Dừng Trip */}
            {isLeader ? (
              <TouchableOpacity
                style={[styles.stayModeBtnTop, isStayMode && styles.stayModeBtnTopActive]}
                onPress={handlePressStayBtn}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isStayMode ? 'play-outline' : 'cafe-outline'}
                  size={15}
                  color={isStayMode ? '#FFF' : colors.textPrimary}
                />
                <Text style={[styles.stayModeBtnTopText, isStayMode && styles.stayModeBtnTopTextActive]}>
                  {isStayMode ? 'Tiếp tục' : 'Nghỉ chân'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 40 }} />
            )}
          </View>

          {/* Banner trạng thái Bản đồ Offline khi người dùng kích hoạt */}
          {isOfflineMapActive && (
            <View style={styles.offlineBanner} pointerEvents="none">
              <MaterialCommunityIcons name="cloud-off-outline" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.offlineBannerText}>Đang dùng Bản đồ Offline (Định vị GPS cục bộ)</Text>
            </View>
          )}

          {/* Cảnh báo trạng thái kết nối Realtime Backend */}
          {wsStatus !== 'connected' && (
            <View style={styles.connectionErrorBanner} pointerEvents="box-none">
              <Ionicons
                name={wsStatus === 'connecting' ? 'sync-outline' : 'alert-circle-outline'}
                size={16}
                color={wsStatus === 'connecting' ? colors.warning : colors.error}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.connectionErrorText} numberOfLines={1}>
                {wsStatus === 'connecting'
                  ? 'Đang kết nối tới máy chủ Realtime...'
                  : wsError || 'Mất kết nối máy chủ Realtime'}
              </Text>
              <TouchableOpacity
                style={styles.retryConnectionBtn}
                onPress={handleRetryWs}
                activeOpacity={0.8}
              >
                <Text style={styles.retryConnectionBtnText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sub Header: SOS + Search location */}
          <View style={styles.subHeaderRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.sosButton}
              onPress={() => setShowSosModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>

            {/* Nút Tìm kiếm địa điểm trên bản đồ */}
            <TouchableOpacity
              style={[styles.headerIconButton, isSearchOpen && { backgroundColor: colors.primary }]}
              onPress={() => setIsSearchOpen((prev) => !prev)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={isSearchOpen ? '#FFFFFF' : colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Panel Tìm kiếm địa điểm nổi trên bản đồ */}
          {isSearchOpen && (
            <View style={styles.searchFloatingPanel}>
              <View style={styles.searchBarRow}>
                <Ionicons name="search" size={17} color={colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchBarInput}
                  placeholder="Tìm địa điểm trên bản đồ..."
                  placeholderTextColor="#A0938C"
                  value={searchQuery}
                  onChangeText={handleSearchQueryChange}
                  autoFocus
                  returnKeyType="search"
                />
                {isSearching ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginHorizontal: 4 }} />
                ) : searchQuery.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setSearchPredictions([]);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#A0938C" />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.searchBarCloseBtn}
                  onPress={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                    setSearchPredictions([]);
                  }}
                >
                  <Text style={styles.searchBarCloseText}>Đóng</Text>
                </TouchableOpacity>
              </View>

              {/* Danh sách gợi ý Autocomplete */}
              {searchPredictions.length > 0 && (
                <ScrollView
                  style={styles.searchPredList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {searchPredictions.map((pred) => (
                    <TouchableOpacity
                      key={pred.place_id}
                      style={styles.searchPredItem}
                      onPress={() => handleSelectSearchedPlace(pred)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={colors.primary}
                        style={{ marginRight: 10, marginTop: 2 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.searchPredTitle} numberOfLines={1}>
                          {pred.structured_formatting?.main_text || pred.description}
                        </Text>
                        <Text style={styles.searchPredSub} numberOfLines={1}>
                          {pred.structured_formatting?.secondary_text || pred.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Banner thông báo chế độ nghỉ chân khi được kích hoạt */}
          {isStayMode && (
            <View style={styles.stayModeBanner} pointerEvents="box-none">
              <View style={styles.stayModeBannerInner}>
                <Ionicons name="cafe-outline" size={15} color={colors.primary} />
                <Text style={styles.stayModeBannerText}>Đoàn đang tạm dừng nghỉ ngơi</Text>
                {!isLeader && (
                  <TouchableOpacity
                    style={styles.stayPrivacyToggle}
                    onPress={handleToggleStayPublic}
                  >
                    <Ionicons
                      name={isStayPublic ? 'eye-outline' : 'eye-off-outline'}
                      size={14}
                      color={colors.primary}
                    />
                    <Text style={styles.stayPrivacyToggleText}>
                      {isStayPublic ? 'Công khai' : 'Ẩn vị trí'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Button xem đường đi tới điểm vừa tìm */}
          {searchedPlace && (
            <View style={styles.searchedRouteBtnRow} pointerEvents="box-none">
              <TouchableOpacity
                style={[
                  styles.searchedRouteBtn,
                  secondaryRouteCoords.length > 0 && styles.searchedRouteBtnActive,
                ]}
                onPress={handleToggleSearchedRoute}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={secondaryRouteCoords.length > 0 ? 'git-branch' : 'git-branch-outline'}
                  size={16}
                  color="#FFD54F"
                  style={{ marginRight: 8, flexShrink: 0 }}
                />
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <Text
                    style={styles.searchedRouteBtnText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {secondaryRouteCoords.length > 0
                      ? `Đang xem đường tới: ${searchedPlace.name}`
                      : `Xem đường đi tới: ${searchedPlace.name}`}
                  </Text>
                  {searchedPlaceDistance ? (
                    <Text style={styles.searchedRouteSubText} numberOfLines={1}>
                      ~{searchedPlaceDistance} • {searchedPlaceDuration}
                      {draftSavedStatus === 'saving' ? ' • Đang lưu nháp...' : ''}
                      {draftSavedStatus === 'saved' ? ' • Đã lưu nháp' : ''}
                    </Text>
                  ) : draftSavedStatus === 'saved' ? (
                    <Text style={styles.searchedRouteSubText} numberOfLines={1}>
                      Đã lưu địa điểm vào danh sách nháp
                    </Text>
                  ) : null}
                </View>
                {isCalculatingSecondaryRoute && (
                  <ActivityIndicator size="small" color="#FFD54F" style={{ marginLeft: 6, flexShrink: 0 }} />
                )}
                <TouchableOpacity
                  style={styles.searchedRouteCloseBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleClearSearchedPlace();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color="#FFD54F" />
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          )}

          {/* Pill Điểm đến tiếp theo */}
          <View style={styles.nextStopPill} pointerEvents="none">
            <View style={styles.nextStopIconWrap}>
              <Ionicons name="location-outline" size={15} color={colors.primary} />
            </View>
            <View style={styles.nextStopTextCol}>
              <Text style={styles.nextStopLabel} numberOfLines={1}>
                {nextTargetCoord.isFinal ? 'ĐÍCH ĐẾN TIẾP THEO' : 'TRẠM DỪNG TIẾP THEO'}
              </Text>
              <Text style={styles.nextStopName} numberOfLines={1} ellipsizeMode="tail">
                {nextTargetCoord.name}
              </Text>
            </View>
            {remainingDistanceKm ? (
              <View style={styles.nextStopDistBadge}>
                <Text style={styles.nextStopDistValue}>{remainingDistanceKm}</Text>
              </View>
            ) : null}
          </View>
        </SafeAreaView>

        {/* List View Overlay */}
        {viewMode === 'list' && (
          <View style={styles.listOverlay}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.listOverlayTitle}>Danh sách thành viên đoàn</Text>
                <TouchableOpacity onPress={() => setViewMode('map')}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {trackedMembers.map((m) => (
                <MemberRow key={m.id} member={m} isMe={m.id === currentUserId || m.id === 'u1'} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── THANH HÀNH ĐỘNG NỔI TRÊN CỬA SỔ ĐỘI HÌNH: DỪNG TRIP Ở GIỮA + CHẤM NÂU GPS BÊN PHẢI ── */}
      {viewMode === 'map' && (
        <Animated.View
          style={[
            styles.floatingActionRow,
            {
              transform: [
                {
                  translateY: Animated.subtract(sheetY, COLLAPSED_OFFSET),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Nút Dừng Chuyến Đi ở giữa màn hình (Chỉ Trưởng Đoàn) */}
          {isLeader && (
            <View style={styles.stopTripCenterWrap} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.stopTripFloatingBtn}
                onPress={handlePressStopTrip}
                activeOpacity={0.85}
              >
                <Ionicons name="stop-circle" size={17} color="#FFF" />
                <Text style={styles.stopTripFloatingText}>Dừng trip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Spacer để giữ nút GPS luôn ở mép phải */}
          <View style={{ flex: 1 }} pointerEvents="none" />

          {/* Nút Dấu Chấm Nâu Định Vị GPS Bản Thân */}
          <TouchableOpacity
            style={styles.recenterGpsBtn}
            onPress={handleRecenterMap}
            activeOpacity={0.8}
            accessibilityLabel="Quay lại vị trí GPS hiện tại"
          >
            <View style={styles.recenterDotRing}>
              <View style={styles.recenterDotCore} />
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── BOTTOM SHEET THEO DÕI ĐỘI HÌNH ── */}
      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: sheetY }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={handleToggleSheet}
          activeOpacity={0.7}
          style={{ width: '100%', alignItems: 'center', paddingVertical: 6 }}
        >
          <View style={styles.dragHandle} />
        </TouchableOpacity>

        <View style={styles.sheetHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              Đội hình ({trackedMembers.length} người)
            </Text>
            <Text style={styles.sheetSubtitle} numberOfLines={1} ellipsizeMode="tail">
              {realTrip?.name || 'Hành trình Road2D'} · Đang diễn ra
            </Text>
          </View>
          <View style={styles.signalSummary}>
            <Ionicons
              name={alertCount === 0 ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              size={14}
              color={alertCount === 0 ? colors.success : colors.warning}
            />
            <Text
              style={[
                styles.signalText,
                { color: alertCount === 0 ? colors.success : colors.warning },
              ]}
              numberOfLines={1}
            >
              {alertCount === 0 ? 'Tín hiệu ổn định' : `${alertCount} cảnh báo`}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` as any }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressTextTraveled} numberOfLines={1}>
              Đã đi: {currentTraveled.toFixed(1)} km
            </Text>
            <Text
              style={styles.progressTextDest}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Đích đến: {destinationCoord.name} ({totalDist} km)
            </Text>
          </View>
        </View>

        {/* Member Scroll List */}
        <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false} bounces={false}>
          {trackedMembers.map((m) => (
            <MemberRow key={m.id} member={m} isMe={m.id === currentUserId || m.id === 'u1'} />
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Sheet Footer: Check-in trạm dừng (Chỉ Trưởng đoàn) */}
        <View style={styles.sheetFooter}>
          <TouchableOpacity style={styles.arriveBtn} onPress={handlePressCheckIn}>
            <Feather name="check-circle" size={17} color="#FFFFFF" />
            <Text style={styles.arriveBtnText}>Check-in trạm dừng</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── MODAL CẢNH BÁO LỆCH LỘ TRÌNH (MOCK FE GIÂY THỨ 10) ── */}
      <Modal visible={showOffRouteModal} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconWrap, { backgroundColor: '#FDF3E7' }]}>
              <Ionicons name="navigate-circle-outline" size={38} color="#CD8554" />
            </View>
            <Text style={styles.customModalTitle}>Phát hiện lệch lộ trình</Text>
            <Text style={styles.customModalMessage}>
              Hệ thống ghi nhận bạn đang di chuyển lệch khỏi tuyến đường chính của đoàn. Bạn có muốn nhận chỉ dẫn quay trở lại lộ trình chính không?
            </Text>
            <View style={styles.customModalBtnColumn}>
              <TouchableOpacity
                style={[styles.customModalPrimaryBtn, { backgroundColor: '#CD8554' }]}
                onPress={handleRerouteBackToMain}
                activeOpacity={0.85}
              >
                <Ionicons name="compass-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.customModalPrimaryBtnText}>Dẫn đường về tuyến gốc</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalSecondaryBtn}
                onPress={() => setShowOffRouteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.customModalSecondaryBtnText}>Tiếp tục đường hiện tại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CẢNH BÁO SẮP VÀO VÙNG MẤT SÓNG (GIÂY 20-21 HOẶC TÍN HIỆU YẾU) ── */}
      <Modal visible={showWeakSignalModal} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconWrap, { backgroundColor: '#FEF3C7' }]}>
              <MaterialCommunityIcons name="signal-cellular-1" size={38} color="#D97706" />
            </View>
            <Text style={styles.customModalTitle}>Sắp vào vùng mất sóng</Text>
            <Text style={styles.customModalMessage}>
              Tín hiệu mạng đang giảm dần và sắp mất kết nối hoàn toàn. Bạn có muốn dừng lại để tải trước bản đồ offline cho đoạn đường tiếp theo không?
            </Text>
            <View style={styles.customModalBtnColumn}>
              <TouchableOpacity
                style={[styles.customModalPrimaryBtn, { backgroundColor: '#D97706' }]}
                onPress={handleDownloadOfflineMap}
                disabled={isDownloadingOfflineMap}
                activeOpacity={0.85}
              >
                {isDownloadingOfflineMap ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.customModalPrimaryBtnText}>Tải bản đồ offline</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalSecondaryBtn}
                onPress={() => setShowWeakSignalModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.customModalSecondaryBtnText}>Để sau / Tiếp tục đi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL MẤT KẾT NỐI MÁY CHỦ (GIÂY THỨ 25 HOẶC MẤT SÓNG / DISCONNECT) ── */}
      <Modal visible={showDisconnectedModal} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <MaterialCommunityIcons name="cloud-off-outline" size={38} color="#E53935" />
            </View>
            <Text style={styles.customModalTitle}>Đã mất kết nối máy chủ</Text>
            <Text style={styles.customModalMessage}>
              Hệ thống không thể kết nối tới máy chủ (do mất sóng, thiết bị ngoại tuyến hoặc gián đoạn mạng). Bạn có muốn kích hoạt chế độ bản đồ offline để tiếp tục điều hướng không?
            </Text>
            <View style={styles.customModalBtnColumn}>
              <TouchableOpacity
                style={[styles.customModalPrimaryBtn, { backgroundColor: '#2E7D32' }]}
                onPress={handleActivateOfflineMap}
                activeOpacity={0.85}
              >
                <Ionicons name="map-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.customModalPrimaryBtnText}>Dùng bản đồ offline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalSecondaryBtn}
                onPress={() => {
                  setShowDisconnectedModal(false);
                  setReconnectTrigger((prev) => prev + 1);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.customModalSecondaryBtnText}>Thử kết nối lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHÚC MỪNG HOÀN THÀNH KHI TỚI ĐÍCH (<200M) ── */}
      <Modal visible={showCelebrationModal} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.celebrationModalBox}>
            <View style={styles.celebrationIconWrap}>
              <Ionicons name="flag-outline" size={42} color={colors.primary} />
            </View>
            <Text style={styles.celebrationTitle}>Đã đến điểm kết thúc</Text>
            <Text style={styles.celebrationSub}>
              Tất cả thành viên trong đoàn đã tới gần điểm đến an toàn ({destinationCoord.name}) với khoảng cách dưới 200m.
            </Text>
            <View style={styles.celebrationCard}>
              <Text style={styles.celebrationCardText}>
                Hành trình đã được đánh dấu là hoàn thành và lưu vào danh sách các chuyến đi đã đi của bạn.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.celebrationBtn}
              onPress={handleConfirmCompleteCelebration}
            >
              <Text style={styles.celebrationBtnText}>Về trang chủ</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── MODAL XÁC NHẬN DỪNG CHUYẾN ĐI GIỮA CHỪNG (CHỈ TRƯỞNG ĐOÀN) ── */}
      <Modal visible={showStopConfirmModal} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconWrap, { backgroundColor: '#FDECEA' }]}>
              <Ionicons name="stop-circle-outline" size={38} color="#C62828" />
            </View>
            <Text style={styles.customModalTitle}>Dừng chuyến đi</Text>
            <Text style={styles.customModalMessage}>
              Bạn có chắc chắn muốn kết thúc chuyến đi này không? Chuyến đi sẽ kết thúc ngay lập tức và được lưu vào danh sách chuyến đi đã đi.
            </Text>
            <View style={styles.customModalBtnColumn}>
              <TouchableOpacity
                style={[styles.customModalPrimaryBtn, { backgroundColor: '#C62828' }]}
                onPress={handleConfirmStopTrip}
              >
                <Text style={styles.customModalPrimaryBtnText}>Xác nhận dừng chuyến</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalSecondaryBtn}
                onPress={() => setShowStopConfirmModal(false)}
              >
                <Text style={styles.customModalSecondaryBtnText}>Tiếp tục hành trình</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL THÔNG BÁO CHẾ ĐỘ NGHỈ CHÂN (TỐI ƯU PIN & TẠM DỪNG CẢNH BÁO) ── */}
      <Modal visible={showStayConfirmModal} transparent animationType="fade">
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconWrap, { backgroundColor: '#FDF3E7' }]}>
              <Ionicons name="cafe-outline" size={38} color={colors.primary} />
            </View>
            <Text style={styles.customModalTitle}>Chế độ nghỉ chân</Text>
            <Text style={styles.customModalMessage}>
              Ở trạng thái nghỉ chân, các chức năng cảnh báo nguy hiểm và theo dõi sẽ tạm dừng để tối ưu hiệu năng pin cho thiết bị.
            </Text>
            <View style={styles.customModalBtnColumn}>
              <TouchableOpacity
                style={[styles.customModalPrimaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowStayConfirmModal(false);
                  handleToggleStayMode();
                }}
              >
                <Text style={styles.customModalPrimaryBtnText}>Bắt đầu nghỉ chân</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalSecondaryBtn}
                onPress={() => setShowStayConfirmModal(false)}
              >
                <Text style={styles.customModalSecondaryBtnText}>Tiếp tục đi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL CHECK-IN TRẠM DỪNG (CHỈ TRƯỞNG ĐOÀN ĐƯỢC CHECK-IN) ── */}
      <Modal visible={showCheckIn} transparent animationType="fade" onRequestClose={() => setShowCheckIn(false)}>
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle-outline" size={38} color="#2E7D32" />
            </View>
            <Text style={styles.customModalTitle}>Xác nhận đến trạm dừng</Text>
            <Text style={[styles.customModalTitle, { fontSize: 15, color: colors.primary, marginTop: -4, marginBottom: 8 }]}>
              {nextTargetCoord.name}
            </Text>
            <Text style={styles.customModalMessage}>
              Xác nhận cả đoàn đã có mặt an toàn tại trạm dừng này. Tiến độ chuyến đi sẽ được tự động ghi nhận cho tất cả thành viên.
            </Text>
            <View style={styles.customModalBtnColumn}>
              <TouchableOpacity
                style={[styles.customModalPrimaryBtn, { backgroundColor: '#2E7D32' }]}
                onPress={() => {
                  setShowCheckIn(false);
                  Alert.alert('Thành công', `Đã check-in thành công tại ${nextTargetCoord.name}!`);
                }}
              >
                <Text style={styles.customModalPrimaryBtnText}>Xác nhận đến trạm</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalSecondaryBtn}
                onPress={() => setShowCheckIn(false)}
              >
                <Text style={styles.customModalSecondaryBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL SOS KHẨN CẤP (MOCK FE) ── */}
      <Modal visible={showSosModal} transparent animationType="fade" onRequestClose={() => setShowSosModal(false)}>
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalBox}>
            <View style={[styles.customModalIconWrap, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="warning-outline" size={38} color="#D32F2F" />
            </View>
            <Text style={[styles.customModalTitle, { color: '#D32F2F' }]}>Yêu cầu khẩn cấp (SOS)</Text>
            <Text style={styles.customModalMessage}>
              Hệ thống sẽ phát tín hiệu khẩn cấp đến các thành viên trong đoàn và ghim biểu tượng SOS lên avatar của bạn.
            </Text>

            {/* Dropdown / Lựa chọn Loại sự cố */}
            <Text style={styles.sosSectionLabel}>SỰ CỐ GẶP PHẢI</Text>
            <View style={styles.sosOptionRow}>
              {['Hỏng xe', 'Tai nạn', 'Mất sóng', 'Vấn đề sức khoẻ', 'Khác'].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.sosOptionChip, sosType === reason && styles.sosOptionChipActive]}
                  onPress={() => setSosType(reason)}
                >
                  <Text style={[styles.sosOptionChipText, sosType === reason && styles.sosOptionChipTextActive]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ô nhập Lời nhắn */}
            <Text style={styles.sosSectionLabel}>LỜI NHẮN CHO ĐOÀN</Text>
            <TextInput
              style={styles.sosTextInput}
              placeholder="VD: Xe bị thủng lốp, cần hỗ trợ mượn bơm và miếng vá..."
              placeholderTextColor="#A0938C"
              value={sosNote}
              onChangeText={setSosNote}
              multiline
              numberOfLines={3}
            />

            <View style={styles.customModalBtnColumn}>
              <TouchableOpacity
                style={[styles.customModalPrimaryBtn, { backgroundColor: '#D32F2F' }]}
                disabled={isSosSending}
                onPress={handleSendSos}
              >
                {isSosSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.customModalPrimaryBtnText}>Phát tín hiệu SOS</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalSecondaryBtn}
                onPress={() => setShowSosModal(false)}
              >
                <Text style={styles.customModalSecondaryBtnText}>Huỷ bỏ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ------------------------------------------------------------------
// Styles Tuân Thủ Hệ Thống Thiết Kế Road2D (colors.ts)
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapOverlaySafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 0,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  liveStatusDotConnected: {
    backgroundColor: '#34A853',
  },
  liveStatusDotConnecting: {
    backgroundColor: colors.warning,
  },
  liveStatusDotError: {
    backgroundColor: colors.error,
  },
  liveStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  connectionErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
    marginHorizontal: 16,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  connectionErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '600',
  },
  retryConnectionBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  retryConnectionBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  errorScreenContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorScreenContent: {
    alignItems: 'center',
    maxWidth: 360,
  },
  errorScreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  errorScreenSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorScreenActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  errorScreenBackBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorScreenBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorScreenRetryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  errorScreenRetryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stayModeBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 18,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  stayModeBtnTopActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stayModeBtnTopText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stayModeBtnTopTextActive: {
    color: '#FFF',
  },
  subHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C62828', // Đỏ đậm sang trọng (Material Red 800)
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  stayModeBanner: {
    alignItems: 'center',
    marginTop: 8,
  },
  stayModeBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stayModeBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stayPrivacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  stayPrivacyToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },

  // ── Panel Tìm kiếm địa điểm nhanh ──
  searchFloatingPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 280,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 6,
  },
  searchBarCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  searchBarCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  searchPredList: {
    maxHeight: 210,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  searchPredItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0EAE4',
  },
  searchPredTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  searchPredSub: {
    fontSize: 11.5,
    color: colors.textSecondary,
  },

  // ── Button Xem đường đi tới điểm vừa tìm ──
  searchedRouteBtnRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  searchedRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3E2723', // Nâu espresso đậm làm nổi bật viền vàng
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: SCREEN_WIDTH * 0.88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: '#FFC107', // Viền vàng sáng đồng bộ màu tuyến phụ
  },
  searchedRouteBtnActive: {
    backgroundColor: '#26150F',
    borderColor: '#FFD54F',
  },
  searchedRouteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  searchedRouteSubText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD54F',
    marginTop: 2,
  },
  searchedRouteCloseBtn: {
    marginLeft: 8,
    padding: 2,
    flexShrink: 0,
  },
  nextStopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(54, 32, 24, 0.94)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    gap: 8,
    maxWidth: SCREEN_WIDTH * 0.74,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 84, 0.35)',
  },
  nextStopIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(205, 133, 84, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  nextStopTextCol: {
    flexShrink: 1,
    justifyContent: 'center',
  },
  nextStopLabel: {
    fontSize: 8.5,
    color: '#D4B8A5',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  nextStopName: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  nextStopDistBadge: {
    backgroundColor: 'rgba(205, 133, 84, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(205, 133, 84, 0.45)',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStopDistValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFDEBD',
    letterSpacing: 0.2,
  },
  listOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 60 : 70,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listOverlayTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  floatingActionRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: SHEET_COLLAPSED_HEIGHT + 14,
    zIndex: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
  },
  stopTripCenterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopTripFloatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C62828', // Đỏ đậm cùng tone với SOS
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  stopTripFloatingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  recenterGpsBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8D0BC',
    shadowColor: '#5D3A29',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 6,
  },
  recenterDotRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recenterDotCore: {
    width: 8.5,
    height: 8.5,
    borderRadius: 4.25,
    backgroundColor: colors.primary,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_EXPANDED_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  signalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: colors.cardBg,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressTextTraveled: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    flexShrink: 0,
  },
  progressTextDest: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  memberList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  leaderBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 1,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  memberSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 54,
  },
  signalBarsWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
  },
  signalBar: {
    width: 3,
    borderRadius: 1,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  batteryText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  arriveBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  arriveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modals Styling
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  customModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  customModalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  customModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  customModalMessage: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  customModalPrimaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalPrimaryBtnText: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  customModalBtnColumn: {
    width: '100%',
    gap: 10,
  },
  customModalSecondaryBtn: {
    backgroundColor: colors.cardBg,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customModalSecondaryBtnText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Celebration Modal
  celebrationModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  celebrationIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  celebrationTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  celebrationSub: {
    fontSize: 13.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
  },
  celebrationCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
    width: '100%',
  },
  celebrationCardText: {
    fontSize: 12.5,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 17,
  },
  celebrationBtn: {
    backgroundColor: colors.primary,
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // SOS Modal Styles
  sosSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    alignSelf: 'flex-start',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sosOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  sosOptionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0D5CC',
    backgroundColor: '#FAF7F5',
  },
  sosOptionChipActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
  },
  sosOptionChipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#5D3A29',
  },
  sosOptionChipTextActive: {
    color: '#D32F2F',
    fontWeight: '700',
  },
  sosTextInput: {
    width: '100%',
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#E0D5CC',
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: '#3E2723',
    backgroundColor: '#FAF7F5',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
});

export default LiveTrackingScreen;
