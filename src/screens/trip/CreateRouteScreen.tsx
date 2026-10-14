/**
 * CreateRouteScreen.tsx
 *
 * Phase 0 — Chọn Điểm Đầu & Điểm Cuối (search Goong Autocomplete qua Backend)
 * Phase 1 — Thêm Điểm Dừng giữa (tuỳ chọn)
 * Phase 2 — Xem lộ trình thật (gọi GET /v1/goong/directions qua Backend)
 *
 * Bản đồ:
 *   - Sử dụng SharedGoongMap chuẩn tông màu nâu đậm sang trọng, đồng bộ thương hiệu Road2D.
 *   - Gọi API qua backend proxy với X-Playground-Key để bảo vệ an toàn GOONG_REST_KEY.
 */

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  Easing,
  Modal,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { CreateRouteScreenNavigationProp } from '../../types/navigation';
import { SharedGoongMap, MapWaypoint } from '../../components/map/SharedGoongMap';
import {
  goongMapService,
  PlacePrediction,
  PlaceDetail,
  RouteLegResult,
  decodePolyline,
} from '../../services/api/goongMapService';
import planningService, { RoutePreviewSummary } from '../../services/api/planningService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Chiều cao map khi bàn phím đóng: vừa vặn để hiện đủ cả 2 ô Xuất phát & Điểm đến mà không cần cuộn
const NORMAL_MAP_HEIGHT = Math.min(Math.max(Math.round(SCREEN_HEIGHT * 0.38), 240), 315);
// Chiều cao map khi bàn phím mở: co lại 140px để panel trồi lên trên bàn phím
const KEYBOARD_MAP_HEIGHT = 140;

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
  danger: '#FF5252',
  mapBg: '#241810',
  mapDark: '#1A110B',
};

type Waypoint = PlaceDetail;
export interface StopWaypoint extends PlaceDetail {
  stayMinutes: number;
}
type RouteLeg = RouteLegResult;
type Phase = 0 | 1;

