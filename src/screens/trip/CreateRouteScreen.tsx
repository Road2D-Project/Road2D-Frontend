/**
 * CreateRouteScreen.tsx
 *
 * Phase 0 — Chọn Điểm Đầu & Điểm Cuối (search Goong Autocomplete)
 * Phase 1 — Thêm Điểm Dừng giữa (tuỳ chọn)
 * Phase 2 — Xem lộ trình thật (gọi GET /goong/directions A→B cho từng hop)
 *
 * Routing Phase 2:
 *   - Gọi trực tiếp Goong Directions REST API (GOONG_REST_KEY) cho từng cặp điểm liên tiếp
 *   - Giải mã polyline → tập hợp coordinates → vẽ lên MapLibre (dark style như LiveTracking)
 *   - Hiển thị tổng km + thời gian ước tính
 *
 * Gợi ý tích hợp backend thật (sau khi BE catalog có API):
 *   1. POST /goong/geocode hoặc place detail để upsert Location trên BE → lấy locationId
 *   2. POST /planning/preview với locationIds[] → nhận polyline + legs chính xác
 *   3. Pass PreviewLocationsResponse vào CreateTripScreen làm mainBranch
 */

import React, { useState, useRef, useCallback } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import type { CreateRouteScreenNavigationProp } from '../../types/navigation';

// ─── Brand colors (theo LiveTrackingScreen) ───────────────────────────────────
const C = {
  primary:     '#CD8554',
  primaryDark: '#A85A32',
  heading:     '#5D3A29',
  text:        '#3E2723',
  sub:         '#6D4C41',
  bg:          '#FDFBF7',
  card:        '#FFFFFF',
  border:      '#E0D5CC',
  success:     '#4CAF50',
  danger:      '#FF5252',
  mapBg:       '#3E2B1C',       // nền WebView khi map chưa load (giống LiveTracking)
  mapDark:     '#2C1A10',       // container bên ngoài WebView
};

const GOONG_REST_KEY = process.env.EXPO_PUBLIC_GOONG_REST_API_KEY ?? '';
const GOONG_MAP_KEY  = process.env.EXPO_PUBLIC_GOONG_MAP_KEY ?? '';
const API_URL        = process.env.EXPO_PUBLIC_API_URL ?? '';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Prediction {
  place_id: string;
  description: string;
}

