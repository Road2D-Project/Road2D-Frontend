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
  hasSOS?: boolean;
}

export interface MapBranchRoute {
  id: string;
  name: string;
  color: string;
  coords: [number, number][]; // [[lng, lat], ...]
}

export interface SharedGoongMapProps {
  style?: StyleProp<ViewStyle>;
  initialCenter?: [number, number]; // [lng, lat]
  initialZoom?: number;
  waypoints?: MapWaypoint[];
  routeCoords?: [number, number][]; // [[lng, lat], ...]
  secondaryRouteCoords?: [number, number][]; // [[lng, lat], ...]
  branchRoutes?: MapBranchRoute[];
  searchedMarker?: { lat: number; lng: number } | null;
  members?: MapMember[];
  interactive?: boolean;
  variant?: 'brown' | 'default'; // 'brown': tone nâu sang trọng; 'default': style sáng nguyên bản của Goong
  onMarkerPress?: (memberId: string) => void;
  onMapLongPress?: (coord: { lat: number; lng: number }) => void;
  onMessage?: (event: WebViewMessageEvent) => void;
}

const BRAND = {
  mapBg: '#1A120B',          // Nền bản đồ nâu đen espresso sang trọng
  routeMain: '#E67E22',       // Tuyến chính cam đất Road2D sắc nét
  routeGlow: '#B86B30',       // Bóng đổ phát sáng cam nâu
  routeSecondary: '#FFC107',  // Tuyến đường phụ / tìm kiếm (Màu vàng sáng nổi bật)
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
  secondaryRouteCoords = [],
  branchRoutes = [],
  searchedMarker = null,
  members,
  interactive,
  variant = 'brown',
}: {
  center: [number, number];
  zoom: number;
  waypoints: MapWaypoint[];
  routeCoords: [number, number][];
  secondaryRouteCoords?: [number, number][];
  branchRoutes?: MapBranchRoute[];
  searchedMarker?: { lat: number; lng: number } | null;
  members: MapMember[];
  interactive: boolean;
  variant?: 'brown' | 'default';
}): string {
  const isBrown = variant === 'brown';
  const routeGeoJSON = JSON.stringify(routeCoords);
  const hasRoute = routeCoords.length >= 2;
  const secondaryGeoJSON = JSON.stringify(secondaryRouteCoords);
  const hasSecondaryRoute = secondaryRouteCoords.length >= 2;

  // Render Waypoint markers với tone màu nâu chủ đạo của Road2D và tag nhãn ở phía trên
  const waypointsJS = waypoints.map((wp, i) => {
    const isFirst = wp.type === 'start' || i === 0;
    const isLast = wp.type === 'end' || (i === waypoints.length - 1 && waypoints.length > 1);
    
    // Tag nhãn phía trên marker
    const tagText = wp.label ?? (isFirst ? 'Điểm xuất phát' : isLast ? 'Điểm đến' : `Trạm ${i}`);
    
    // Tone màu chuẩn Road2D: Xuất phát (#2E7D32 / #CD8554), Đích đến (#C62828 / #5C3A21), Trạm (#8D6E63)
    const pinColor = isFirst ? '#CD8554' : isLast ? '#5C3A21' : '#8D6E63';
    
    // Icon SVG bên trong pin (thay thế cho chữ A, B cũ)
    const iconSVG = isFirst
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><circle cx="12" cy="12" r="8"></circle></svg>'
      : isLast
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>'
      : `<span style="color:#FFF;font-size:11px;font-weight:700;">${i}</span>`;

    return `
      (function() {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;pointer-events:auto;user-select:none;';

        // Tag nhãn ở trên: "Điểm xuất phát", "Điểm đến", tên trạm
        var tag = document.createElement('div');
        tag.style.cssText = 'background:#FFFFFF;color:#5D3A29;font-weight:700;font-size:11px;padding:3px 9px;border-radius:12px;border:1.5px solid ${pinColor};box-shadow:0 3px 8px rgba(0,0,0,0.25);white-space:nowrap;margin-bottom:3px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;letter-spacing:0.2px;max-width:180px;overflow:hidden;text-overflow:ellipsis;';
        tag.textContent = ${JSON.stringify(tagText)};
        wrap.appendChild(tag);

        // Marker pin hình giọt nước xoay -45 độ màu nâu chủ đạo
        var pin = document.createElement('div');
        pin.style.cssText = 'width:28px;height:28px;border-radius:50% 50% 50% 0;background:${pinColor};transform:rotate(-45deg);border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.35);';

        var inner = document.createElement('div');
        inner.style.cssText = 'transform:rotate(45deg);display:flex;align-items:center;justify-content:center;';
        inner.innerHTML = ${JSON.stringify(iconSVG)};
        pin.appendChild(inner);

        wrap.appendChild(pin);

        new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
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

  const membersJS = `
    window.memberMarkers = window.memberMarkers || {};

    var createMemberMarker = function(m) {
      if (!m || !m.id || !m.lngLat) return null;
      if (window.memberMarkers[m.id]) return window.memberMarkers[m.id];

      var wrap = document.createElement('div');
      wrap.className = 'marker-wrap';

      var markerDiv = document.createElement('div');
      markerDiv.className = 'member-marker ' + (m.status || 'normal') + ' ' + (m.role || 'member');

      var img = document.createElement('img');
      img.src = m.avatar || 'https://ui-avatars.com/api/?name=User&background=CD853F&color=fff';
      img.alt = m.name || 'Member';
      markerDiv.appendChild(img);

      if (m.hasSOS || m.status === 'sos') {
        var sosBadge = document.createElement('div');
        sosBadge.className = 'sos-badge';
        sosBadge.innerHTML = '<svg width="22" height="20" viewBox="0 0 24 22" fill="#D32F2F" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L1 21h22L12 2z"></path><text x="12" y="17.5" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle" stroke="none">SOS</text></svg>';
        markerDiv.appendChild(sosBadge);
      } else if (m.status && m.status !== 'normal') {
        var isRedWarn = m.status === 'no_signal' || m.status === 'lost_and_no_signal';
        var warnColor = isRedWarn ? '#E53935' : '#757575';
        var warnBadge = document.createElement('div');
        warnBadge.className = 'warning-badge ' + (isRedWarn ? 'red' : 'grey');
        warnBadge.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + warnColor + '" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
        markerDiv.appendChild(warnBadge);
      }

      var triangle = document.createElement('div');
      triangle.className = 'marker-triangle ' + (m.status || 'normal');

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

      window.memberMarkers[m.id] = marker;
      return marker;
    };

    var MEMBERS = ${membersData};
    MEMBERS.forEach(function(m) {
      createMemberMarker(m);
    });

    window.isUserDragging = false;

    map.on('dragstart', function() {
      window.isUserDragging = true;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'USER_DRAG' }));
      }
    });

    map.on('touchstart', function() {
      window.isUserDragging = true;
    });

    map.on('movestart', function(e) {
      if (e && e.originalEvent) {
        window.isUserDragging = true;
      }
    });

    map.on('zoomstart', function(e) {
      if (e && e.originalEvent) {
        window.isUserDragging = true;
      }
    });

    var handleMessage = function(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'UPDATE_POSITION') {
          if (window.memberMarkers && window.memberMarkers[data.id]) {
            window.memberMarkers[data.id].setLngLat([data.lng, data.lat]);
            var markerElem = window.memberMarkers[data.id].getElement();
            if (markerElem && data.status) {
              var mDiv = markerElem.querySelector('.member-marker');
              var tri = markerElem.querySelector('.marker-triangle');
              if (mDiv) {
                mDiv.className = 'member-marker ' + data.status + ' ' + (data.role || 'member');
                var oldSos = mDiv.querySelector('.sos-badge');
                var oldWarn = mDiv.querySelector('.warning-badge');
                if (oldSos) oldSos.remove();
                if (oldWarn) oldWarn.remove();

                if (data.hasSOS || data.status === 'sos') {
                  var sBadge = document.createElement('div');
                  sBadge.className = 'sos-badge';
                  sBadge.innerHTML = '<svg width="22" height="20" viewBox="0 0 24 22" fill="#D32F2F" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L1 21h22L12 2z"></path><text x="12" y="17.5" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle" stroke="none">SOS</text></svg>';
                  mDiv.appendChild(sBadge);
                } else if (data.status && data.status !== 'normal') {
                  var isRedWarn = data.status === 'no_signal' || data.status === 'lost_and_no_signal';
                  var warnColor = isRedWarn ? '#E53935' : '#757575';
                  var warnBadge = document.createElement('div');
                  warnBadge.className = 'warning-badge ' + (isRedWarn ? 'red' : 'grey');
                  warnBadge.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + warnColor + '" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
                  mDiv.appendChild(warnBadge);
                }
              }
              if (tri) {
                tri.className = 'marker-triangle ' + data.status;
              }
            }
          } else {
            createMemberMarker({
              id: data.id,
              name: data.name || 'Thành viên',
              avatar: data.avatar || '',
              role: data.role || 'member',
              status: data.status || 'normal',
              hasSOS: data.hasSOS,
              lngLat: [data.lng, data.lat],
            });
          }
          if (data.isMe && data.flyTo === true && !window.isUserDragging) {
            map.flyTo({ center: [data.lng, data.lat], zoom: 15.5, speed: 0.5 });
          }
        } else if (data.type === 'FOCUS_ME' || data.type === 'RECENTER' || data.type === 'FLY_TO') {
          window.isUserDragging = false;
          map.flyTo({ center: [data.lng, data.lat], zoom: data.zoom || 15.5, speed: 1.2 });
        } else if (data.type === 'TRIGGER_SOS') {
          if (window.memberMarkers && window.memberMarkers[data.memberId]) {
            var markerElem = window.memberMarkers[data.memberId].getElement();
            var mDiv = markerElem.querySelector('.member-marker');
            if (mDiv && !mDiv.querySelector('.sos-badge')) {
              var sBadge = document.createElement('div');
              sBadge.className = 'sos-badge';
              sBadge.innerHTML = '<svg width="22" height="20" viewBox="0 0 24 22" fill="#D32F2F" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L1 21h22L12 2z"></path><text x="12" y="17.5" fill="#FFFFFF" font-size="7.5" font-weight="900" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" text-anchor="middle" stroke="none">SOS</text></svg>';
              mDiv.appendChild(sBadge);
            }
          }
        } else if (data.type === 'SHOW_SEARCHED_LOCATION') {
          if (window.searchedMarkerInstance) {
            window.searchedMarkerInstance.remove();
            window.searchedMarkerInstance = null;
          }
          var wrap = document.createElement('div');
          wrap.style.cssText = 'cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:center;';
          var pin = document.createElement('div');
          pin.style.cssText = 'width:28px;height:28px;border-radius:50% 50% 50% 0;background:#FFC107;transform:rotate(-45deg);border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.45);';
          var inner = document.createElement('div');
          inner.style.cssText = 'transform:rotate(45deg);display:flex;align-items:center;justify-content:center;';
          inner.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="#5D3A29"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
          pin.appendChild(inner);
          wrap.appendChild(pin);
          window.searchedMarkerInstance = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
            .setLngLat([data.lng, data.lat])
            .addTo(map);
          window.isUserDragging = false;
          map.flyTo({ center: [data.lng, data.lat], zoom: 15, speed: 1.2 });
        } else if (data.type === 'CLEAR_SEARCHED_LOCATION') {
          if (window.searchedMarkerInstance) {
            window.searchedMarkerInstance.remove();
            window.searchedMarkerInstance = null;
          }
        } else if (data.type === 'SET_SECONDARY_ROUTE') {
          // Xoá đường phụ cũ nếu có
          if (map.getLayer('secondary-route-glow')) map.removeLayer('secondary-route-glow');
          if (map.getSource('secondary-route')) {
            map.getSource('secondary-route').setData({
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: data.coords }
            });
          } else {
            map.addSource('secondary-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: data.coords }
              }
            });
            map.addLayer({
              id: 'secondary-route-main',
              type: 'line',
              source: 'secondary-route',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-color': '#FFC107',
                'line-width': 5.0,
                'line-opacity': 0.95
              }
            });
          }
          // Zoom out map để xem tổng quan đường từ mình tới điểm mới phát sinh đó
          if (data.coords && data.coords.length >= 2) {
            try {
              var sBounds = new maplibregl.LngLatBounds();
              for (var si = 0; si < data.coords.length; si += 2) {
                sBounds.extend(data.coords[si]);
              }
              sBounds.extend(data.coords[data.coords.length - 1]);
              map.fitBounds(sBounds, { padding: 80, maxZoom: 15 });
            } catch(e) {}
          }
        } else if (data.type === 'FOCUS_BRANCH' && data.coords && data.coords.length >= 2) {
          try {
            var fb = new maplibregl.LngLatBounds();
            for (var fbi = 0; fbi < data.coords.length; fbi += 2) {
              fb.extend(data.coords[fbi]);
            }
            fb.extend(data.coords[data.coords.length - 1]);
            map.fitBounds(fb, { padding: 70, maxZoom: 15 });
          } catch(e) {}
        } else if (data.type === 'CLEAR_SECONDARY_ROUTE') {
          if (map.getLayer('secondary-route-main')) map.removeLayer('secondary-route-main');
          if (map.getLayer('secondary-route-glow')) map.removeLayer('secondary-route-glow');
          if (map.getSource('secondary-route')) map.removeSource('secondary-route');
        } else if (data.type === 'UPDATE_BRANCHES' && Array.isArray(data.branches)) {
          data.branches.forEach(function(branch, idx) {
            if (!branch.coords || branch.coords.length < 2) return;
            var bId = 'branch-' + (branch.id || String(idx)).replace(/[^a-zA-Z0-9]/g, '_');
            var bColor = branch.color || '#2196F3';
            if (map.getSource(bId)) {
              map.getSource(bId).setData({
                type: 'Feature',
                properties: { name: branch.name || '' },
                geometry: { type: 'LineString', coordinates: branch.coords }
              });
            } else {
              map.addSource(bId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: { name: branch.name || '' },
                  geometry: { type: 'LineString', coordinates: branch.coords }
                }
              });
              var beforeRouteLayer = map.getLayer('route-glow') ? 'route-glow' : undefined;
              map.addLayer({
                id: bId + '-glow',
                type: 'line',
                source: bId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': bColor,
                  'line-width': 9.0,
                  'line-opacity': 0.35
                }
              }, beforeRouteLayer);
              map.addLayer({
                id: bId + '-main',
                type: 'line',
                source: bId,
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: {
                  'line-color': bColor,
                  'line-width': 5.2,
                  'line-opacity': 0.98
                }
              }, beforeRouteLayer);
            }
          });
        }
      } catch(e) {}
    };

    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
  `;

  // Fit bounds logic: Nếu 1 điểm thì focus điểm đó (zoom 15), từ 2 điểm hoặc có route/branches thì zoom out fitBounds
  const hasBranchesWithCoords = branchRoutes.some(b => b.coords && b.coords.length >= 2);
  const fitBoundsJS = (waypoints.length >= 2 || hasRoute || hasBranchesWithCoords) ? `
    try {
      var bounds = new maplibregl.LngLatBounds();
      ${waypoints.map(wp => `bounds.extend([${wp.lng}, ${wp.lat}]);`).join('\n')}
      ${hasRoute ? `
        var rCoords = ${routeGeoJSON};
        for (var k = 0; k < rCoords.length; k += 4) {
          bounds.extend(rCoords[k]);
        }
        if (rCoords.length > 0) bounds.extend(rCoords[rCoords.length - 1]);
      ` : ''}
      ${branchRoutes.map((b) => {
        if (!b.coords || b.coords.length < 2) return '';
        const step = Math.max(1, Math.floor(b.coords.length / 5));
        const samplePts = [];
        for (let si = 0; si < b.coords.length; si += step) {
          samplePts.push(b.coords[si]);
        }
        samplePts.push(b.coords[b.coords.length - 1]);
        return `
          (function() {
            var bSample = ${JSON.stringify(samplePts)};
            bSample.forEach(function(pt) { bounds.extend(pt); });
          })();
        `;
      }).join('\n')}
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    } catch(e) {}
  ` : (waypoints.length === 1 ? `
    try {
      map.flyTo({ center: [${waypoints[0].lng}, ${waypoints[0].lat}], zoom: 15, speed: 1.2 });
    } catch(e) {}
  ` : '');

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
    /* Mỗi lạc đường -> ÁM XÁM */
    .member-marker.lost {
      border-color: #757575 !important;
      box-shadow: 0 0 10px rgba(117, 117, 117, 0.75);
    }
    .member-marker.lost img {
      filter: grayscale(0.85) contrast(0.95);
    }
    .member-marker.lost::after {
      background: rgba(117, 117, 117, 0.45);
    }

    /* Mất sóng hoặc vừa lạc đường vừa mất sóng (ưu tiên mất sóng) -> ÁM ĐỎ */
    .member-marker.no_signal,
    .member-marker.lost_and_no_signal {
      border-color: #E53935 !important;
      box-shadow: 0 0 12px rgba(229, 57, 53, 0.75);
    }
    .member-marker.no_signal img,
    .member-marker.lost_and_no_signal img {
      filter: sepia(0.65) hue-rotate(-50deg) saturate(3.5) contrast(1.1);
    }
    .member-marker.no_signal::after,
    .member-marker.lost_and_no_signal::after {
      background: rgba(229, 57, 53, 0.45);
    }

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

    .warning-badge {
      position: absolute;
      top: -8px;
      left: -8px;
      z-index: 4;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));
    }
    .sos-badge {
      position: absolute;
      top: -8px;
      left: -8px;
      z-index: 5;
      filter: drop-shadow(0 2px 5px rgba(0,0,0,0.6));
      pointer-events: none;
    }

    .marker-wrap { display: flex; flex-direction: column; align-items: center; }
    .marker-triangle {
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 9px solid #FFFFFF;
      margin-top: -2px;
      transition: border-top-color 0.3s ease;
    }
    .marker-triangle.lost { border-top-color: #757575 !important; }
    .marker-triangle.no_signal { border-top-color: #E53935 !important; }
    .marker-triangle.lost_and_no_signal { border-top-color: #E53935 !important; }
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
    // 1. Tuyến đường đa nhánh (Vẽ bên dưới tuyến chính để không đè lên lộ trình chính của chuyến đi)
    ${branchRoutes.map((branch, idx) => {
      if (!branch.coords || branch.coords.length < 2) return '';
      const bGeoJSON = JSON.stringify(branch.coords);
      const bColor = branch.color || '#2196F3';
      const bId = `branch-${(branch.id || String(idx)).replace(/[^a-zA-Z0-9]/g, '_')}`;
      return `
        try {
          map.addSource('${bId}', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: { name: ${JSON.stringify(branch.name || '')} },
              geometry: { type: 'LineString', coordinates: ${bGeoJSON} }
            }
          });

          // Glow layer cho nhánh
          map.addLayer({
            id: '${bId}-glow',
            type: 'line',
            source: '${bId}',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '${bColor}',
              'line-width': 9.0,
              'line-opacity': 0.35
            }
          });

          // Main line layer cho nhánh
          map.addLayer({
            id: '${bId}-main',
            type: 'line',
            source: '${bId}',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': '${bColor}',
              'line-width': 5.2,
              'line-opacity': 0.98
            }
          });
        } catch(e) {}
      `;
    }).join('\n')}

    // 2. Tuyến đường phụ (Tìm kiếm / xem trước phụ)
    ${hasSecondaryRoute ? `
      map.addSource('secondary-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: ${secondaryGeoJSON} }
        }
      });
      map.addLayer({
        id: 'secondary-route-main',
        type: 'line',
        source: 'secondary-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#FFC107',
          'line-width': 5.0,
          'line-opacity': 0.95
        }
      });
    ` : ''}

    // 3. Tuyến đi chính của chuyến đi (Vẽ đè lên trên cùng để giữ nguyên vẹn dải màu tuyến chính)
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

    ${searchedMarker ? `
      (function() {
        var wrap = document.createElement('div');
        wrap.style.cssText = 'cursor:pointer;user-select:none;display:flex;align-items:center;justify-content:center;';
        var pin = document.createElement('div');
        pin.style.cssText = 'width:28px;height:28px;border-radius:50% 50% 50% 0;background:#6D3B1C;transform:rotate(-45deg);border:2px solid #FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.45);';
        var inner = document.createElement('div');
        inner.style.cssText = 'transform:rotate(45deg);display:flex;align-items:center;justify-content:center;';
        inner.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
        pin.appendChild(inner);
        wrap.appendChild(pin);
        window.searchedMarkerInstance = new maplibregl.Marker({ element: wrap, anchor: 'bottom' })
          .setLngLat([${searchedMarker.lng}, ${searchedMarker.lat}])
          .addTo(map);
      })();
    ` : ''}

    ${waypointsJS}
    ${membersJS}
    ${fitBoundsJS}

    // Long press handler (giữ tay 1.8s - 2.2s) để chọn toạ độ trên bản đồ
    var longPressTimer = null;
    var touchStartPoint = null;

    function clearLongPress() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    try {
      var canvas = map.getCanvas();
      canvas.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) {
          clearLongPress();
          return;
        }
        var touch = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        var point = [touch.clientX - rect.left, touch.clientY - rect.top];
        touchStartPoint = point;

        clearLongPress();
        longPressTimer = setTimeout(function() {
          try {
            var lngLat = map.unproject(point);
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'MAP_LONG_PRESS',
                lng: lngLat.lng,
                lat: lngLat.lat
              }));
            }
          } catch(err) {}
          clearLongPress();
        }, 1800);
      }, { passive: true });

      canvas.addEventListener('touchmove', function(e) {
        if (!touchStartPoint || e.touches.length !== 1) {
          clearLongPress();
          return;
        }
        var touch = e.touches[0];
        var rect = canvas.getBoundingClientRect();
        var dx = Math.abs(touch.clientX - rect.left - touchStartPoint[0]);
        var dy = Math.abs(touch.clientY - rect.top - touchStartPoint[1]);
        if (dx > 12 || dy > 12) {
          clearLongPress();
        }
      }, { passive: true });

      canvas.addEventListener('touchend', clearLongPress, { passive: true });
      canvas.addEventListener('touchcancel', clearLongPress, { passive: true });

      map.on('contextmenu', function(e) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_LONG_PRESS',
            lng: e.lngLat.lng,
            lat: e.lngLat.lat
          }));
        }
      });
    } catch(e) {}
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
      secondaryRouteCoords = [],
      branchRoutes = [],
      searchedMarker = null,
      members = [],
      interactive = true,
      variant = 'brown',
      onMarkerPress,
      onMapLongPress,
      onMessage,
    },
    ref
  ) => {
    const centerLng = waypoints.length > 0 ? waypoints[0].lng : initialCenter[0];
    const centerLat = waypoints.length > 0 ? waypoints[0].lat : initialCenter[1];

    const center: [number, number] = useMemo(() => {
      return [centerLng, centerLat];
    }, [centerLng, centerLat]);

    const zoom = useMemo(() => {
      if (waypoints.length === 1) return 15;
      if (waypoints.length > 1 || routeCoords.length > 0 || (branchRoutes && branchRoutes.length > 0)) return 10;
      return initialZoom;
    }, [waypoints.length, routeCoords.length, branchRoutes?.length, initialZoom]);

    const waypointsKey = useMemo(() => {
      return waypoints.map((w) => `${w.lng.toFixed(5)},${w.lat.toFixed(5)}`).join(';');
    }, [waypoints]);

    const routeCoordsKey = useMemo(() => {
      if (routeCoords.length === 0) return '';
      return `${routeCoords.length}_${routeCoords[0][0].toFixed(4)}_${routeCoords[routeCoords.length - 1][0].toFixed(4)}`;
    }, [routeCoords]);

    const secondaryRouteKey = useMemo(() => {
      if (secondaryRouteCoords.length === 0) return '';
      return `${secondaryRouteCoords.length}_${secondaryRouteCoords[0][0].toFixed(4)}_${secondaryRouteCoords[secondaryRouteCoords.length - 1][0].toFixed(4)}`;
    }, [secondaryRouteCoords]);

    const branchRoutesKey = useMemo(() => {
      if (!branchRoutes || branchRoutes.length === 0) return '';
      return branchRoutes.map((b) => `${b.id}_${b.color}_${b.coords?.length || 0}`).join(';');
    }, [branchRoutes]);

    const searchedMarkerKey = searchedMarker ? `${searchedMarker.lat.toFixed(5)},${searchedMarker.lng.toFixed(5)}` : '';

    const memberIdsKey = useMemo(() => {
      return members.map((m) => m.id).join(',');
    }, [members]);

    const html = useMemo(() => {
      return buildMapHTML({
        center,
        zoom,
        waypoints,
        routeCoords,
        secondaryRouteCoords,
        branchRoutes,
        searchedMarker,
        members,
        interactive,
        variant,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center[0], center[1], zoom, waypointsKey, routeCoordsKey, secondaryRouteKey, branchRoutesKey, searchedMarkerKey, memberIdsKey, interactive, variant]);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MARKER_TAP' && data.memberId && onMarkerPress) {
          onMarkerPress(data.memberId);
        } else if (data.type === 'MAP_LONG_PRESS' && onMapLongPress) {
          onMapLongPress({ lat: data.lat, lng: data.lng });
        }
      } catch {
        // Ignored
      }
      onMessage?.(event);
    };

    const webviewKey = useMemo(() => {
      const rcLen = routeCoords.length;
      const wpLen = waypoints.length;
      const brLen = branchRoutes ? branchRoutes.length : 0;
      const cStr = `${center[0].toFixed(3)}_${center[1].toFixed(3)}`;
      return `map_wv_${cStr}_${rcLen}_${wpLen}_${brLen}_${variant}`;
    }, [center[0], center[1], routeCoords.length, waypoints.length, branchRoutes?.length, variant]);

    return (
      <View style={[styles.container, style]}>
        <WebView
          key={webviewKey}
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
    ...StyleSheet.absoluteFill,
    backgroundColor: BRAND.mapBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SharedGoongMap;
