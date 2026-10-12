/**
 * SharedGoongMap.tsx
 *
 * Khung hiển thị bản đồ chuẩn của ứng dụng Road2D:
 * - Tone màu nâu đậm bắt mắt, loại bỏ tình trạng sông nước bị đen xì.
 * - Khắc phục triệt để viền trắng stroke của nhãn địa danh trên Goong Map.
 * - Tuyến đường nổi bật với tông màu cam nâu thương hiệu #CD8554.
 * - Tái sử dụng cố định cho cả LiveTrackingScreen, CreateRouteScreen và mọi màn hình khác.
 */
import React, { useMemo, forwardRef } from 'react';
import { StyleSheet, View, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { GOONG_MAP_KEY } from '../../config/env';

export interface MapWaypoint {
  id?: string;
  lat: number;
  lng: number;
  name?: string;
  label?: string; // 'A', 'B', '1', '2'...
  type?: 'start' | 'end' | 'stop';
}

export type MemberStatus = 'normal' | 'lost' | 'no_signal' | 'lost_and_no_signal';

export interface MapMember {
  id: string;
  name: string;
  avatar: string;
  lat: number;
  lng: number;
  role?: 'leader' | 'member' | 'sweeper' | 'admin' | string;
  status?: MemberStatus;
}

export interface SharedGoongMapProps {
  style?: StyleProp<ViewStyle>;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  waypoints?: MapWaypoint[];
  routeCoords?: [number, number][]; // [[lng, lat], ...]
  members?: MapMember[];
  interactive?: boolean;
  variant?: 'brown' | 'default'; // 'brown': tone nâu sang trọng; 'default': style sáng nguyên bản của Goong
  onMarkerPress?: (memberId: string) => void;
  onMessage?: (event: WebViewMessageEvent) => void;
}

const BRAND = {
  mapBg: '#1A120B',          // Nền bản đồ nâu đen espresso sang trọng
  routeMain: '#E67E22',       // Tuyến chính cam đất Road2D sắc nét
  routeGlow: '#B86B30',       // Bóng đổ phát sáng cam nâu
  waterFill: '#3D2D20',       // Sông ngòi, ao hồ, biển: Màu nâu trầm ấm, KHÔNG ĐEN XÌ
  waterLine: '#574130',       // Viền bờ sông hồ nâu sáng tinh tế
  landcover: '#241910',       // Nền đất tự nhiên
  parkFill: '#2B2016',        // Công viên, rừng cây nâu rêu trầm
  roadMinor: '#352417',       // Đường ngõ hẻm / đường nhỏ
  roadMajor: '#4A3322',       // Đường chính nội đô
  roadPrimary: '#6A462B',     // Trục đường lớn / quốc lộ
  textColor: '#E5D1C0',       // Tên đường, địa danh kem be sáng dễ đọc
};

function buildMapHTML({
  center,
  zoom,
  waypoints,
  routeCoords,
  members,
  interactive,
  variant = 'brown',
}: {
  center: [number, number];
  zoom: number;
  waypoints: MapWaypoint[];
  routeCoords: [number, number][];
  members: MapMember[];
  interactive: boolean;
  variant?: 'brown' | 'default';
}): string {
  const isBrown = variant === 'brown';
  const routeGeoJSON = JSON.stringify(routeCoords);
  const hasRoute = routeCoords.length >= 2;

  // Render Waypoint markers
  const waypointsJS = waypoints.map((wp, i) => {
    const isFirst = wp.type === 'start' || i === 0;
    const isLast = wp.type === 'end' || (i === waypoints.length - 1 && waypoints.length > 1);
    const color = isFirst ? '#4CAF50' : isLast ? '#FF5252' : '#CD853F';
    const label = wp.label ?? (isFirst ? 'A' : isLast ? 'B' : String(i));

    return `
      (function() {
        var el = document.createElement('div');
        el.style.cssText = 'width:28px;height:28px;border-radius:50%;background:${color};border:2.5px solid #FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;color:#FFFFFF;box-shadow:0 3px 8px rgba(0,0,0,0.5);cursor:pointer;';
        el.textContent = '${label}';
        new maplibregl.Marker({ element: el })
          .setLngLat([${wp.lng}, ${wp.lat}])
          .addTo(map);
      })();
    `;
  }).join('\n');

  // Render Member markers (cho Live Tracking)
  const membersData = JSON.stringify(members.map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    lngLat: [m.lng, m.lat],
    role: m.role ?? 'member',
    status: m.status ?? 'normal',
  })));

  const membersJS = members.length > 0 ? `
    var MEMBERS = ${membersData};
    MEMBERS.forEach(function(m) {
      var wrap = document.createElement('div');
      wrap.className = 'marker-wrap';

      var markerDiv = document.createElement('div');
      markerDiv.className = 'member-marker ' + m.status + ' ' + (m.role || 'member');

      var img = document.createElement('img');
      img.src = m.avatar;
      img.alt = m.name;
      markerDiv.appendChild(img);

      if (m.status !== 'normal') {
        var warnBadge = document.createElement('div');
        warnBadge.className = 'warning-badge';
        warnBadge.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="#8B0000" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        markerDiv.appendChild(warnBadge);
      }

      var triangle = document.createElement('div');
      triangle.className = 'marker-triangle ' + m.status;

      wrap.appendChild(markerDiv);
      wrap.appendChild(triangle);

      wrap.addEventListener('click', function() {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MARKER_TAP', memberId: m.id }));
        }
      });

      var marker = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
        .setLngLat(m.lngLat)
        .addTo(map);

      window.memberMarkers = window.memberMarkers || {};
      window.memberMarkers[m.id] = marker;
    });

    var handleMessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'UPDATE_POSITION') {
          if (window.memberMarkers && window.memberMarkers[data.id]) {
            window.memberMarkers[data.id].setLngLat([data.lng, data.lat]);
          }
          if (data.isMe) {
            map.flyTo({ center: [data.lng, data.lat], speed: 0.5 });
          }
        }
      } catch(e) {}
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  ` : '';

  // Fit bounds logic
  const fitBoundsJS = (waypoints.length >= 2 || hasRoute) ? `
    try {
      var bounds = new maplibregl.LngLatBounds();
      ${waypoints.map(wp => `bounds.extend([${wp.lng}, ${wp.lat}]);`).join('\n')}
      ${hasRoute ? `
        var rCoords = ${routeGeoJSON};
        for (var k = 0; k < rCoords.length; k += 4) {
          bounds.extend(rCoords[k]);
        }
      ` : ''}
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    } catch(e) {}
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
    html, body { height: 100%; margin: 0; overflow: hidden; background: ${isBrown ? BRAND.mapBg : '#F4F5F7'}; }
    #map { width: 100%; height: 100%; }

    ${isBrown ? `
    /* Lọc màu canvas sang tông nâu ấm sang trọng (chỉ áp dụng cho chế độ nâu trên lộ trình) */
    .maplibregl-canvas {
      filter: sepia(0.24) contrast(1.1) brightness(1.06) hue-rotate(-5deg) saturate(1.15);
    }
    ` : ''}
    .maplibregl-ctrl-group { display: none !important; }

    /* Member markers style */
    .member-marker {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: 3px solid #FFFFFF;
      cursor: pointer;
      box-shadow: 0 3px 10px rgba(0,0,0,0.45);
      position: relative;
    }
    .member-marker img {
      width: 100%; height: 100%; object-fit: cover; border-radius: 50%;
    }
    .member-marker.lost { border-color: #FF9800; }
    .member-marker.no_signal { border-color: #757575; }
    .member-marker.lost_and_no_signal { border-color: #FF5252; }
    .member-marker.leader { border-width: 3.5px; border-color: #E67E22; }
    .member-marker.sweeper { border-width: 3.5px; border-color: #F39C12; }
    .member-marker.admin { border-width: 3.5px; border-color: #3498DB; }

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

    .warning-badge {
      position: absolute;
      top: -8px;
      left: -8px;
      z-index: 3;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    }

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
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = new maplibregl.Map({
    container: 'map',
    style: '${isBrown ? `https://tiles.goong.io/assets/goong_map_dark.json?api_key=${GOONG_MAP_KEY}` : `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAP_KEY}`}',
    center: [${center[0]}, ${center[1]}],
    zoom: ${zoom},
    interactive: ${interactive ? 'true' : 'false'},
    attributionControl: false,
  });

  ${isBrown ? `
  // Tinh chỉnh layers cho chế độ nâu: Sông ngòi, ao hồ, biển đổi sang nâu trầm ấm, loại bỏ viền chữ trắng
  map.on('styledata', function() {
    var layers = map.getStyle()?.layers || [];
    layers.forEach(function(layer) {
      if (layer.type === 'symbol') {
        try { map.setPaintProperty(layer.id, 'text-halo-width', 0); } catch(e){}
        try { map.setPaintProperty(layer.id, 'text-halo-color', 'transparent'); } catch(e){}
        try { map.setPaintProperty(layer.id, 'text-color', '${BRAND.textColor}'); } catch(e){}
      }

      // Xử lý toàn diện sông ngòi, ao hồ, biển
      var id = (layer.id || '').toLowerCase();
      var isWater = id.indexOf('water') !== -1 ||
                    id.indexOf('river') !== -1 ||
                    id.indexOf('lake') !== -1 ||
                    id.indexOf('ocean') !== -1 ||
                    id.indexOf('sea') !== -1;

      if (isWater) {
        if (layer.type === 'fill') {
          try { map.setPaintProperty(layer.id, 'fill-color', '${BRAND.waterFill}'); } catch(e){}
          try { map.setPaintProperty(layer.id, 'fill-opacity', 0.95); } catch(e){}
        } else if (layer.type === 'line') {
          try { map.setPaintProperty(layer.id, 'line-color', '${BRAND.waterLine}'); } catch(e){}
          try { map.setPaintProperty(layer.id, 'line-opacity', 0.9); } catch(e){}
        }
      }

      if (id === 'background') {
        try { map.setPaintProperty(layer.id, 'background-color', '${BRAND.mapBg}'); } catch(e){}
      } else if (id.indexOf('park') !== -1 || id.indexOf('forest') !== -1 || id.indexOf('grass') !== -1) {
        if (layer.type === 'fill') {
          try { map.setPaintProperty(layer.id, 'fill-color', '${BRAND.parkFill}'); } catch(e){}
        }
      } else if (id.indexOf('landcover') !== -1 || id.indexOf('landuser') !== -1) {
        if (layer.type === 'fill') {
          try { map.setPaintProperty(layer.id, 'fill-color', '${BRAND.landcover}'); } catch(e){}
        }
      }
    });
  });
  ` : ''}

  map.on('load', function() {
    ${hasRoute ? `
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: ${routeGeoJSON} }
        }
      });

      // Tuyến đổ bóng (Glow)
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '${isBrown ? BRAND.routeGlow : 'rgba(205, 133, 84, 0.35)'}',
          'line-width': 10,
          'line-opacity': 0.35
        }
      });

      // Tuyến chính (Cam nâu thương hiệu Road2D)
      map.addLayer({
        id: 'route-main',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '${isBrown ? BRAND.routeMain : '#CD8554'}',
          'line-width': 5.2,
          'line-opacity': 0.98
        }
      });
    ` : ''}

    ${waypointsJS}
    ${membersJS}
    ${fitBoundsJS}
  });
