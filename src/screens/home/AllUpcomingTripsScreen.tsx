import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AllUpcomingTripsScreenNavigationProp } from '../../types/navigation';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

const ALL_TRIPS = [
  {
    id: '1',
    name: 'Cung đường Tây Bắc',
    date: '15 - 20 thg 11, 2024',
    distance: '850 km',
    weather: 'rainy',
    image: 'https://images.unsplash.com/photo-1549880181-56a44cf4a9a5?q=80&w=600',
  },
  {
    id: '2',
    name: 'Đà Lạt Sương khói',
    date: '15 - 20 thg 11, 2024',
    distance: '332 km',
    weather: 'rainy',
    image: 'https://images.unsplash.com/photo-1519098901909-b1553a1190af?q=80&w=600',
  },
  {
    id: '3',
    name: 'Tà Xùa Dấu Yêu',
    date: '25 - 27 thg 12, 2024',
    distance: '210 km',
    weather: 'rainy',
    image: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=600',
  },
  {
    id: '4',
    name: 'Biển xanh Phú Yên',
    date: '10 - 15 thg 01, 2025',
    distance: '550 km',
    weather: 'sunny',
    image: 'https://images.unsplash.com/photo-1533596664448-f4cce99db4b2?q=80&w=600',
  },
  {
    id: '5',
    name: 'Hành trình Vũng Tàu',
    date: '05 - 07 thg 02, 2025',
    distance: '120 km',
    weather: 'sunny',
    image: 'https://images.unsplash.com/photo-1582806297380-0a2a4b86fdf4?q=80&w=600',
  },
  {
    id: '6',
    name: 'Khám phá Mộc Châu',
    date: '14 - 18 thg 02, 2025',
    distance: '200 km',
    weather: 'cloudy',
    image: 'https://images.unsplash.com/photo-1562916604-035928d11623?q=80&w=600',
  }
];

const avatars = [
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150',
];

const AllUpcomingTripsScreen = () => {
  const navigation = useNavigation<AllUpcomingTripsScreenNavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#5D3A29" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả chuyến đi</Text>
        <View style={{ width: 24 }} /> {/* Cân bằng flex */}
      </View>

      <View style={styles.searchContainerFull}>
        <Feather name="search" size={18} color="#CD8554" />
        <TextInput 
          style={styles.searchInput}
          placeholder="Tìm chuyến đi..."
          placeholderTextColor="#A0938C"
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
        {ALL_TRIPS.map((trip) => (
          <TouchableOpacity 
            key={trip.id} 
            style={styles.upcomingCard}
            onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
          >
            <Image 
              source={{ uri: trip.image }} 
              style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]} 
            />
            {/* Lớp phủ đen để nổi bật chữ trắng */}
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14 }]} />

            <View style={styles.upcomingTopRow}>
              <View style={styles.upcomingInfoLeft}>
                <Text style={styles.upcomingTitle}>{trip.name}</Text>
                <View style={styles.dateRow}>
                  <Feather name="calendar" size={14} color="#EAEAEA" />
                  <Text style={styles.dateText}>{trip.date}</Text>
                </View>
              </View>
              <View style={styles.weatherCircle}>
                <Ionicons name={trip.weather === 'sunny' ? 'sunny' : trip.weather === 'cloudy' ? 'cloud' : 'rainy'} size={18} color="#FFF" />
              </View>
            </View>

            <View style={styles.upcomingBottomRow}>
              <View style={styles.avatarsWrapper}>
                {avatars.map((uri, index) => (
                  <Image 
                    key={index}
                    source={{ uri }}
                    style={[styles.smallAvatar, { marginLeft: index === 0 ? 0 : -10 }]}
                  />
                ))}
                <View style={[styles.moreAvatar, { marginLeft: -10 }]}>
                  <Text style={styles.moreAvatarText}>+4</Text>
                </View>
              </View>

              <View style={styles.distanceRow}>
                <MaterialCommunityIcons name="map-marker-path" size={16} color="#EAEAEA" />
                <Text style={styles.distanceText}>{trip.distance}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5D3A29',
  },
  searchContainerFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9DCCF',
    paddingHorizontal: 12,
    height: 48,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#5D3A29',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  upcomingCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  upcomingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  upcomingInfoLeft: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 13,
    color: '#EAEAEA',
  },
  weatherCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  upcomingBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  avatarsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#785640',
  },
  moreAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F4F4F4',
    borderWidth: 2,
    borderColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#555',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EAEAEA',
  }
});

export default AllUpcomingTripsScreen;
