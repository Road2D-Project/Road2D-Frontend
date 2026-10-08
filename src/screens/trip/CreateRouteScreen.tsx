import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, TextInput, ScrollView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import type { CreateRouteScreenNavigationProp } from '../../types/navigation';
import { colors } from '../../theme/colors';

const CreateRouteScreen = () => {
  const navigation = useNavigation<CreateRouteScreenNavigationProp>();
  const [markers, setMarkers] = useState<any[]>([]);
  const webviewRef = React.useRef<WebView>(null);

  const goongMapKey = process.env.EXPO_PUBLIC_GOONG_MAP_KEY || '';

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ADD_MARKER') {
        setMarkers(prev => {
          if (prev.length < 10) return [...prev, data.coordinate];
          return prev;
        });
      }
    } catch (e) {}
  };

  const removeMarker = (index: number) => {
    setMarkers(prev => prev.filter((_, i) => i !== index));
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ type: 'REMOVE_MARKER', index }));
    }
  };
  
  const clearAllMarkers = () => {
    setMarkers([]);
    if (webviewRef.current) {
      webviewRef.current.postMessage(JSON.stringify({ type: 'CLEAR' }));
    }
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
    <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js"></script>
    <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css" rel="stylesheet" />
    <style>
        body { margin: 0; padding: 0; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        /* Ẩn logo goong nếu cần */
        .goongjs-ctrl-logo { display: none !important; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        goongjs.accessToken = '${goongMapKey}';
        var map = new goongjs.Map({
            container: 'map',
            style: 'https://tiles.goong.io/assets/goong_map_web.json',
            center: [105.8542, 21.0285],
            zoom: 12
        });

        var mapMarkers = [];

        function updateLine() {
            var coords = mapMarkers.map(function(m) { return [m.getLngLat().lng, m.getLngLat().lat]; });
            if (map.getSource('route')) {
                map.getSource('route').setData({
                    type: 'Feature',
                    properties: {},
                    geometry: { type: 'LineString', coordinates: coords }
                });
            } else if (coords.length > 1) {
                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: { type: 'LineString', coordinates: coords }
                    }
                });
                map.addLayer({
                    id: 'route',
                    type: 'line',
                    source: 'route',
                    layout: { 'line-join': 'round', 'line-cap': 'round' },
                    paint: { 'line-color': '${colors.primary}', 'line-width': 5 }
                });
            }
        }
        
        map.on('click', function(e) {
            if (mapMarkers.length < 10) {
                var coord = e.lngLat;
                var marker = new goongjs.Marker({ color: '${colors.primary}' })
                    .setLngLat(coord)
                    .addTo(map);
                mapMarkers.push(marker);
                updateLine();
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'ADD_MARKER',
                    coordinate: { latitude: coord.lat, longitude: coord.lng }
                }));
            }
        });

        document.addEventListener('message', function(event) {
            var msg = JSON.parse(event.data);
            if (msg.type === 'CLEAR') {
                mapMarkers.forEach(function(m) { m.remove(); });
                mapMarkers = [];
                updateLine();
            } else if (msg.type === 'REMOVE_MARKER') {
                var index = msg.index;
                if (mapMarkers[index]) {
                    mapMarkers[index].remove();
                    mapMarkers.splice(index, 1);
                    updateLine();
                }
            }
        });
        window.addEventListener('message', function(event) {
            var msg = JSON.parse(event.data);
            if (msg.type === 'CLEAR') {
                mapMarkers.forEach(function(m) { m.remove(); });
                mapMarkers = [];
                updateLine();
            } else if (msg.type === 'REMOVE_MARKER') {
                var index = msg.index;
                if (mapMarkers[index]) {
                    mapMarkers[index].remove();
                    mapMarkers.splice(index, 1);
                    updateLine();
                }
            }
        });
    </script>