</script>
</body>
</html>`;
}

export const SharedGoongMap = forwardRef<WebView, SharedGoongMapProps>(
  (
    {
      style,
      initialCenter = [105.8542, 21.0285],
      initialZoom = 11,
      waypoints = [],
      routeCoords = [],
      members = [],
      interactive = true,
      variant = 'brown',
      onMarkerPress,
      onMessage,
    },
    ref
  ) => {
    const center: [number, number] = useMemo(() => {
      if (waypoints.length > 0) {
        return [waypoints[0].lng, waypoints[0].lat];
      }
      if (members.length > 0) {
        return [members[0].lng, members[0].lat];
      }
      return initialCenter;
    }, [waypoints, members, initialCenter]);

    const zoom = useMemo(() => {
      if (waypoints.length > 1 || routeCoords.length > 0) return 9;
      return initialZoom;
    }, [waypoints.length, routeCoords.length, initialZoom]);

    const html = useMemo(() => {
      return buildMapHTML({
        center,
        zoom,
        waypoints,
        routeCoords,
        members,
        interactive,
        variant,
      });
    }, [center, zoom, waypoints, routeCoords, members, interactive, variant]);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MARKER_TAP' && data.memberId && onMarkerPress) {
          onMarkerPress(data.memberId);
        }
      } catch {
        // Ignored
      }
      onMessage?.(event);
    };

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={ref}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          onMessage={handleMessage}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#CD8554" />
            </View>
          )}
        />
      </View>
    );
  }
);

SharedGoongMap.displayName = 'SharedGoongMap';

const styles = StyleSheet.create({
  container: {
    backgroundColor: BRAND.mapBg,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: BRAND.mapBg,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND.mapBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SharedGoongMap;