interface Waypoint {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface RouteLeg {
  coords: [number, number][];  // [lng, lat][]
  distanceM: number;
  durationS: number;
}

type Phase = 0 | 1 | 2;

// ─── Goong REST helpers ───────────────────────────────────────────────────────
async function goongAutocomplete(input: string, location?: string): Promise<Prediction[]> {
  if (!input.trim() || !GOONG_REST_KEY) return [];
  try {
    const p = new URLSearchParams({ input, api_key: GOONG_REST_KEY, limit: '7' });
    if (location) p.set('location', location);
    const res = await fetch(`https://rsapi.goong.io/Place/AutoComplete?${p}`);
    const json = await res.json();
    return (json.predictions ?? []) as Prediction[];
  } catch { return []; }
}

async function goongPlaceDetail(place_id: string): Promise<Waypoint | null> {
  try {
    const p = new URLSearchParams({ place_id, api_key: GOONG_REST_KEY });
    const res = await fetch(`https://rsapi.goong.io/Place/Detail?${p}`);
    const json = await res.json();
    const r = json.result;
    if (!r) return null;
    return {
      place_id,
      lat: r.geometry?.location?.lat ?? 0,
      lng: r.geometry?.location?.lng ?? 0,
      name: r.name ?? r.formatted_address ?? '',
      address: r.formatted_address ?? '',
    };
  } catch { return null; }
}

/**
 * Giải mã Google/Goong encoded polyline → [[lng,lat],...]
 */
function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

/**
 * Gọi Goong Directions REST cho 1 hop A→B, trả về coords + metrics.
 */
async function fetchRouteLeg(from: Waypoint, to: Waypoint): Promise<RouteLeg | null> {
  try {
    const p = new URLSearchParams({
      origin: `${from.lat},${from.lng}`,
      destination: `${to.lat},${to.lng}`,
      vehicle: 'bike',
      api_key: GOONG_REST_KEY,
    });
    const res = await fetch(`https://rsapi.goong.io/Direction?${p}`);
    const json = await res.json();
    const route = json.routes?.[0];
    if (!route) return null;
    const leg = route.legs?.[0];
    const polylineStr = route.overview_polyline?.points ?? '';
    const coords = decodePolyline(polylineStr);
    return {
      coords,
      distanceM: leg?.distance?.value ?? 0,
      durationS: leg?.duration?.value ?? 0,
    };
  } catch { return null; }
}

// ─── Map HTML (MapLibre dark, giống LiveTrackingScreen) ───────────────────────
function buildMapHTML(waypoints: Waypoint[], legs: RouteLeg[], showRoute: boolean): string {
  const center = waypoints.length > 0
    ? [waypoints[0].lng, waypoints[0].lat]
    : [105.8542, 21.0285];

  // Gộp tất cả coords từ các legs thành 1 LineString
  const allCoords = legs.flatMap(l => l.coords);
  const routeGeoJSON = JSON.stringify(allCoords);

  const waypointsJS = waypoints.map((wp, i) => {
    const isFirst = i === 0;
    const isLast  = i === waypoints.length - 1 && waypoints.length > 1;
    const color   = isFirst ? '#4CAF50' : isLast ? '#FF5252' : '#CD853F';
    const label   = isFirst ? 'A' : isLast ? 'B' : String(i);
    return `
      (function(){
        var el = document.createElement('div');
        el.style.cssText = 'width:28px;height:28px;border-radius:50%;background:${color};border:2.5px solid #fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.5)';
        el.textContent = '${label}';
        new maplibregl.Marker({ element: el }).setLngLat([${wp.lng},${wp.lat}]).addTo(map);
      })();`;
  }).join('\n');

  const routeLayerJS = showRoute && allCoords.length >= 2 ? `
    map.addSource('route', {
      type: 'geojson',
      data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ${routeGeoJSON} } }
    });
    // Glow
    map.addLayer({ id: 'route-glow', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#CD853F', 'line-width': 10, 'line-opacity': 0.25 }
    });
    // Main route
    map.addLayer({ id: 'route-main', type: 'line', source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#C87941', 'line-width': 4.5, 'line-opacity': 0.95 }
    });
  ` : '';

  const fitBoundsJS = waypoints.length >= 2 ? `
    var bounds = new maplibregl.LngLatBounds();
    ${waypoints.map(wp => `bounds.extend([${wp.lng},${wp.lat}]);`).join('\n')}
    map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
  ` : '';

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
    /* Tông màu nâu-cam chủ đạo giống LiveTrackingScreen */
    .maplibregl-canvas {
      filter: sepia(0.3) hue-rotate(-10deg) saturate(1.2) brightness(1.25) contrast(1.05);
    }
    .maplibregl-ctrl-group { display: none !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.goong.io/assets/goong_map_dark.json?api_key=${GOONG_MAP_KEY}',
    center: [${center[0]},${center[1]}],
    zoom: ${waypoints.length > 1 ? 9 : 12},
    attributionControl: false,
  });
  map.on('styledata', function() {
    var layers = map.getStyle()?.layers ?? [];
    layers.forEach(function(layer) {
      if (layer.type === 'symbol') {
        try { map.setPaintProperty(layer.id, 'text-halo-width', 0); } catch(e){}
        try { map.setPaintProperty(layer.id, 'text-halo-color', 'transparent'); } catch(e){}
      }
    });
  });
  map.on('load', function() {
    ${routeLayerJS}
    ${waypointsJS}
    ${fitBoundsJS}
  });
</script>
</body>
</html>`;
}

// ─── Search Box Component ─────────────────────────────────────────────────────
interface SearchBoxProps {
  placeholder: string;
  dotColor: string;
  value: Waypoint | null;
  onSelect: (wp: Waypoint) => void;
  onClear: () => void;
  biasLocation?: string;
  autoFocusOnMount?: boolean;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder, dotColor, value, onSelect, onClear, biasLocation,
}) => {
  const [query, setQuery]               = useState('');
  const [predictions, setPredictions]   = useState<Prediction[]>([]);
  const [loading, setLoading]           = useState(false);
  const [focused, setFocused]           = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setPredictions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setPredictions(await goongAutocomplete(text, biasLocation));
      setLoading(false);
    }, 400);
  };

  const handleSelect = async (pred: Prediction) => {
    setLoading(true);
    Keyboard.dismiss();
    setFocused(false);
    const detail = await goongPlaceDetail(pred.place_id);
    setLoading(false);
    if (!detail) return;
    setPredictions([]);
    setQuery('');
    onSelect(detail);
  };

  if (value) {
    return (
      <View style={sb.selectedRow}>
        <View style={[sb.dot, { backgroundColor: dotColor }]} />
        <View style={sb.selectedText}>
          <Text style={sb.selectedName} numberOfLines={1}>{value.name}</Text>
          <Text style={sb.selectedAddr} numberOfLines={1}>{value.address}</Text>
        </View>
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={20} color={C.border} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={[sb.inputRow, focused && sb.inputRowFocused]}>
        <View style={[sb.dot, { backgroundColor: dotColor }]} />
        <TextInput
          style={sb.input}
          value={query}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={C.border}
          onFocus={() => setFocused(true)}
          onBlur={() => { if (!predictions.length) setFocused(false); }}
          returnKeyType="search"
        />
        {loading
          ? <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 6 }} />
          : query.length > 0
            ? <TouchableOpacity onPress={() => { setQuery(''); setPredictions([]); }}>
                <Ionicons name="close" size={16} color={C.sub} />
              </TouchableOpacity>
            : null
        }
      </View>
      {/* Dropdown xuất hiện BÊN DƯỚI input, không che input */}
      {predictions.length > 0 && (
        <View style={sb.dropdown}>
          {predictions.map((p) => (
            <TouchableOpacity key={p.place_id} style={sb.predItem} onPress={() => handleSelect(p)}>
              <Ionicons name="location-outline" size={15} color={C.primary} style={{ flexShrink: 0, marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={sb.predName} numberOfLines={1}>{p.description.split(',')[0]}</Text>
                <Text style={sb.predAddr} numberOfLines={1}>
                  {p.description.split(',').slice(1).join(',').trim()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const sb = StyleSheet.create({
  selectedRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 10, marginBottom: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  selectedText: { flex: 1, minWidth: 0 },        // minWidth:0 → text tự co lại
  selectedName: { fontSize: 14, fontWeight: '700', color: C.text, flexShrink: 1 },
  selectedAddr: { fontSize: 12, color: C.sub, marginTop: 1, flexShrink: 1 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, marginBottom: 8,
  },
  inputRowFocused: { borderColor: C.primary },
  input: { flex: 1, fontSize: 14, color: C.text, minWidth: 0, padding: 0 },
  dropdown: {
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    marginTop: -4, marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  predItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3EDE7',
  },
  predName: { fontSize: 14, fontWeight: '600', color: C.text },
  predAddr: { fontSize: 12, color: C.sub, marginTop: 1 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}
function fmtDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}p`;
  return `${m} phút`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const CreateRouteScreen: React.FC = () => {
  const navigation = useNavigation<CreateRouteScreenNavigationProp>();
  const webviewRef = useRef<WebView>(null);

  const [phase, setPhase]             = useState<Phase>(0);
  const [origin, setOrigin]           = useState<Waypoint | null>(null);
  const [destination, setDestination] = useState<Waypoint | null>(null);
  const [stops, setStops]             = useState<Waypoint[]>([]);

  // Stop search state
  const [stopQuery, setStopQuery]           = useState('');
  const [stopPreds, setStopPreds]           = useState<Prediction[]>([]);
  const [stopLoading, setStopLoading]       = useState(false);
  const stopDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase 2: routing
  const [legs, setLegs]               = useState<RouteLeg[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);

  const allWaypoints: Waypoint[] = [
    ...(origin ? [origin] : []),
    ...stops,
    ...(destination ? [destination] : []),
  ];
  const canProceed = !!origin && !!destination;
  const mapHtml    = buildMapHTML(allWaypoints, legs, phase === 2);

  // ── Stop search ──
  const handleStopQuery = useCallback((text: string) => {
    setStopQuery(text);
    if (stopDebounceRef.current) clearTimeout(stopDebounceRef.current);
    if (!text.trim()) { setStopPreds([]); return; }
    stopDebounceRef.current = setTimeout(async () => {
      setStopLoading(true);
      const bias = origin ? `${origin.lat},${origin.lng}` : undefined;
      setStopPreds(await goongAutocomplete(text, bias));
      setStopLoading(false);
    }, 400);
  }, [origin]);

  const addStop = useCallback(async (pred: Prediction) => {
    setStopLoading(true);
    Keyboard.dismiss();
    const detail = await goongPlaceDetail(pred.place_id);
    setStopLoading(false);
    if (!detail) return;
    setStops(prev => [...prev, detail]);
    setStopQuery('');
    setStopPreds([]);
  }, []);

  // ── Phase 2: fetch real route ──
  const fetchRoute = useCallback(async () => {
    setRouteLoading(true);
    setLegs([]);
    const pts = allWaypoints;
    const results: RouteLeg[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const leg = await fetchRouteLeg(pts[i], pts[i + 1]);
      results.push(leg ?? { coords: [[pts[i].lng, pts[i].lat], [pts[i+1].lng, pts[i+1].lat]], distanceM: 0, durationS: 0 });
    }
    setLegs(results);
    setRouteLoading(false);
    setPhase(2);
  }, [allWaypoints]);

  // ── CTA ──
  const getCtaLabel = () => {
    if (phase === 0) return canProceed ? 'Tiếp theo: Thêm điểm dừng' : 'Chọn điểm đầu & điểm đến';
    if (phase === 1) return routeLoading ? 'Đang tính lộ trình...' : 'Xem lộ trình';
    return 'Xác nhận lộ trình';
  };
  const ctaDisabled = (phase === 0 && !canProceed) || routeLoading;

  const handleCta = () => {
    if (phase === 0 && canProceed) setPhase(1);
    else if (phase === 1 && !routeLoading) fetchRoute();
    else if (phase === 2) navigation.goBack();
  };

  const totalDist = legs.reduce((s, l) => s + l.distanceM, 0);
  const totalDur  = legs.reduce((s, l) => s + l.durationS, 0);

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
      />
      {!canProceed && (
        <View style={styles.hintRow}>
          <Ionicons name="information-circle-outline" size={15} color={C.sub} />
          <Text style={styles.hintText}>Chọn đủ 2 điểm để tiếp tục</Text>
        </View>
      )}
    </View>
  );