// ─── Search Box Component ─────────────────────────────────────────────────────
interface SearchBoxProps {
  placeholder: string;
  dotColor: string;
  value: Waypoint | null;
  onSelect: (wp: Waypoint) => void;
  onClear: () => void;
  biasLocation?: string;
  onFocus?: () => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder,
  dotColor,
  value,
  onSelect,
  onClear,
  biasLocation,
  onFocus,
}) => {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || text.trim().length < 2) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const results = await goongMapService.searchPlaces(text, biasLocation);
      setPredictions(results);
      setLoading(false);
    }, 400);
  };

  const handleSelect = async (pred: PlacePrediction) => {
    setLoading(true);
    Keyboard.dismiss();
    setFocused(false);
    const detail = await goongMapService.getPlaceDetail(pred.place_id);
    setLoading(false);
    if (!detail) return;
    setPredictions([]);
    setQuery('');
    onSelect(detail);
  };

  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setFocused(false);
    onClear();
  };

  if (value) {
    return (
      <View style={sb.selectedRow}>
        <View style={[sb.dot, { backgroundColor: dotColor }]} />
        <View style={sb.selectedText}>
          <Text style={sb.selectedName} numberOfLines={1} ellipsizeMode="tail">
            {value.name}
          </Text>
          <Text style={sb.selectedAddr} numberOfLines={1} ellipsizeMode="tail">
            {value.address}
          </Text>
        </View>
        <TouchableOpacity
          style={sb.clearBtn}
          onPress={handleClear}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color={C.heading} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ width: '100%' }}>
      <View style={[sb.inputRow, focused && sb.inputRowFocused]}>
        <View style={[sb.dot, { backgroundColor: dotColor }]} />
        <TextInput
          style={sb.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={C.border}
          multiline={false}
          numberOfLines={1}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            if (!predictions.length) setFocused(false);
          }}
          returnKeyType="search"
        />
        {loading ? (
          <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 6 }} />
        ) : query.length > 0 ? (
          <TouchableOpacity
            style={sb.inputClearBtn}
            onPress={() => {
              setQuery('');
              setPredictions([]);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={C.sub} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Dropdown gợi ý render bên dưới input */}
      {predictions.length > 0 && (
        <View style={sb.dropdown}>
          <ScrollView
            style={{ maxHeight: 200 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {predictions.map((p) => (
              <TouchableOpacity
                key={p.place_id}
                style={sb.predItem}
                onPress={() => handleSelect(p)}
              >
                <Ionicons
                  name="location-outline"
                  size={15}
                  color={C.primary}
                  style={{ flexShrink: 0, marginRight: 8 }}
                />
                <View style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Text style={sb.predName} numberOfLines={1} ellipsizeMode="tail">
                    {p.structured_formatting?.main_text ?? p.description.split(',')[0]}
                  </Text>
                  <Text style={sb.predAddr} numberOfLines={1} ellipsizeMode="tail">
                    {p.structured_formatting?.secondary_text ??
                      p.description.split(',').slice(1).join(',').trim()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const sb = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    minHeight: 46,
    marginBottom: 6,
    overflow: 'hidden',
  },
  inputRowFocused: {
    borderColor: C.primary,
    backgroundColor: '#FFFFFF',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 0,
    paddingHorizontal: 0,
    height: 44,
    textAlignVertical: 'center',
    minWidth: 0,
  },
  inputClearBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    flexShrink: 0,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F3EE',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
    marginBottom: 6,
    overflow: 'hidden',
  },
  selectedText: {
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
    minWidth: 0,
    overflow: 'hidden',
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAE1D7',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.heading,
    flexShrink: 1,
  },
  selectedAddr: {
    fontSize: 11,
    color: C.sub,
    marginTop: 1,
    flexShrink: 1,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  predItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE9',
    overflow: 'hidden',
  },
  predName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.heading,
    flexShrink: 1,
  },
  predAddr: {
    fontSize: 11,
    color: C.sub,
    marginTop: 1,
    flexShrink: 1,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const CreateRouteScreen: React.FC = () => {
  const navigation = useNavigation<CreateRouteScreenNavigationProp>();
  const webviewRef = useRef<WebView>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [phase, setPhase] = useState<Phase>(0);
  const [origin, setOrigin] = useState<Waypoint | null>(null);
  const [destination, setDestination] = useState<Waypoint | null>(null);
  const [stops, setStops] = useState<StopWaypoint[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const mapHeightAnim = useRef(new Animated.Value(NORMAL_MAP_HEIGHT)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
      Animated.timing(mapHeightAnim, {
        toValue: KEYBOARD_MAP_HEIGHT,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      Animated.timing(mapHeightAnim, {
        toValue: NORMAL_MAP_HEIGHT,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Stop search state
  const [stopQuery, setStopQuery] = useState('');
  const [stopPreds, setStopPreds] = useState<PlacePrediction[]>([]);
  const [stopLoading, setStopLoading] = useState(false);
  const stopDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Routing
  const [legs, setLegs] = useState<RouteLeg[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);

  // Preview route via planning API (v1/planning/review / preview)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<RoutePreviewSummary | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const allWaypoints: Waypoint[] = useMemo(() => [
    ...(origin ? [origin] : []),
    ...stops,
    ...(destination ? [destination] : []),
  ], [origin, stops, destination]);

  const canProceed = !!origin && !!destination;

  // Chuyển waypoints sang format của SharedGoongMap
  const mapWaypoints: MapWaypoint[] = useMemo(() => {
    return allWaypoints.map((wp, i) => {
      const isFirst = i === 0;
      const isLast = i === allWaypoints.length - 1 && allWaypoints.length > 1;
      return {
        id: wp.place_id,
        name: wp.name,
        lat: wp.lat,
        lng: wp.lng,
        label: isFirst ? 'Điểm xuất phát' : isLast ? 'Điểm đến' : `Trạm ${i}`,
        type: isFirst ? 'start' : isLast ? 'end' : 'stop',
      };
    });
  }, [allWaypoints]);

  // Danh sách toạ độ tuyến đường
  const routeCoords = useMemo(() => {
    return legs.flatMap((l) => l.coords);
  }, [legs]);

  // ── Stop search ──
  const handleStopQuery = useCallback(
    (text: string) => {
      setStopQuery(text);
      if (stopDebounceRef.current) clearTimeout(stopDebounceRef.current);
      if (!text.trim() || text.trim().length < 2) {
        setStopPreds([]);
        return;
      }
      stopDebounceRef.current = setTimeout(async () => {
        setStopLoading(true);
        const bias = origin ? `${origin.lat},${origin.lng}` : undefined;
        const results = await goongMapService.searchPlaces(text, bias);
        setStopPreds(results);
        setStopLoading(false);
      }, 400);
    },
    [origin]
  );

  const addStop = useCallback(async (pred: PlacePrediction) => {
    setStopLoading(true);
    Keyboard.dismiss();
    const detail = await goongMapService.getPlaceDetail(pred.place_id);
    setStopLoading(false);
    if (!detail) return;
    setStops((prev) => [...prev, { ...detail, stayMinutes: 15 }]);
    setStopQuery('');
    setStopPreds([]);
  }, []);

  const updateStopStay = useCallback((index: number, minutes: number) => {
    setStops((prev) =>
      prev.map((s, i) => (i === index ? { ...s, stayMinutes: Math.max(0, minutes) } : s))
    );
  }, []);

  const fmtDistance = (m: number) =>
    m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

  const fmtDuration = (s: number) => {
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} phút`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h} giờ ${m > 0 ? `${m}p` : ''}`;
  };

  // ── Xem trước đường đi (gọi API v1/planning/review) ──
  const handlePreviewRoute = useCallback(async () => {
    if (!origin || !destination) {
      Alert.alert(
        'Chưa đủ điểm',
        'Vui lòng chọn cả điểm xuất phát và điểm đến để xem trước đường đi.'
      );
      return;
    }
    setIsPreviewLoading(true);
    try {
      const summary = await planningService.previewRouteFromWaypoints([origin, destination]);
      setPreviewSummary(summary);
      if (summary.legs && summary.legs.length > 0) {
        setLegs(
          summary.legs.map((l) => ({
            coords: l.polyline ? decodePolyline(l.polyline) : [],
            distanceM: l.distanceM,
            durationS: l.durationS,
          }))
        );
      }
      setShowPreviewModal(true);
    } catch (err: any) {
      // Fallback gọi Goong directions nếu backend location catalog chưa có place
      try {
        const leg = await goongMapService.getDirections(
          { lat: origin.lat, lng: origin.lng },
          { lat: destination.lat, lng: destination.lng },
          'bike'
        );
        if (leg) {
          setLegs([leg]);
          setPreviewSummary({
            locations: [
              { locationId: 'origin', name: origin.name, lat: origin.lat, lng: origin.lng },
              { locationId: 'dest', name: destination.name, lat: destination.lat, lng: destination.lng },
            ],
            legs: [
              {
                from: { name: origin.name, stayOverTime: 0 },
                to: { name: destination.name, stayOverTime: 0 },
                vehicle: 'bike',
                polyline: '',
                distanceM: leg.distanceM,
                durationS: leg.durationS,
              },
            ],
            totalDistanceM: leg.distanceM,
            totalDurationS: leg.durationS,
            distanceFormatted: fmtDistance(leg.distanceM),
            durationFormatted: fmtDuration(leg.durationS),
            polylineCoords: leg.coords,
            raw: {} as any,
          });
          setShowPreviewModal(true);
          return;
        }
      } catch {
        // ignore fallback error
      }

      Alert.alert(
        'Lỗi xem trước',
        err?.response?.data?.message || err?.message || 'Không thể xem trước đường đi vào lúc này.'
      );
    } finally {
      setIsPreviewLoading(false);
    }
  }, [origin, destination]);

  // ── Tính toán lộ trình và quay trở lại CreateTripScreen ──
  const fetchRouteAndFinish = useCallback(async () => {
    setRouteLoading(true);
    setLegs([]);
    const pts = allWaypoints;
    const results: RouteLeg[] = [];

    let hasError = false;
    for (let i = 0; i < pts.length - 1; i++) {
      const leg = await goongMapService.getDirections(
        { lat: pts[i].lat, lng: pts[i].lng },
        { lat: pts[i + 1].lat, lng: pts[i + 1].lng },
        'bike'
      );
      if (!leg) {
        hasError = true;
      }
      results.push(
        leg ?? {
          coords: [
            [pts[i].lng, pts[i].lat],
            [pts[i + 1].lng, pts[i + 1].lat],
          ],
          distanceM: 0,
          durationS: 0,
        }
      );
    }

    setLegs(results);
    setRouteLoading(false);

    if (hasError) {
      Alert.alert(
        'Lưu ý lộ trình',
        'Có chặng đường chưa tải được điều hướng chi tiết. Hệ thống sẽ kết nối đường thẳng trên bản đồ.'
      );
    }

    const totalDist = results.reduce((s, l) => s + l.distanceM, 0);
    const travelDurationS = results.reduce((s, l) => s + l.durationS, 0);
    const restDurationMinutes = stops.reduce((s, st) => s + (st.stayMinutes || 15), 0);
    const totalDurationS = travelDurationS + restDurationMinutes * 60;

    const customRoute = {
      id: 'route_' + Date.now(),
      name: `${origin?.name} → ${destination?.name}`,
      distance: fmtDistance(totalDist),
      distanceM: totalDist,
      travelDurationS,
      travelDurationFormatted: fmtDuration(travelDurationS),
      restDurationMinutes,
      totalDurationS,
      duration: fmtDuration(totalDurationS),
      stopsCount: stops.length,
      image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600',
      origin,
      destination,
      stops: stops.map((s, idx) => ({
        ...s,
        order: idx + 1,
        stayMinutes: s.stayMinutes || 15,
      })),
      waypoints: allWaypoints,
      legs: results,
      polylineCoords: results.flatMap((l) => l.coords),
    };

    (navigation as any).navigate('CreateTrip', { customRoute });
  }, [allWaypoints, origin, destination, stops, navigation]);

  // ── CTA Helpers ──
  const getCtaLabel = () => {
    if (phase === 0) return canProceed ? 'Tiếp theo: Thêm điểm dừng' : 'Chọn điểm đầu & điểm đến';
    return routeLoading ? 'Đang tính lộ trình...' : 'Xong & Xem lộ trình';
  };

  const ctaDisabled = (phase === 0 && !canProceed) || routeLoading;

  const handleCta = () => {
    if (phase === 0 && canProceed) {
      setPhase(1);
    } else if (phase === 1 && !routeLoading) {
      fetchRouteAndFinish();
    }
  };

  // ── Phase panels ──
  const renderPhase0 = () => (
    <View style={styles.panel}>
      <Text style={styles.panelLabel}>ĐIỂM XUẤT PHÁT</Text>
      <SearchBox
        placeholder="Tìm điểm xuất phát..."
        dotColor={C.success}
        value={origin}
        onSelect={setOrigin}
        onClear={() => setOrigin(null)}
        onFocus={() => {
          setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
        }}
      />
      <View style={styles.divLine} />
      <Text style={styles.panelLabel}>ĐIỂM ĐẾN</Text>
      <SearchBox
        placeholder="Tìm điểm đến..."
        dotColor={C.danger}
        value={destination}
        onSelect={setDestination}
        onClear={() => setDestination(null)}
        biasLocation={origin ? `${origin.lat},${origin.lng}` : undefined}
        onFocus={() => {
          setTimeout(() => {
            scrollRef.current?.scrollTo({ y: 75, animated: true });
          }, 100);
        }}
      />
      {/* Nút Xem trước đường đi (gọi API v1/planning/review) */}
      <TouchableOpacity
        style={[
          styles.previewRouteBtn,
          (!origin || !destination) && styles.previewRouteBtnDisabled,
        ]}
        onPress={handlePreviewRoute}
        disabled={isPreviewLoading}
        activeOpacity={0.8}
      >
        {isPreviewLoading ? (
          <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
        ) : (
          <Ionicons name="map-outline" size={17} color="#FFF" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.previewRouteBtnText}>
          {isPreviewLoading ? 'Đang tính đường đi...' : 'Xem trước đường đi'}
        </Text>
      </TouchableOpacity>

      {!canProceed && (
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={15} color={C.sub} />
          <Text style={styles.hintText}>Chọn đủ điểm đầu và điểm cuối để xem trước hoặc tiếp tục</Text>
        </View>
      )}
    </View>
  );

  const renderPhase1 = () => (
    <View style={styles.panel}>
      {/* Summary */}
      <View style={styles.routeSummary}>
        <View style={[styles.chip, { backgroundColor: '#E8F5E9' }]}>
          <View style={[styles.chipDot, { backgroundColor: C.success }]} />
          <Text
            style={[styles.chipText, { color: '#2E7D32' }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {origin?.name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={C.sub} style={{ flexShrink: 0 }} />
        <View style={[styles.chip, { backgroundColor: '#FFEBEE' }]}>
          <View style={[styles.chipDot, { backgroundColor: C.danger }]} />
          <Text
            style={[styles.chipText, { color: '#C62828' }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {destination?.name}
          </Text>
        </View>
      </View>

      <Text style={styles.panelLabel}>ĐIỂM DỪNG DỌC ĐƯỜNG (TUỲ CHỌN)</Text>
      <Text style={styles.panelHint}>
        💡 Thêm các trạm dừng chân hoặc quán ăn yêu thích dọc tuyến đường của bạn.
      </Text>

      {stops.map((s, i) => (
        <View key={s.place_id + i} style={styles.stopCard}>
          <View style={styles.stopCardHeader}>
            <View style={styles.stopBadge}>
              <Text style={styles.stopBadgeText}>{i + 1}</Text>
            </View>
            <View style={styles.stopInfo}>
              <Text style={styles.stopName} numberOfLines={1}>
                {s.name}
              </Text>
              <Text style={styles.stopAddr} numberOfLines={1}>
                {s.address}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setStops((prev) => prev.filter((_, j) => j !== i))}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.stopDeleteBtn}
            >
              <Ionicons name="trash-outline" size={17} color={C.primary} />
            </TouchableOpacity>
          </View>

          {/* Ô nhập thời gian dừng nghỉ */}
          <View style={styles.stayTimeBox}>
            <View style={styles.stayTimeHeader}>
              <Ionicons name="time-outline" size={15} color={C.primary} />
              <Text style={styles.stayTimeLabel}>Thời gian dừng nghỉ:</Text>
              <View style={styles.stayInputWrapper}>
                <TextInput
                  style={styles.stayInput}
                  value={String(s.stayMinutes ?? 15)}
                  onChangeText={(val) => {
                    const num = parseInt(val.replace(/[^0-9]/g, '')) || 0;
                    updateStopStay(i, num);
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <Text style={styles.stayInputUnit}>phút</Text>
              </View>
            </View>

            {/* Quick chips */}
            <View style={styles.quickStayRow}>
              {[15, 30, 45, 60].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.quickStayChip,
                    (s.stayMinutes ?? 15) === mins && styles.quickStayChipActive,
                  ]}
                  onPress={() => updateStopStay(i, mins)}
                >
                  <Text
                    style={[
                      styles.quickStayChipText,
                      (s.stayMinutes ?? 15) === mins && styles.quickStayChipTextActive,
                    ]}
                  >
                    +{mins}p
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ))}

      {/* Add stop search */}
      <View style={[sb.inputRow, { borderStyle: 'dashed', marginTop: 4 }]}>
        <Ionicons name="add-circle-outline" size={18} color={C.primary} />
        <TextInput
          style={[sb.input, { marginLeft: 6 }]}
          value={stopQuery}
          onChangeText={handleStopQuery}
          onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
          placeholder="Thêm điểm dừng..."
          placeholderTextColor={C.border}
          returnKeyType="search"
        />
        {stopLoading && <ActivityIndicator size="small" color={C.primary} />}
      </View>

      {stopPreds.length > 0 && (
        <View style={sb.dropdown}>
          {stopPreds.map((p) => (
            <TouchableOpacity
              key={p.place_id}
              style={sb.predItem}
              onPress={() => addStop(p)}
            >
              <Ionicons
                name="location-outline"
                size={15}
                color={C.primary}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={sb.predName} numberOfLines={1}>
                  {p.structured_formatting?.main_text ?? p.description.split(',')[0]}
                </Text>
                <Text style={sb.predAddr} numberOfLines={1}>
                  {p.structured_formatting?.secondary_text ??
                    p.description.split(',').slice(1).join(',').trim()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const PHASE_TITLES: Record<Phase, string> = {
    0: '1/2 · Chọn điểm đầu & cuối',
    1: '2/2 · Thêm điểm dừng & thời gian nghỉ',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.mapDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (phase > 0) setPhase(0);
            else navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={22} color={C.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{PHASE_TITLES[phase]}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Phase progress bar */}
      <View style={styles.phaseBar}>
        {([0, 1] as Phase[]).map((p) => (
          <View
            key={p}
            style={[styles.phaseSegment, p <= phase && styles.phaseSegmentActive]}
          />
        ))}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Bản đồ: Ở Phase 0 co dãn từ từ bằng Animated.View mapHeightAnim */}
        <Animated.View
          style={[
            styles.mapWrap,
            phase === 0 ? { height: mapHeightAnim } : { height: 240 },
          ]}
        >
          <SharedGoongMap
            ref={webviewRef}
            style={styles.webview}
            waypoints={mapWaypoints}
            routeCoords={routeCoords}
            variant="default"
          />
          {/* Badge on map (ẩn khi bàn phím mở để không che map) */}
          {!isKeyboardVisible && (
            <View style={styles.mapBadge} pointerEvents="none">
              <Text style={styles.mapBadgeText}>
                {phase === 0
                  ? 'Tìm kiếm điểm đầu và đích bên dưới'
                  : routeLoading
                    ? 'Đang tính lộ trình qua backend...'
                    : 'Thêm điểm dừng & thời gian nghỉ · Bấm "Xong" khi hoàn tất'}
              </Text>
            </View>
          )}
          {routeLoading && (
            <View style={styles.routeLoader}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={styles.routeLoaderText}>Đang tính lộ trình xe máy qua backend...</Text>
            </View>
          )}
        </Animated.View>

        {/* Bottom panel: Luôn hiển thị đầy đủ, mượt mà bám sát dưới bản đồ */}
        {phase === 0 ? (
          <View style={styles.phase0Container}>
            <ScrollView
              ref={scrollRef}
              style={styles.scrollPhase0}
              contentContainerStyle={styles.scrollContentPhase0}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {renderPhase0()}
            </ScrollView>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
            keyboardShouldPersistTaps="handled"
          >
            {renderPhase1()}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* CTA bar (ở Phase 0 chỉ hiện khi không nhập phím để nhường toàn bộ chỗ cho ô nhập và gợi ý) */}
      {(!isKeyboardVisible || phase !== 0) && (
        <View style={styles.ctaBar}>
          <TouchableOpacity
            style={[styles.ctaBtn, ctaDisabled && styles.ctaBtnOff]}
            onPress={handleCta}
            disabled={ctaDisabled}
            activeOpacity={ctaDisabled ? 1 : 0.85}
          >
            {routeLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.ctaText}>{getCtaLabel()}</Text>
                {!ctaDisabled && (
                  <Ionicons
                    name={phase === 1 ? 'checkmark' : 'arrow-forward'}
                    size={18}
                    color="#FFF"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Xem trước đường đi (gọi API v1/planning/review) */}
      <Modal
        visible={showPreviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalCard}>
            {/* Header */}
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

            {/* Metrics */}
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

            {/* Chặng đường */}
            <View style={styles.previewWaypointsList}>
              <View style={styles.previewWpRow}>
                <View style={[styles.previewWpDot, { backgroundColor: C.success }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.previewWpRole}>ĐIỂM XUẤT PHÁT</Text>
                  <Text style={styles.previewWpName} numberOfLines={1}>
                    {origin?.name || 'Điểm xuất phát'}
                  </Text>
                  <Text style={styles.previewWpAddr} numberOfLines={1}>
                    {origin?.address || ''}
                  </Text>
                </View>
              </View>

              <View style={styles.previewWpLine} />

              <View style={styles.previewWpRow}>
                <View style={[styles.previewWpDot, { backgroundColor: C.danger }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.previewWpRole, { color: C.danger }]}>ĐIỂM ĐẾN</Text>
                  <Text style={styles.previewWpName} numberOfLines={1}>
                    {destination?.name || 'Điểm đến'}
                  </Text>
                  <Text style={styles.previewWpAddr} numberOfLines={1}>
                    {destination?.address || ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Nút hành động */}
            <View style={styles.previewActionRow}>
              <TouchableOpacity
                style={styles.previewSecondaryBtn}
                onPress={() => setShowPreviewModal(false)}
              >
                <Text style={styles.previewSecondaryBtnText}>Đóng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewPrimaryBtn}
                onPress={() => {
                  setShowPreviewModal(false);
                  setPhase(1);
                }}
              >
                <Text style={styles.previewPrimaryBtnText}>Tiếp tục thiết lập</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0E8E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.heading,
  },
  phaseBar: {
    flexDirection: 'row',
    height: 3,
    backgroundColor: C.border,
  },
  phaseSegment: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  phaseSegmentActive: {
    backgroundColor: C.primary,
  },
  mapWrap: {
    backgroundColor: C.mapDark,
    position: 'relative',
    overflow: 'hidden',
  },
  phase0Container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollPhase0: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContentPhase0: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: C.mapBg,
  },
  mapBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(36,24,16,0.85)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(205,133,84,0.4)',
  },
  mapBadgeText: {
    color: '#FDFBF7',
    fontSize: 11,
    fontWeight: '600',
  },
  routeLoader: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(36,24,16,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  routeLoaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  panel: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  panelLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.sub,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  panelHint: {
    fontSize: 12,
    color: C.sub,
    marginBottom: 12,
    lineHeight: 17,
  },
  divLine: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 10,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  hintText: {
    fontSize: 12,
    color: C.sub,
  },
  routeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    width: '100%',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    minWidth: 0,
    overflow: 'hidden',
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  chipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  stopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#EFE6DE',
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  stopCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopDeleteBtn: {
    padding: 4,
  },
  stayTimeBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5EFE9',
  },
  stayTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stayTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.heading,
    flex: 1,
  },
  stayInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  stayInput: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primaryDark,
    textAlign: 'center',
    minWidth: 28,
    padding: 0,
  },
  stayInputUnit: {
    fontSize: 11,
    color: C.sub,
    fontWeight: '500',
  },
  quickStayRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  quickStayChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FAF5EE',
    borderWidth: 1,
    borderColor: '#EFE6DE',
  },
  quickStayChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  quickStayChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.sub,
  },
  quickStayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE9',
    gap: 10,
  },
  stopBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.heading,
  },
  stopAddr: {
    fontSize: 11,
    color: C.sub,
    marginTop: 1,
  },
  metricStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: C.heading,
  },
  metricLbl: {
    fontSize: 10,
    color: C.sub,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: C.border,
  },
  routeRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  routeLeft: {
    alignItems: 'center',
    width: 20,
    marginRight: 10,
    paddingTop: 3,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeConnector: {
    width: 2,
    flex: 1,
    backgroundColor: C.border,
    marginVertical: 3,
    minHeight: 28,
  },
  routeInfo: {
    flex: 1,
    paddingBottom: 12,
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.sub,
    letterSpacing: 0.6,
  },
  routeName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.heading,
    marginTop: 1,
  },
  routeAddr: {
    fontSize: 11,
    color: C.sub,
    marginTop: 1,
  },
  legInfo: {
    fontSize: 11,
    color: C.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.primary,
    marginTop: 12,
  },
  editBtnText: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
  },
  ctaBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  ctaBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnOff: {
    backgroundColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Nút Xem trước đường đi
  previewRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  previewRouteBtnDisabled: {
    backgroundColor: '#D1BFAF',
    shadowOpacity: 0,
    elevation: 0,
  },
  previewRouteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Preview Modal
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
    alignItems: 'flex-start',
    gap: 10,
  },
  previewWpDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
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
  previewWpAddr: {
    fontSize: 11,
    color: C.sub,
    marginTop: 1,
  },
  previewActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  previewSecondaryBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
  },
  previewSecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.sub,
  },
  previewPrimaryBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  previewPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
});

export default CreateRouteScreen;
