import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Image, ScrollView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

const ROUTES = [
  { id: '1', name: 'Hà Giang Loop', rating: 4.8, reviews: 247, km: 285, tags: ['Khó', 'Đường núi'], riders: 12, image: 'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=300' },
  { id: '2', name: 'Bàu Trắng - Mũi Né', rating: 4.5, reviews: 120, km: 65, tags: ['Cảnh đẹp', 'Dễ'], riders: 5, image: 'https://images.unsplash.com/photo-1549880181-56a44cf4a9a5?q=80&w=300' },
];

const ExploreMapScreen = () => {
  const navigation = useNavigation<any>();
  const [activeFilter, setActiveFilter] = useState('Gần tôi');

  return (
    <View style={styles.container}>
      {/* Fake Map Background */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800' }} 
        style={styles.mapBackground} 
      />
      
      {/* Dark overlay to simulate night/brown map style */}
      <View style={styles.mapOverlay} />

      {/* Map Polyline Simulation */}
      <View style={styles.fakePolyline} />

      {/* Map Markers */}
      <View style={[styles.mapMarker, { top: '30%', left: '40%' }]}>
        <View style={styles.markerPill}>
          <Text style={styles.markerPillText}>Hà Giang Loop 4.8</Text>
        </View>
      </View>
      
      <View style={[styles.mapMarker, { top: '45%', left: '60%' }]}>
        <View style={styles.dotRider} />
        <View style={styles.dotPill}>
          <Text style={styles.dotPillText}>12 riders đang đi đây</Text>
        </View>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Top Search & Filters */}
        <View style={styles.topSection}>
          <View style={styles.searchBar}>
            <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/FF9800/search.png' }} style={styles.searchIcon} />
            <TextInput 
              placeholder="Tìm kiếm tuyến đường..." 
              placeholderTextColor="#A0938C"
              style={styles.searchInput}
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['Gần tôi', 'Trending', 'Đã lưu', 'Đang có rider'].map((filter) => (
              <TouchableOpacity 
                key={filter} 
                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>{filter}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ flex: 1 }} />

        {/* Bottom Sheet */}
        <View style={styles.bottomSheet}>
          <View style={styles.dragHandle} />
          
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Tuyến nổi bật gần bạn</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardsScroll}>
            {ROUTES.map(route => (
              <TouchableOpacity key={route.id} style={styles.routeCard} onPress={() => navigation.navigate('TripDetails')}>
                <Image source={{ uri: route.image }} style={styles.cardImage} />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{route.name}</Text>
                  
                  <View style={styles.cardStatsRow}>
                    <Text style={styles.cardStatText}>{route.km} km</Text>
                    <Text style={styles.cardStatText}>{route.rating} ({route.reviews})</Text>
                  </View>

                  <View style={styles.tagsRow}>
                    <View style={styles.riderTag}>
                      <View style={styles.dotSmall} />
                      <Text style={styles.riderTagText}>{route.riders} riders</Text>
                    </View>
                    {route.tags.map(tag => (
                      <View key={tag} style={styles.tagPill}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.createRouteBtn} onPress={() => navigation.navigate('CreateRoute')}>
            <Text style={styles.createRouteText}>Tạo chuyến mới</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3E2723',
  },
  mapBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  mapOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(62, 39, 35, 0.4)', // Nâu mờ
  },
  fakePolyline: {
    position: 'absolute',
    top: '25%',
    left: '20%',
    width: 200,
    height: 150,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderColor: 'rgba(255, 152, 0, 0.5)',
    borderBottomLeftRadius: 50,
    transform: [{ rotate: '-15deg' }],
  },
  mapMarker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  dotRider: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 4,
  },
  dotPill: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dotPillText: {
    fontSize: 10,
    color: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 30, 0.85)',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
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
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  cardsScroll: {
    paddingLeft: 20,
    marginBottom: 20,
  },
  routeCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 120,
  },
  cardInfo: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardStatsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  cardStatText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginRight: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  riderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 4,
  },
  riderTagText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  tagPill: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  createRouteBtn: {
    backgroundColor: '#3E2723', // Nâu đậm
    marginHorizontal: 20,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createRouteText: {
    color: colors.primary, // Chữ cam
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ExploreMapScreen;