  const renderPhase1 = () => (
    <View style={styles.panel}>
      {/* Summary */}
      <View style={styles.routeSummary}>
        <View style={[styles.chip, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="radio-button-on" size={13} color={C.success} />
          <Text style={[styles.chipText, { color: '#2E7D32' }]} numberOfLines={1}>{origin!.name}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={C.sub} />
        <View style={[styles.chip, { backgroundColor: '#FFEBEE' }]}>
          <Ionicons name="location" size={13} color={C.danger} />
          <Text style={[styles.chipText, { color: '#C62828' }]} numberOfLines={1}>{destination!.name}</Text>
        </View>
      </View>

      <Text style={styles.panelLabel}>ĐIỂM DỪNG GIỮA ĐƯỜNG</Text>
      <Text style={styles.panelHint}>
        💡 Chọn ít nhất một điểm dừng để khám phá thêm nhiều điểm thú vị dọc đường — hoặc bỏ qua và xem lộ trình ngay!
      </Text>

      {stops.map((s, i) => (
        <View key={s.place_id + i} style={styles.stopRow}>
          <View style={styles.stopBadge}>
            <Text style={styles.stopBadgeText}>{i + 1}</Text>
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName} numberOfLines={1}>{s.name}</Text>
            <Text style={styles.stopAddr} numberOfLines={1}>{s.address}</Text>
          </View>
          <TouchableOpacity onPress={() => setStops(prev => prev.filter((_, j) => j !== i))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={C.primary} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Add stop search */}
      <View style={[sb.inputRow, { borderStyle: 'dashed', marginTop: 4 }]}>
        <Ionicons name="add-circle-outline" size={18} color={C.primary} />
        <TextInput
          style={[sb.input, { marginLeft: 6 }]}
          value={stopQuery}
          onChangeText={handleStopQuery}
          placeholder="Thêm điểm dừng..."
          placeholderTextColor={C.border}
          returnKeyType="search"
        />
        {stopLoading && <ActivityIndicator size="small" color={C.primary} />}
      </View>
      {stopPreds.length > 0 && (
        <View style={[sb.dropdown, { marginTop: 0 }]}>
          {stopPreds.map(p => (
            <TouchableOpacity key={p.place_id} style={sb.predItem} onPress={() => addStop(p)}>
              <Ionicons name="location-outline" size={15} color={C.primary} style={{ flexShrink: 0, marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={sb.predName} numberOfLines={1}>{p.description.split(',')[0]}</Text>
                <Text style={sb.predAddr} numberOfLines={1}>{p.description.split(',').slice(1).join(',').trim()}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderPhase2 = () => (
    <View style={styles.panel}>
      {/* Route metrics */}
      {totalDist > 0 && (
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <MaterialCommunityIcons name="map-marker-distance" size={18} color={C.primary} />
            <Text style={styles.metricVal}>{fmtDistance(totalDist)}</Text>
            <Text style={styles.metricLbl}>Khoảng cách</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="time-outline" size={18} color={C.primary} />
            <Text style={styles.metricVal}>{fmtDuration(totalDur)}</Text>
            <Text style={styles.metricLbl}>Thời gian</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Ionicons name="location-outline" size={18} color={C.primary} />
            <Text style={styles.metricVal}>{allWaypoints.length}</Text>
            <Text style={styles.metricLbl}>Điểm</Text>
          </View>
        </View>
      )}

      <Text style={styles.panelLabel}>LỘ TRÌNH</Text>

      {allWaypoints.map((wp, i) => (
        <View key={wp.place_id + i} style={styles.routeRow}>
          <View style={styles.routeLeft}>
            <View style={[styles.routeDot,
              i === 0 && { backgroundColor: C.success },
              i === allWaypoints.length - 1 && { backgroundColor: C.danger },
              i > 0 && i < allWaypoints.length - 1 && { backgroundColor: C.primary },
            ]} />
            {i < allWaypoints.length - 1 && <View style={styles.routeConnector} />}
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeLabel}>
              {i === 0 ? 'XUẤT PHÁT' : i === allWaypoints.length - 1 ? 'ĐIỂM ĐẾN' : `TRẠM ${i}`}
            </Text>
            <Text style={styles.routeName} numberOfLines={1}>{wp.name}</Text>
            <Text style={styles.routeAddr} numberOfLines={1}>{wp.address}</Text>
            {legs[i] && i < allWaypoints.length - 1 && (
              <Text style={styles.legInfo}>
                ↓ {fmtDistance(legs[i].distanceM)} · {fmtDuration(legs[i].durationS)}
              </Text>
            )}
          </View>
        </View>
      ))}

      {/* Routing note */}
      <View style={styles.noteBanner}>
        <MaterialCommunityIcons name="check-circle-outline" size={15} color={C.success} />
        <Text style={styles.noteText}>
          Lộ trình tính bằng Goong Directions API (xe máy){'\n'}
          <Text style={{ color: C.sub }}>
            Tích hợp backend: gọi POST /planning/preview với locationIds sau khi geocode → lấy polyline chính xác hơn
          </Text>
        </Text>
      </View>

      <TouchableOpacity style={styles.editBtn} onPress={() => setPhase(1)}>
        <Feather name="edit-2" size={14} color={C.primary} />
        <Text style={styles.editBtnText}>Chỉnh sửa điểm dừng</Text>
      </TouchableOpacity>
    </View>
  );

  const PHASE_TITLES: Record<Phase, string> = {
    0: 'Chọn điểm đầu & cuối',
    1: 'Thêm điểm dừng',
    2: 'Xem lộ trình',
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.mapDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { if (phase > 0) setPhase((phase - 1) as Phase); else navigation.goBack(); }}
        >
          <Ionicons name="arrow-back" size={22} color={C.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{PHASE_TITLES[phase]}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Phase progress bar */}
      <View style={styles.phaseBar}>
        {([0, 1, 2] as Phase[]).map(p => (
          <View key={p} style={[styles.phaseSegment, p <= phase && styles.phaseSegmentActive]} />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Map (dark theme giống LiveTrackingScreen) */}
        <View style={styles.mapWrap}>
          <WebView
            ref={webviewRef}
            source={{ html: mapHtml }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
          {/* Badge on map */}
          <View style={styles.mapBadge} pointerEvents="none">
            <Text style={styles.mapBadgeText}>
              {phase === 0 ? 'Dùng thanh tìm kiếm bên dưới'
                : phase === 1 ? 'Thêm điểm dừng · bấm "Xem lộ trình" khi xong'
                : routeLoading ? 'Đang tính lộ trình...'
                : `Lộ trình Goong · ${fmtDistance(totalDist)}`}
            </Text>
          </View>
          {routeLoading && (
            <View style={styles.routeLoader}>
              <ActivityIndicator color={C.primary} size="large" />
              <Text style={styles.routeLoaderText}>Đang tính lộ trình xe máy...</Text>
            </View>
          )}
        </View>

        {/* Bottom panel — scrollable */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 90 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {phase === 0 && renderPhase0()}
          {phase === 1 && renderPhase1()}
          {phase === 2 && renderPhase2()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CTA bar */}
      <View style={styles.ctaBar}>
        <TouchableOpacity
          style={[styles.ctaBtn, ctaDisabled && styles.ctaBtnOff]}
          onPress={handleCta}
          disabled={ctaDisabled}
          activeOpacity={ctaDisabled ? 1 : 0.85}
        >
          {routeLoading
            ? <ActivityIndicator color="#FFF" />
            : <>
                <Text style={styles.ctaText}>{getCtaLabel()}</Text>
                {!ctaDisabled && (
                  <Ionicons
                    name={phase === 2 ? 'checkmark' : 'arrow-forward'}
                    size={18} color="#FFF" style={{ marginLeft: 8 }}
                  />
                )}
              </>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1, backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 13,
    backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#F0E8E0', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.heading },

  phaseBar: { flexDirection: 'row', gap: 4, paddingHorizontal: 20, paddingVertical: 7, backgroundColor: C.bg },
  phaseSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#E8DDD5' },
  phaseSegmentActive: { backgroundColor: C.primary },

  // Map — dark theme giống LiveTracking
  mapWrap: { height: 260, backgroundColor: C.mapDark, position: 'relative' },
  webview: { flex: 1, backgroundColor: C.mapBg },
  mapBadge: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(28,17,8,0.82)',
    paddingVertical: 8, alignItems: 'center',
    borderTopWidth: 1, borderTopColor: 'rgba(205,133,84,0.2)',
  },
  mapBadgeText: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  routeLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28,17,8,0.75)',
    justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  routeLoaderText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  scroll: { flex: 1 },
  panel: { padding: 16 },
  panelLabel: {
    fontSize: 11, fontWeight: '700', color: C.sub,
    letterSpacing: 0.8, marginBottom: 8, marginTop: 4,
  },
  panelHint: {
    fontSize: 13, color: C.sub, marginBottom: 12, lineHeight: 18,
    backgroundColor: '#FDF6EE', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#EDD9C3',
  },
  divLine: { height: 1, backgroundColor: C.border, marginVertical: 10, marginHorizontal: 4 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  hintText: { fontSize: 12, color: C.sub },

  // Phase 0 summary chips
  routeSummary: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 140,
  },
  chipText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },

  // Phase 1 — stops
  stopRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, gap: 10,
  },
  stopBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  stopBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  stopInfo: { flex: 1, minWidth: 0 },
  stopName: { fontSize: 14, fontWeight: '600', color: C.text, flexShrink: 1 },
  stopAddr: { fontSize: 11, color: C.sub, marginTop: 1, flexShrink: 1 },

  // Phase 2 — route display
  metricsRow: {
    flexDirection: 'row', backgroundColor: C.card,
    borderRadius: 14, borderWidth: 1, borderColor: C.border,
    paddingVertical: 14, marginBottom: 16,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 3 },
  metricDivider: { width: 1, backgroundColor: C.border, marginVertical: 4 },
  metricVal: { fontSize: 16, fontWeight: '800', color: C.heading },
  metricLbl: { fontSize: 10, color: C.sub, fontWeight: '600' },

  routeRow: { flexDirection: 'row', marginBottom: 2 },
  routeLeft: { width: 30, alignItems: 'center', paddingTop: 3 },
  routeDot: {
    width: 14, height: 14, borderRadius: 7, backgroundColor: C.primary,
    borderWidth: 2, borderColor: '#FFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  routeConnector: { width: 2, flex: 1, backgroundColor: C.border, marginTop: 3 },
  routeInfo: { flex: 1, paddingLeft: 8, paddingBottom: 16 },
  routeLabel: { fontSize: 10, fontWeight: '700', color: C.sub, letterSpacing: 0.5 },
  routeName: { fontSize: 15, fontWeight: '700', color: C.text, marginTop: 1 },
  routeAddr: { fontSize: 11, color: C.sub, marginTop: 1 },
  legInfo: { fontSize: 11, color: C.primary, fontWeight: '600', marginTop: 3 },

  noteBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#F0FBF0', borderRadius: 10,
    borderWidth: 1, borderColor: '#C8E6C9',
    padding: 10, marginTop: 4, marginBottom: 10,
  },
  noteText: { flex: 1, fontSize: 12, color: '#2E7D32', lineHeight: 17 },

  editBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12,
    borderWidth: 1, borderColor: C.primary, borderRadius: 12,
  },
  editBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },

  // CTA
  ctaBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: C.bg, paddingHorizontal: 20, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  ctaBtn: {
    backgroundColor: C.primary, borderRadius: 16, height: 54,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  ctaBtnOff: { backgroundColor: '#E0D5CC', shadowOpacity: 0, elevation: 0 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});

export default CreateRouteScreen;