</body>
</html>
  `;

  const getMarkerLabel = (index: number) => {
    if (index === 0) return "Điểm đầu";
    if (index === markers.length - 1 && markers.length > 1) return "Điểm cuối";
    return `Trạm dừng ${index}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo Lộ Trình Mới</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.container} bounces={false}>
        <View style={styles.mapContainer}>
          <WebView
            ref={webviewRef}
            source={{ html: htmlContent }}
            style={styles.mapBg}
            onMessage={handleMessage}
            scrollEnabled={false}
          />
          <View style={styles.instructionBanner} pointerEvents="none">
            <Text style={styles.instructionText}>
              {markers.length === 0 ? "Chạm bản đồ để chọn Điểm Đầu" :
               markers.length === 1 ? "Chạm bản đồ để chọn Điểm Dừng hoặc Cuối" :
               markers.length === 2 ? "Chạm bản đồ để chọn Điểm Cuối" : "Đã chọn xong lộ trình"}
            </Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Các Điểm Đã Chọn</Text>
            {markers.length > 0 && (
              <TouchableOpacity onPress={clearAllMarkers}>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Xoá tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {markers.length === 0 && (
            <Text style={{color: colors.textSecondary, fontStyle: 'italic', marginBottom: 20}}>Chưa có điểm nào được chọn.</Text>
          )}
          {markers.map((m, i) => (
             <View key={i} style={[styles.stopCard, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
               <View style={styles.stopHeader}>
                 <View style={styles.pinSmall}><Text style={styles.pinSmallText}>{i+1}</Text></View>
                 <Text style={styles.stopName}>{getMarkerLabel(i)}</Text>
               </View>
               <TouchableOpacity onPress={() => removeMarker(i)}>
                 <Ionicons name="trash-outline" size={22} color={colors.primary} />
               </TouchableOpacity>
             </View>
          ))}

          <TouchableOpacity 
            style={[styles.primaryBtn, { marginTop: 20, opacity: markers.length >= 2 ? 1 : 0.5 }]} 
            disabled={markers.length < 2}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Hoàn tất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, justifyContent: 'center'
  },
  backIcon: { width: 24, height: 24 },
  headerTitle: {
    fontSize: 18, fontWeight: 'bold', color: colors.textPrimary
  },
  container: { flex: 1 },
  mapContainer: { width: '100%', height: 450, position: 'relative' },
  detailsContainer: { padding: 20 },
  scrollContent: {
    padding: 20,
  },
  mapBg: {
    position: 'absolute', width: '100%', height: '100%'
  },
  mapOverlay: {
    position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.2)'
  },
  instructionBanner: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFF', fontWeight: 'bold'
  },
  mapMarker: {
    position: 'absolute'
  },
  pin: {
    backgroundColor: colors.primary,
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF'
  },
  pinText: { color: '#FFF', fontWeight: 'bold' },
  fakePolyline: {
    position: 'absolute', top: '40%', left: '30%',
    width: 150, height: 100, borderTopWidth: 4, borderRightWidth: 4,
    borderColor: colors.primary,
    transform: [{ rotate: '15deg' }]
  },
  bottomPanel: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#FFF', padding: 24,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, elevation: 10
  },
  totalKmText: {
    fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 16, textAlign: 'center'
  },
  kmHighlight: { color: colors.primary, fontWeight: 'bold', fontSize: 24 },
  primaryBtn: {
    backgroundColor: colors.primary, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center'
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 20
  },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, marginBottom: 20
  },
  uploadBox: {
    height: 140, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, overflow: 'hidden'
  },
  uploadedImg: { width: '100%', height: '100%' },
  cameraIcon: { width: 32, height: 32, marginBottom: 8, opacity: 0.5 },
  uploadText: { color: colors.textSecondary },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  label: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20
  },
  chipText: { color: colors.textPrimary, fontWeight: '500' },
  stopCard: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center'
  },
  stopHeader: { flexDirection: 'row', alignItems: 'center' },
  pinSmall: {
    backgroundColor: colors.primary, width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  pinSmallText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  stopName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  stopInput: {
    backgroundColor: '#F9F6F0', borderRadius: 8, paddingHorizontal: 12, height: 40
  },
  addStopBtn: {
    alignItems: 'center', paddingVertical: 16, borderWidth: 1, borderColor: colors.primary,
    borderStyle: 'dashed', borderRadius: 12, marginTop: 8
  },
  addStopText: { color: colors.primary, fontWeight: 'bold' },
  previewCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 30
  },
  previewCover: { width: '100%', height: 150, backgroundColor: '#E0E0E0' },
  previewCoverImg: { width: '100%', height: 150 },
  previewTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, padding: 16, paddingBottom: 4 },
  previewDesc: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 16, paddingBottom: 16 }
});

export default CreateRouteScreen;
