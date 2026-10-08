import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import MapView, { UrlTile, Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

/**
 * Goong Maps tile URL — dùng key từ .env.local (export ra process.env khi Expo start).
 * Fallback về key cố định để dev không bị chặn.
 * Format: https://tiles.goong.io/assets/goong_map_web.json?api_key=KEY
 * Nhưng với react-native-maps UrlTile cần TileServer URL dạng XYZ:
 * https://mt0.googleapis.com/vt?x={x}&y={y}&z={z} (Google)
 * Goong dùng Mapbox-style vector tiles, không hỗ trợ trực tiếp UrlTile.
 * Thay vào đó dùng react-native-maps với provider=google hoặc default OpenStreetMap tile.
 */
const GOONG_MAP_KEY = process.env.EXPO_PUBLIC_GOONG_MAP_KEY ?? '';
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

// Goong tile endpoint (raster tiles - fallback)
const GOONG_RASTER_URL = `https://tiles.goong.io/assets/goong_map_web/{z}/{x}/{y}.png?api_key=${GOONG_MAP_KEY}`;

// ─── Mock route data ───────────────────────────────────────────────────────────

interface RouteCard {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  km: number;
  tags: string[];
  riders: number;
  image: string;
  coords: { latitude: number; longitude: number };
}

const ROUTES: RouteCard[] = [
  {
    id: '1',
    name: 'Hà Giang Loop',
    rating: 4.8,
    reviews: 247,
    km: 350,
    tags: ['Khó', 'Đường núi'],
    riders: 12,
    image: 'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=300',
    coords: { latitude: 23.1524, longitude: 104.9795 },
  },
  {
    id: '2',
    name: 'Bàu Trắng - Mũi Né',
    rating: 4.5,
    reviews: 120,
    km: 65,
    tags: ['Cảnh đẹp', 'Dễ'],
    riders: 5,
    image: 'https://images.unsplash.com/photo-1549880181-56a44cf4a9a5?q=80&w=300',
    coords: { latitude: 11.085, longitude: 108.244 },
  },
  {
    id: '3',
    name: 'Tà Xùa - Săn Mây',
    rating: 4.9,
    reviews: 183,
    km: 285,
    tags: ['Mây mù', 'Camping'],
    riders: 8,
    image: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=300',
    coords: { latitude: 21.2167, longitude: 104.5667 },
  },
  {
    id: '4',
    name: 'Đà Lạt - Nha Trang',
    rating: 4.3,
    reviews: 95,
    km: 130,
    tags: ['Đèo Ngoạn Mục', 'Trung bình'],
    riders: 3,
    image: 'https://images.unsplash.com/photo-1568853118939-f9f257ceeeeb?q=80&w=300',
    coords: { latitude: 11.6543, longitude: 108.3 },
  },
];

// Mock polyline Hà Giang loop (simplified)
const HA_GIANG_POLYLINE = [
  { latitude: 22.82, longitude: 104.98 },
  { latitude: 23.05, longitude: 105.3 },
  { latitude: 23.28, longitude: 105.36 },
  { latitude: 23.37, longitude: 105.13 },
  { latitude: 23.14, longitude: 105.63 },
  { latitude: 23.15, longitude: 105.97 },
];

const FILTERS = ['Gần tôi', 'Trending', 'Đã lưu', 'Đang có rider'];

// ─── Screen ────────────────────────────────────────────────────────────────────

const ExploreMapScreen = () => {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState('Gần tôi');
  const [selectedRoute, setSelectedRoute] = useState<RouteCard | null>(null);

  // Initial region — Trung tâm Việt Nam
  const initialRegion = {
    latitude: 16.5,
    longitude: 107.5,
    latitudeDelta: 8,
    longitudeDelta: 6,
  };

  return (
    <View style={styles.container}>
      {/* ── MAP VIEW ── */}
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsCompass={false}
        showsScale={false}
      >
        {/* Goong raster tile layer */}
        <UrlTile
          urlTemplate={GOONG_RASTER_URL}
          maximumZ={19}
          flipY={false}
          tileSize={256}
        />

        {/* Route markers */}
        {ROUTES.map((route) => (
          <Marker
            key={route.id}
            coordinate={route.coords}
            onPress={() => setSelectedRoute(route)}
          >
            <View style={styles.markerPill}>
              <Text style={styles.markerPillText}>
                {route.name.split(' ')[0]} {route.rating}
              </Text>
            </View>
          </Marker>
        ))}

        {/* Mock Hà Giang polyline */}
        <Polyline
          coordinates={HA_GIANG_POLYLINE}
          strokeColor="rgba(205, 133, 63, 0.8)"
          strokeWidth={3}
        />
      </MapView>

      {/* ── SAFE AREA OVERLAY ── */}
      <SafeAreaView style={styles.safeArea} pointerEvents="box-none">
        {/* Top: Search + filters */}
        <View style={styles.topSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#A0938C" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Tìm kiếm tuyến đường..."
              placeholderTextColor="#A0938C"
              style={styles.searchInput}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        {/* Bottom Sheet */}
        <View style={styles.bottomSheet}>
          <View style={styles.dragHandle} />

          {selectedRoute ? (
            /* ── Selected Route Detail ── */
            <View>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{selectedRoute.name}</Text>
                <TouchableOpacity onPress={() => setSelectedRoute(null)}>
                  <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
                <TouchableOpacity
                  style={styles.routeCard}
                  onPress={() => navigation.navigate('TripDetails')}
                >
                  <Image source={{ uri: selectedRoute.image }} style={styles.cardImage} />
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{selectedRoute.name}</Text>
                    <View style={styles.cardStatsRow}>
                      <Text style={styles.cardStatText}>{selectedRoute.km} km</Text>
                      <Text style={styles.cardStatText}>
                        {selectedRoute.rating} ({selectedRoute.reviews} đánh giá)
                      </Text>
                    </View>
                    <View style={styles.tagsRow}>
                      <View style={styles.riderTag}>
                        <View style={styles.dotSmall} />
                        <Text style={styles.riderTagText}>{selectedRoute.riders} riders</Text>
                      </View>
                      {selectedRoute.tags.map((tag) => (
                        <View key={tag} style={styles.tagPill}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              </ScrollView>
              <TouchableOpacity
                style={styles.createRouteBtn}
                onPress={() => navigation.navigate('CreateRoute')}
              >
                <Text style={styles.createRouteText}>Tạo chuyến mới từ tuyến này</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Default: Featured routes ── */
            <View>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Tuyến nổi bật gần bạn</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAll}>Xem tất cả</Text>
                </TouchableOpacity>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
                {ROUTES.map((route) => (
                  <TouchableOpacity
                    key={route.id}
                    style={styles.routeCard}
                    onPress={() => {
                      setSelectedRoute(route);
                      navigation.navigate('TripDetails');
                    }}
                  >
                    <Image source={{ uri: route.image }} style={styles.cardImage} />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardTitle}>{route.name}</Text>
                      <View style={styles.cardStatsRow}>
                        <Text style={styles.cardStatText}>{route.km} km</Text>
                        <Text style={styles.cardStatText}>
                          {route.rating} ({route.reviews})
                        </Text>
                      </View>
                      <View style={styles.tagsRow}>
                        <View style={styles.riderTag}>
                          <View style={styles.dotSmall} />
                          <Text style={styles.riderTagText}>{route.riders} riders</Text>
                        </View>
                        {route.tags.map((tag) => (
                          <View key={tag} style={styles.tagPill}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.createRouteBtn}
                onPress={() => navigation.navigate('CreateRoute')}
              >
                <Text style={styles.createRouteText}>Tạo chuyến mới</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#3E2723' },
  map: { ...StyleSheet.absoluteFillObject },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Top overlay
  topSection: { paddingHorizontal: 16, paddingTop: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 20, 15, 0.88)',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  filterScroll: { flexDirection: 'row' },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  filterChipTextActive: { color: '#FFFFFF' },

  // Marker
  markerPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  markerPillText: { fontSize: 11, fontWeight: 'bold', color: colors.textPrimary },

  // Bottom sheet
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  seeAll: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  cardsScroll: { paddingLeft: 20, marginBottom: 20 },
  routeCard: {
    width: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 120 },
  cardInfo: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  cardStatsRow: { flexDirection: 'row', marginBottom: 8, gap: 10 },
  cardStatText: { fontSize: 12, color: colors.textSecondary },
  tagsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  riderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  riderTagText: { fontSize: 10, color: '#2E7D32', fontWeight: 'bold' },
  tagPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: { fontSize: 10, color: colors.textSecondary },

  createRouteBtn: {
    backgroundColor: colors.textPrimary,
    marginHorizontal: 20,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createRouteText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
});

export default ExploreMapScreen;
