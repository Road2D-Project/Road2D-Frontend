import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goongMapService } from '../../services/api/goongMapService';
// @ts-ignore
const polyline: any = require('@mapbox/polyline');

import {
  MOCK_TRIP,
  STATUS_COLORS,
  type TrackingMember,
  type MemberStatus,
} from '../../data/mockTrackingData';
import { useSimulationStore } from '../../store/useSimulationStore';
import { SimulationEngine } from '../../utils/SimulationEngine';
import { useTripStore } from '../../store/useTripStore';
import { useAuthStore } from '../../store/useAuthStore';
import tripService from '../../services/api/tripService';
import tokenStorage from '../../services/storage/tokenStorage';
import { API_BASE_URL } from '../../config/env';
import { colors } from '../../theme/colors';
import type { Trip } from '../../types';
import { SharedGoongMap, MapWaypoint, MapMember } from '../../components/map/SharedGoongMap';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const SHEET_COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.40;
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
      return <Ionicons name="navigate-circle-outline" size={16} color={colors.warning} />;
    case 'no_signal':
      return <MaterialCommunityIcons name="signal-off" size={16} color={colors.textSecondary} />;
    case 'lost_and_no_signal':
      return <MaterialCommunityIcons name="alert-circle-outline" size={16} color={colors.error} />;
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

  // Chế độ: 'simulation' (Mô phỏng) hoặc 'gps' (GPS thật)
  const [trackingMode, setTrackingMode] = useState<'simulation' | 'gps'>('simulation');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trackedMembers, setTrackedMembers] = useState<TrackingMember[]>([]);

  // Trạng thái nghỉ chân / Stay mode từ module/tracking/model/message
  const [isStayMode, setIsStayMode] = useState(false);
  const [isStayPublic, setIsStayPublic] = useState(true);

  // Popup chúc mừng hoàn thành khi bán kính < 200m
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  // Xác nhận dừng chuyến đi giữa chừng (Chỉ trưởng đoàn)
  const [showStopConfirmModal, setShowStopConfirmModal] = useState(false);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showCheckIn, setShowCheckIn] = useState(false);

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

  // Cập nhật pin và sóng của chính mình trong danh sách đoàn
  useEffect(() => {
    if (currentUserId) {
      setTrackedMembers((prev) =>
        prev.map((m) =>
          m.id.toLowerCase() === currentUserId.toLowerCase() || m.id === 'u1'
            ? { ...m, battery: deviceBattery, signal: deviceSignal }
            : m
        )
      );
    }
  }, [currentUserId, deviceBattery, deviceSignal]);

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
            try {
              const cachedStr = await AsyncStorage.getItem(`trip_route_${tripId}`);
              if (cachedStr) {
                const parsed = JSON.parse(cachedStr);
                tripRoute = parsed;
                waypoints = parsed.waypoints || [];
                polylineCoords = parsed.polylineCoords || [];
                (data as any).route = parsed;
                (data as any).waypoints = waypoints;
                (data as any).polylineCoords = polylineCoords;
              }
            } catch { }
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

                      AsyncStorage.setItem(
                        `trip_route_${tripId}`,
                        JSON.stringify({
                          origin: d1,
                          destination: d2,
                          waypoints,
                          polylineCoords,
                          legs: [leg],
                        })
                      ).catch(() => { });
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

  // Decode lộ trình thật nếu có
  const routePolylineCoords = useMemo(() => {
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
  }, [realTrip]);

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

  // ── Bottom Sheet Gesture ───────────────────────────────────────────────────
  const COLLAPSED_OFFSET = SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT;
  const sheetY = useRef(new Animated.Value(COLLAPSED_OFFSET)).current;
  const isExpanded = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        const baseY = isExpanded.current ? 0 : COLLAPSED_OFFSET;
        const next = baseY + g.dy;
        sheetY.setValue(Math.max(0, Math.min(COLLAPSED_OFFSET, next)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -60 && !isExpanded.current) {
          Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
          isExpanded.current = true;
        } else if (g.dy > 60 && isExpanded.current) {
          Animated.spring(sheetY, { toValue: COLLAPSED_OFFSET, useNativeDriver: true }).start();
          isExpanded.current = false;
        } else {
          Animated.spring(sheetY, {
            toValue: isExpanded.current ? 0 : COLLAPSED_OFFSET,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ── WebSocket Connection theo module/tracking/model/message ────────────────
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!tripId) return;
    let ws: WebSocket | null = null;
    let isCancelled = false;

    const connectWs = async () => {
      try {
        const token = await tokenStorage.getAccessToken();
        const wsHost = API_BASE_URL.replace(/^http/, 'ws').replace(/\/v1\/?$/, '');
        // Backend LiftAccessToken.go yêu cầu param ?access_token=
        const wsUrl = `${wsHost}/v1/realtime/rooms/${tripId}${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[LiveTracking] WebSocket room connected:', tripId);
        };

        ws.onmessage = (event) => {
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

                  // Bỏ qua toạ độ của chính mình từ socket vì đã do GPS/Mô phỏng phát cục bộ
                  if (currentUserId && pId === currentUserId.toLowerCase()) continue;

                  const idx = updated.findIndex((m) => m.id.toLowerCase() === pId);
                  const isDeviated = p.DriveStatus === 'DEVIATED';
                  const isDisconnected = p.ConnectionStatus === 'DISCONNECTED';
                  const newStatus: MemberStatus = isDeviated ? 'lost' : isDisconnected ? 'no_signal' : 'normal';

                  if (idx >= 0) {
                    updated[idx] = {
                      ...updated[idx],
                      lngLat: [lng, lat],
                      status: newStatus,
                    };
                  } else {
                    updated.push({
                      id: p.UserId || p.userId,
                      name: p.Nickname || p.nickname || 'Thành viên',
                      avatar: '',
                      role: 'member',
                      status: newStatus,
                      lngLat: [lng, lat],
                      speed: 40,
                      battery: 90,
                      distanceToLeader: 0.5,
                      signal: 4,
                      locationDesc: 'Đang di chuyển trên lộ trình',
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

        ws.onerror = (e) => {
          console.log('[LiveTracking] WebSocket notice:', (e as any)?.message || 'connection retry');
        };

        ws.onclose = () => {
          console.log('[LiveTracking] WebSocket closed room:', tripId);
        };
      } catch (e) {
        console.warn('[LiveTracking] WS connect error:', e);
      }
    };

    connectWs();

    return () => {
      isCancelled = true;
      if (ws) ws.close();
    };
  }, [tripId]);

  // Gửi thông điệp toạ độ lên WebSocket (module/tracking/model/message/PositionMessage.go)
  const sendPositionWs = useCallback((lat: number, lng: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'tracking.position',
          payload: {
            Lat: lat,
            Lng: lng,
            Battery: deviceBattery,
            Signal: deviceSignal,
          },
        })
      );
    }
  }, [deviceBattery, deviceSignal]);

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

  // ── Simulation Engine ─────────────────────────────────────────────────────
  const engineRef = useRef<SimulationEngine | null>(null);
  const webViewRef = useRef<WebView>(null);
  const startSim = useSimulationStore((s) => s.start);
  const stopSim = useSimulationStore((s) => s.stop);
  const currentPosition = useSimulationStore((s) => s.currentPosition);
  const traveledKm = useSimulationStore((s) => s.traveledKm);

  useEffect(() => {
    if (trackingMode === 'simulation') {
      engineRef.current = new SimulationEngine(routePolylineCoords as any);
      startSim(tripId || 'mock_trip');
      engineRef.current.start();
    } else {
      engineRef.current?.stop();
      stopSim();
    }

    return () => {
      engineRef.current?.stop();
      stopSim();
    };
  }, [trackingMode, routePolylineCoords, tripId, startSim, stopSim]);

  // Cập nhật vị trí mô phỏng lên bản đồ & gửi WebSocket
  useEffect(() => {
    if (trackingMode === 'simulation' && currentPosition && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'UPDATE_POSITION',
          id: currentUserId || 'u1',
          lat: currentPosition.latitude,
          lng: currentPosition.longitude,
          isMe: true,
        })
      );
      sendPositionWs(currentPosition.latitude, currentPosition.longitude);
      checkArrivalCondition(currentPosition.latitude, currentPosition.longitude, trackedMembers);
    }
  }, [trackingMode, currentPosition, checkArrivalCondition, currentUserId, trackedMembers, sendPositionWs]);

  // ── GPS Thật với expo-location ────────────────────────────────────────────
  useEffect(() => {
    let locSub: Location.LocationSubscription | null = null;

    if (trackingMode === 'gps') {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Quyền vị trí bị từ chối',
            'Ứng dụng cần quyền GPS để cập nhật vị trí trực tiếp. Hệ thống sẽ tự động chuyển sang chế độ mô phỏng.'
          );
          setTrackingMode('simulation');
          return;
        }

        locSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          (loc) => {
            const { latitude, longitude } = loc.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            // Tích luỹ quãng đường cá nhân của người dùng đang cầm máy khi đi GPS thật
            if (prevGpsCoordRef.current) {
              const deltaM = getDistanceMeters(
                prevGpsCoordRef.current.lat,
                prevGpsCoordRef.current.lng,
                latitude,
                longitude
              );
              // Lọc các rung lắc GPS nhỏ dưới 3m hoặc đột biến lớn > 3km
              if (deltaM >= 3 && deltaM < 3000) {
                setGpsTraveledKm((prev) => prev + deltaM / 1000);
              }
            }
            prevGpsCoordRef.current = { lat: latitude, lng: longitude };

            // Gửi toạ độ lên WebView map
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

            // Kiểm tra bán kính 200m tới đích
            checkArrivalCondition(latitude, longitude, trackedMembers);
          }
        );
      })();
    }

    return () => {
      locSub?.remove();
    };
  }, [trackingMode, checkArrivalCondition, currentUserId, trackedMembers, sendPositionWs]);

  // ── Quay lại vị trí GPS hiện tại của bản thân trên bản đồ ─────────────────
  const handleRecenterMap = useCallback(() => {
    let targetLat: number | null = null;
    let targetLng: number | null = null;

    if (trackingMode === 'simulation' && currentPosition) {
      targetLat = currentPosition.latitude;
      targetLng = currentPosition.longitude;
    } else if (userLocation) {
      targetLat = userLocation.lat;
      targetLng = userLocation.lng;
    } else {
      const me = trackedMembers.find(
        (m) => (currentUserId && m.id.toLowerCase() === currentUserId.toLowerCase()) || m.id === 'u1'
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
  }, [trackingMode, currentPosition, userLocation, trackedMembers, currentUserId, routePolylineCoords]);

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

  // Waypoints cho GoongMap
  const mapWaypoints: MapWaypoint[] = useMemo(() => {
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
  }, [realTrip]);

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
  // Quãng đường đã đi tính riêng cho cá nhân người dùng hiện tại (Simulation hoặc GPS thật)
  const personalTraveledKm = trackingMode === 'simulation' ? traveledKm : gpsTraveledKm;
  const currentTraveled = personalTraveledKm > 0 ? personalTraveledKm : 0;
  const progressPct = Math.min(100, Math.round((currentTraveled / (totalDist || 1)) * 100));

  // Điểm đến tiếp theo (Trạm dừng kế tiếp hoặc Đích cuối cùng)
  const nextTargetCoord = useMemo(() => {
    const waypoints: any[] = (realTrip as any)?.waypoints || (realTrip as any)?.route?.waypoints || [];
    if (waypoints.length > 1) {
      let myLat: number | null = null;
      let myLng: number | null = null;
      if (trackingMode === 'simulation' && currentPosition) {
        myLat = currentPosition.latitude;
        myLng = currentPosition.longitude;
      } else if (userLocation) {
        myLat = userLocation.lat;
        myLng = userLocation.lng;
      }

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
  }, [realTrip, trackingMode, currentPosition, userLocation]);

  // Khoảng cách còn lại đến điểm đến tiếp theo
  const remainingDistanceKm = useMemo(() => {
    let myLat: number | null = null;
    let myLng: number | null = null;

    if (trackingMode === 'simulation' && currentPosition) {
      myLat = currentPosition.latitude;
      myLng = currentPosition.longitude;
    } else if (userLocation) {
      myLat = userLocation.lat;
      myLng = userLocation.lng;
    } else {
      const me = trackedMembers.find(
        (m) => (currentUserId && m.id.toLowerCase() === currentUserId.toLowerCase()) || m.id === 'u1'
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
  }, [trackingMode, currentPosition, userLocation, trackedMembers, currentUserId, nextTargetCoord, totalDist, currentTraveled]);

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
          members={mapMembers}
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

            {/* Chế độ GPS thật vs Mô phỏng */}
            <View style={styles.modeToggleGroup}>
              <TouchableOpacity
                style={[styles.modeToggleBtn, trackingMode === 'gps' && styles.modeToggleBtnActive]}
                onPress={() => setTrackingMode('gps')}
              >
                <Ionicons
                  name="navigate-outline"
                  size={13}
                  color={trackingMode === 'gps' ? '#FFF' : colors.textPrimary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.modeToggleText, trackingMode === 'gps' && styles.modeToggleTextActive]}>
                  GPS
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeToggleBtn, trackingMode === 'simulation' && styles.modeToggleBtnActive]}
                onPress={() => setTrackingMode('simulation')}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={13}
                  color={trackingMode === 'simulation' ? '#FFF' : colors.textPrimary}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.modeToggleText, trackingMode === 'simulation' && styles.modeToggleTextActive]}>
                  Mô phỏng
                </Text>
              </TouchableOpacity>
            </View>

            {/* Nút Nghỉ Chân (Chỉ Trưởng Đoàn) bay lên thay thế Dừng Trip */}
            {isLeader ? (
              <TouchableOpacity
                style={[styles.stayModeBtnTop, isStayMode && styles.stayModeBtnTopActive]}
                onPress={handleToggleStayMode}
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

          {/* Sub Header: SOS + List toggle */}
          <View style={styles.subHeaderRow} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.sosButton}
              onPress={() =>
                Alert.alert(
                  'SOS Khẩn Cấp',
                  'Hệ thống đang phát tín hiệu cảnh báo đến các thành viên trong đoàn.',
                  [{ text: 'Đã hiểu' }]
                )
              }
            >
              <Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            >
              <Ionicons
                name={viewMode === 'map' ? 'list-outline' : 'map-outline'}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

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
        <View style={styles.dragHandle} />

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

        {/* Sheet Footer: Check-in trạm dừng */}
        <View style={styles.sheetFooter}>
          <TouchableOpacity style={styles.arriveBtn} onPress={() => setShowCheckIn(true)}>
            <Feather name="check-circle" size={17} color="#FFFFFF" />
            <Text style={styles.arriveBtnText}>Check-in trạm dừng</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

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

      {/* ── MODAL CHECK-IN TRẠM DỪNG ── */}
      {showCheckIn && (
        <View style={styles.checkInOverlay}>
          <View style={styles.checkInCard}>
            <View style={styles.checkInIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
            </View>
            <Text style={styles.checkInTitle}>Check-in trạm dừng</Text>
            <Text style={styles.checkInName}>{destinationCoord.name}</Text>
            <Text style={styles.checkInDesc}>
              Xác nhận bạn đã có mặt tại trạm dừng an toàn cùng các thành viên trong đoàn.
            </Text>
            <TouchableOpacity style={styles.checkInBtn} onPress={() => setShowCheckIn(false)}>
              <Text style={styles.checkInBtnText}>Xác nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCheckIn(false)}>
              <Text style={styles.checkInCancel}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
  modeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeToggleBtnActive: {
    backgroundColor: colors.primary,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modeToggleTextActive: {
    color: '#FFF',
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

  // Check-in Overlay
  checkInOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginHorizontal: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  checkInIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  checkInName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
  },
  checkInDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  checkInBtn: {
    backgroundColor: colors.primary,
    width: '100%',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  checkInCancel: {
    fontSize: 13.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});

export default LiveTrackingScreen;
