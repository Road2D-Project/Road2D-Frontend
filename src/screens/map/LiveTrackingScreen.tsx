import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  Alert,
  Animated,
  PanResponder,
  ScrollView,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  MOCK_TRIP,
  STATUS_COLORS,
  type TrackingMember,
  type MemberStatus,
} from '../../data/mockTrackingData';
import { useSimulationStore } from '../../store/useSimulationStore';
import { SimulationEngine } from '../../utils/SimulationEngine';
import { useTripStore } from '../../store/useTripStore';

// ------------------------------------------------------------------
// Env keys — đọc từ EXPO_PUBLIC_ prefix
// ------------------------------------------------------------------
const GOONG_MAP_KEY = process.env.EXPO_PUBLIC_GOONG_MAP_KEY ?? '';

// ------------------------------------------------------------------
// Kích thước màn hình
// ------------------------------------------------------------------
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap points cho bottom sheet
const SHEET_COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.42; // ~2/5 màn hình (đã bao gồm tab bar)
const SHEET_EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.80;  // ~4/5 khi kéo lên

// ------------------------------------------------------------------
// Hàm build HTML bản đồ Goong MapLibre
// ------------------------------------------------------------------
function buildMapHTML(members: TrackingMember[]): string {
  const { mapCenter, mapZoom, routePolylineCoords, waypoints } = MOCK_TRIP;

  // Serialise dữ liệu để nhúng vào HTML
  const routeGeoJSON = JSON.stringify(routePolylineCoords);
  const waypointsJSON = JSON.stringify(waypoints);
  const membersJSON = JSON.stringify(
    members.map((m) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      lngLat: m.lngLat,
      status: m.status,
      role: m.role,
      speed: m.speed,
    }))
  );

  const mapCenterStr = JSON.stringify(mapCenter);
  const STATUS_COLORS_JSON = JSON.stringify({
    normal: '#FFFFFF',
    lost: '#FF9800',
    no_signal: '#757575',
    lost_and_no_signal: '#FF5252',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css"/>
  <script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; overflow: hidden; background: #3E2B1C; }
    #map { width: 100%; height: 100%; }

    /* Lọc màu canvas của maplibre thành màu nâu sáng chủ đạo của app (không ảnh hưởng marker) */
    .maplibregl-canvas {
      filter: sepia(0.3) hue-rotate(-10deg) saturate(1.2) brightness(1.25) contrast(1.05);
    }

    /* Member avatar markers */
    .member-marker {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid #FFFFFF;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      position: relative;
    }
    .member-marker img {
      width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
    }
    .member-marker.lost { border-color: #FF9800; }
    .member-marker.no_signal { border-color: #757575; }
    .member-marker.lost_and_no_signal { border-color: #FF5252; }
    .member-marker.leader { border-width: 3.5px; }

    /* Lớp overlay để ám màu nhẹ lên avatar */
    .member-marker::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 50%;
      pointer-events: none;
    }
    .member-marker.lost::after { background: rgba(255, 152, 0, 0.3); }
    .member-marker.no_signal::after { background: rgba(117, 117, 117, 0.4); }
    .member-marker.lost_and_no_signal::after { background: rgba(255, 82, 82, 0.3); }

    /* Warning triangle badge */
    .warning-badge {
      position: absolute;
      top: -8px;
      left: -8px;
      z-index: 3;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    }

    /* Marker pointer triangle */
    .marker-wrap { display: flex; flex-direction: column; align-items: center; }
    .marker-triangle {
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 9px solid #FFFFFF;
      margin-top: -2px;
    }
    .marker-triangle.lost { border-top-color: #FF9800; }
    .marker-triangle.no_signal { border-top-color: #757575; }
    .marker-triangle.lost_and_no_signal { border-top-color: #FF5252; }

    /* Remove default maplibre controls */
    .maplibregl-ctrl-group { display: none !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  const GOONG_MAP_KEY = "${GOONG_MAP_KEY}";
  const ROUTE_COORDS = ${routeGeoJSON};
  const WAYPOINTS = ${waypointsJSON};
  const MEMBERS = ${membersJSON};
  const STATUS_CIRCLE_COLORS = ${STATUS_COLORS_JSON};

  function styleUrl(file) {
    return 'https://tiles.goong.io/assets/' + file + '?api_key=' + GOONG_MAP_KEY;
  }

  const map = new maplibregl.Map({
    container: 'map',
    style: styleUrl('goong_map_dark.json'),
    zoom: ${mapZoom},
    center: ${mapCenterStr},
    attributionControl: false,
  });

  map.on('styledata', function() {
    // Xoá viền trắng (stroke) của chữ trên bản đồ Goong triệt để
    const layers = map.getStyle().layers;
    if (layers) {
      layers.forEach(layer => {
        if (layer.type === 'symbol') {
          try {
            map.setPaintProperty(layer.id, 'text-halo-width', 0);
            map.setPaintProperty(layer.id, 'text-halo-color', 'transparent');
          } catch(e) {}
        }
      });
    }
  });

  map.on('load', function() {
    // ── Tuyến đường chính (màu R2D brown-orange) ──────────────────
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: ROUTE_COORDS }
      }
    });

    // Shadow/glow bên dưới
    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#CD853F', 'line-width': 10, 'line-opacity': 0.25 }
    });

    // Tuyến chính
    map.addLayer({
      id: 'route-main',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#C87941', 'line-width': 4.5, 'line-opacity': 0.95 }
    });

    // Waypoint markers (điểm dừng)
    WAYPOINTS.forEach(function(wp) {
      const el = document.createElement('div');
      el.style.cssText = [
        'width:10px', 'height:10px', 'border-radius:50%',
        'background:' + (wp.type === 'start' ? '#4CAF50' : wp.type === 'end' ? '#FF5252' : '#CD853F'),
        'border:2.5px solid #fff',
        'box-shadow:0 1px 4px rgba(0,0,0,0.4)',
        'cursor:pointer',
      ].join(';');
      new maplibregl.Marker({ element: el })
        .setLngLat(wp.lngLat)
        .addTo(map);
    });

    // Member markers
    MEMBERS.forEach(function(m) {
      const wrap = document.createElement('div');
      wrap.className = 'marker-wrap';

      const markerDiv = document.createElement('div');
      markerDiv.className = 'member-marker ' + m.status + (m.role === 'leader' ? ' leader' : '');

      const img = document.createElement('img');
      img.src = m.avatar;
      img.alt = m.name;
      markerDiv.appendChild(img);

      // Đã xoá badge "Off Route" theo yêu cầu

      // Tam giác cảnh báo đỏ máu nếu gặp vấn đề
      if (m.status !== 'normal') {
        const warnBadge = document.createElement('div');
        warnBadge.className = 'warning-badge';
        warnBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#8B0000" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        markerDiv.appendChild(warnBadge);
      }

      const triangle = document.createElement('div');
      triangle.className = 'marker-triangle ' + m.status;

      wrap.appendChild(markerDiv);
      wrap.appendChild(triangle);

      // Tap marker → gửi message về RN
      wrap.addEventListener('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_TAP', memberId: m.id }));
        }
      });

      const marker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat(m.lngLat)
        .addTo(map);

      window.memberMarkers = window.memberMarkers || {};
      window.memberMarkers[m.id] = marker;
    });

    const handleMessage = function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE_POSITION' && window.memberMarkers[data.id]) {
          window.memberMarkers[data.id].setLngLat([data.lng, data.lat]);
          if (data.isMe) {
            map.flyTo({ center: [data.lng, data.lat], speed: 0.5 });
          }
        }
      } catch(e) {}
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  });
</script>
</body>
</html>`;
}

// ------------------------------------------------------------------
// Status helpers
// ------------------------------------------------------------------
function getMemberStatusIcon(status: MemberStatus): React.ReactNode {
  switch (status) {
    case 'lost':
      return <Ionicons name="navigate-circle" size={16} color="#FF9800" />;
    case 'no_signal':
      return <MaterialCommunityIcons name="signal-off" size={16} color="#757575" />;
    case 'lost_and_no_signal':
      return <MaterialCommunityIcons name="alert-circle" size={16} color="#FF5252" />;
    default:
      return null;
  }
}

function getSignalBars(signal: number | null): React.ReactNode {
  if (signal === null) {
    return <MaterialCommunityIcons name="signal-off" size={15} color="#9E9E9E" />;
  }
  const color = colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: 4 + i * 2.5,
            backgroundColor: i <= signal ? color : '#E0E0E0',
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
}

function getWeatherIcon(condition: string): React.ReactNode {
  switch (condition) {
    case 'sunny': return <Ionicons name="sunny" size={12} color="#FFC107" />;
    case 'rain': return <Ionicons name="rainy" size={12} color="#64B5F6" />;
    case 'fog': return <Ionicons name="cloud" size={12} color="#B0BEC5" />;
    default: return <Ionicons name="partly-sunny" size={12} color="#FFC107" />;
  }
}

// ------------------------------------------------------------------
// Member Row Component
// ------------------------------------------------------------------
const MemberRow = ({ member, isMe }: { member: TrackingMember; isMe: boolean }) => {
  const sc = STATUS_COLORS[member.status];
  const roleLabel =
    member.role === 'leader' ? 'Trưởng đoàn' :
      member.role === 'sweeper' ? 'Chốt đoàn' : 'Giữa đoàn';

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
            uri: member.avatar,
            headers: { 'Referer': 'https://myanimelist.net/' }
          }} 
          style={styles.memberAvatar} 
        />
        {member.role === 'leader' && (
          <View style={styles.leaderCrown}>
            <Text style={{ fontSize: 8 }}>⭐</Text>
          </View>
        )}
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberName, isMe && { color: colors.primary }]}>
            {member.name}{isMe ? ' (Bạn)' : ''}
          </Text>
          {getMemberStatusIcon(member.status)}
        </View>
        <Text style={[styles.memberSub, member.status !== 'normal' && { color: sc.border }]} numberOfLines={1}>
          {member.status === 'normal' ? roleLabel : member.locationDesc}
        </Text>
      </View>

      <View style={styles.memberRight}>
        {/* Signal bars */}
        {getSignalBars(member.signal)}
        {/* Battery */}
        {member.battery !== null ? (
          <View style={styles.batteryRow}>
            <Ionicons
              name={member.battery > 50 ? 'battery-full' : member.battery > 20 ? 'battery-half' : 'battery-dead'}
              size={13}
              color={member.battery > 20 ? colors.textSecondary : '#FF5252'}
            />
            <Text style={styles.batteryText}>{member.battery}%</Text>
          </View>
        ) : (
          <Text style={styles.unknownText}>—</Text>
        )}
      </View>
    </View>
  );
};

// ------------------------------------------------------------------
// Main Screen
// ------------------------------------------------------------------
const LiveTrackingScreen = () => {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showCheckIn, setShowCheckIn] = useState(false);

  // Bottom sheet animation — khởi tạo ở trạng thái collapsed
  // Dương = dịch sheet xuống (ẩn phần mở rộng)
  // Âm = kéo lên (expanded)
  const COLLAPSED_OFFSET = SHEET_EXPANDED_HEIGHT - SHEET_COLLAPSED_HEIGHT;
  const sheetY = useRef(new Animated.Value(COLLAPSED_OFFSET)).current;
  const isExpanded = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderMove: (_, g) => {
        // Kéo lên (dy âm) → sheet đi lên; kéo xuống (dy dương) → sheet đi xuống
        const baseY = isExpanded.current ? 0 : COLLAPSED_OFFSET;
        const next = baseY + g.dy;
        // Giới hạn: tối thiểu 0 (expanded), tối đa COLLAPSED_OFFSET (collapsed)
        sheetY.setValue(Math.max(0, Math.min(COLLAPSED_OFFSET, next)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < -60 && !isExpanded.current) {
          // Kéo lên đủ → expand (translateY → 0)
          Animated.spring(sheetY, { toValue: 0, useNativeDriver: true }).start();
          isExpanded.current = true;
        } else if (g.dy > 60 && isExpanded.current) {
          // Kéo xuống đủ → collapse (translateY → COLLAPSED_OFFSET)
          Animated.spring(sheetY, { toValue: COLLAPSED_OFFSET, useNativeDriver: true }).start();
          isExpanded.current = false;
        } else {
          // Snap trở về vị trí cũ
          Animated.spring(sheetY, {
            toValue: isExpanded.current ? 0 : COLLAPSED_OFFSET,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Nhận message từ WebView (tap marker)
  const onWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'MARKER_TAP') {
        const member = MOCK_TRIP.members.find((m) => m.id === msg.memberId);
        if (member) {
          Alert.alert(member.name, `Trạng thái: ${STATUS_COLORS[member.status as MemberStatus].label}\n${member.locationDesc}`);
        }
      }
    } catch (_) { }
  }, []);

  // --- Simulation logic ---
  const engineRef = useRef<SimulationEngine | null>(null);
  const webViewRef = useRef<WebView>(null);
  const startSim = useSimulationStore(s => s.start);
  const stopSim = useSimulationStore(s => s.stop);
  const currentPosition = useSimulationStore(s => s.currentPosition);
  const currentSpeed = useSimulationStore(s => s.currentSpeedKmh);
  const traveledKm = useSimulationStore(s => s.traveledKm);

  useEffect(() => {
    engineRef.current = new SimulationEngine(MOCK_TRIP.routePolylineCoords as any);
    startSim('mock_trip');
    engineRef.current.start();
    
    return () => {
      engineRef.current?.stop();
      stopSim();
    }
  }, []);

  useEffect(() => {
    if (currentPosition && webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_POSITION',
        id: 'u1',
        lat: currentPosition.latitude,
        lng: currentPosition.longitude,
        isMe: true
      }));
    }
  }, [currentPosition]);

  const trip = MOCK_TRIP;
  const normalCount = trip.members.filter((m) => m.status === 'normal').length;
  const alertCount = trip.members.length - normalCount;

  const mapHTML = buildMapHTML(trip.members);

  const currentTraveled = traveledKm > 0 ? traveledKm : trip.completedDistance;
  const progressPct = Math.min(100, Math.round((currentTraveled / trip.totalDistance) * 100));

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ── BẢN ĐỒ (WebView) ── */}
      <View style={styles.mapContainer}>
        <WebView
          source={{ html: mapHTML }}
          style={styles.webview}
          onMessage={onWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />

        {/* OVERLAY: SafeAreaView cho các button */}
        <SafeAreaView style={styles.mapOverlaySafe} pointerEvents="box-none">
          {/* ── Header row: SOS + toggle ── */}
          <View style={styles.mapHeader} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.sosButton}
              onPress={() =>
                Alert.alert('SOS Khẩn Cấp', 'Bạn muốn gửi tín hiệu khẩn cấp đến ai?', [
                  { text: 'Cảnh sát 113' },
                  { text: 'Cứu hộ xe' },
                  { text: 'Trưởng đoàn' },
                  { text: 'Huỷ', style: 'cancel' },
                ])
              }
            >
              <Ionicons name="warning" size={16} color="#FFFFFF" />
              <Text style={styles.sosText}>SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
            >
              <Ionicons
                name={viewMode === 'map' ? 'list' : 'map-outline'}
                size={20}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* ── Pill: Điểm dừng tiếp theo ── */}
          <View style={styles.nextStopPill} pointerEvents="none">
            <View style={styles.nextStopIconWrap}>
              <Ionicons name="location" size={14} color="#CD853F" />
            </View>
            <View>
              <Text style={styles.nextStopLabel}>ĐIỂM DỪNG TIẾP THEO</Text>
              <Text style={styles.nextStopName}>
                {trip.nextStop.name} — {trip.nextStop.distanceKm} km
              </Text>
              {/* Thời tiết nhỏ ngay dưới địa điểm */}
              <View style={styles.weatherRow}>
                {getWeatherIcon(trip.nextStop.weatherCondition)}
                <Text style={styles.weatherText}>
                  {trip.nextStop.tempCelsius}° · {trip.nextStop.weather}
                </Text>
              </View>
            </View>
          </View>
        </SafeAreaView>

        {/* List view overlay nếu đang ở mode list */}
        {viewMode === 'list' && (
          <View style={styles.listOverlay}>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={styles.listOverlayTitle}>Danh sách thành viên</Text>
              {trip.members.map((m) => (
                <MemberRow key={m.id} member={m} isMe={m.id === 'm2'} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── BOTTOM SHEET ── */}
      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: sheetY }] }]}
        {...panResponder.panHandlers}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Sheet header */}
        <View style={styles.sheetHeader}>
          <View>
            <Text style={styles.sheetTitle}>
              Đội Hình ({trip.members.length})
            </Text>
            <Text style={styles.sheetSubtitle}>
              {trip.tripName} · Ngày {trip.day}
            </Text>
          </View>
          <View style={styles.signalSummary}>
            {alertCount === 0 ? (
              <MaterialCommunityIcons name="signal" size={16} color={colors.primary} />
            ) : (
              <Ionicons name="warning" size={16} color={colors.primary} />
            )}
            <Text style={[styles.signalText, { color: colors.primary }]}>
              {alertCount === 0 ? 'Tốt' : `${alertCount} cảnh báo`}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPct}%` as any }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>Đã đi: {currentTraveled.toFixed(1)} km</Text>
            <Text style={styles.progressText}>Còn lại: {Math.max(0, trip.totalDistance - currentTraveled).toFixed(1)} km</Text>
          </View>
        </View>

        {/* Member list — scrollable bên trong sheet */}
        <ScrollView
          style={styles.memberList}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {trip.members.map((m) => (
            <MemberRow key={m.id} member={m} isMe={m.id === 'm2'} />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>

        {/* Bottom action button */}
        <View style={styles.sheetFooter}>
          <TouchableOpacity style={styles.arriveBtn} onPress={() => setShowCheckIn(true)}>
            <Feather name="check-circle" size={18} color="#FFFFFF" />
            <Text style={styles.arriveBtnText}>Đã tới Trạm</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Check-in popup */}
      {showCheckIn && (
        <View style={styles.checkInOverlay}>
          <View style={styles.checkInCard}>
            <Text style={styles.checkInTitle}>✅ Đã đến Trạm 3</Text>
            <Text style={styles.checkInName}>{trip.nextStop.name}</Text>
            <Text style={styles.checkInDesc}>Tất cả thành viên hãy xác nhận check-in để tiếp tục!</Text>
            <TouchableOpacity style={styles.checkInBtn} onPress={() => setShowCheckIn(false)}>
              <Text style={styles.checkInBtnText}>Check-in ngay</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowCheckIn(false)}>
              <Text style={styles.checkInCancel}>Bỏ qua</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ------------------------------------------------------------------
// Styles
// ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C1A10',
  },

  // Map
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#3E2B1C',
  },
  mapOverlaySafe: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 4 : 0,
  },

  // Map header
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    gap: 5,
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  toggleButton: {
    width: 42,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },

  // Next stop pill
  nextStopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(28,17,8,0.84)',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 4,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(205,133,84,0.3)',
  },
  nextStopIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(205,133,84,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStopLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  nextStopName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  // Weather row — nhỏ, dưới địa điểm
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weatherText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },

  // List mode overlay
  listOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    top: Platform.OS === 'android' ? StatusBar.currentHeight! + 60 : 60,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  listOverlayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_EXPANDED_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
    // transform được điều khiển bởi Animated.Value sheetY — KHÔNG set ở đây
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#D7CCC8',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  signalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  signalText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Progress
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F0EAE4',
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
  },
  progressText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Member list
  memberList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 11,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0EAE4',
  },
  memberAvatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  leaderCrown: {
    position: 'absolute',
    top: -4,
    right: -4,
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
    minWidth: 48,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  batteryText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unknownText: {
    fontSize: 13,
    color: '#9E9E9E',
  },

  // Sheet footer
  sheetFooter: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0EAE4',
  },
  arriveBtn: {
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  arriveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Check-in overlay
  checkInOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  checkInCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  checkInTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  checkInName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  checkInDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  checkInBtn: {
    backgroundColor: '#4CAF50',
    width: '100%',
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkInCancel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default LiveTrackingScreen;
