import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

const UPCOMING_TRIPS = [
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
  }
];

// Placeholder avatars
const avatars = [
  'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150',
];

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const [isFabMenuVisible, setIsFabMenuVisible] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: isFabMenuVisible ? 1 : 0,
      duration: 350,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [isFabMenuVisible]);

  const qrOpacity = animation.interpolate({
    inputRange: [0, 0.3, 0.5],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const qrTranslateY = animation.interpolate({
    inputRange: [0, 0.3, 0.5],
    outputRange: [20, 20, 0],
    extrapolate: 'clamp',
  });

  const inviteOpacity = animation.interpolate({
    inputRange: [0, 0.25, 0.75],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const inviteTranslateY = animation.interpolate({
    inputRange: [0, 0.25, 0.75],
    outputRange: [20, 20, 0],
    extrapolate: 'clamp',
  });

  const newTripOpacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });
  const newTripTranslateY = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [20, 20, 0],
    extrapolate: 'clamp',
  });

  const fabRotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const overlayOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào,</Text>
            <Text style={styles.name}>Đức Anh</Text>
          </View>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}></View>
            <View style={styles.onlineBadge} />
          </View>
        </View>

        {/* Active Trip Card */}
        <TouchableOpacity
          style={styles.activeCard}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('LiveTracking')}
        >
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800' }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
          />
          {/* Lớp phủ đen nhạt hơn để ảnh rõ nét hơn */}
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16 }]} />

          <View style={styles.activeCardBgWatermarkContainer}>
            <Image
              source={require('../../assets/images/logoapp.png')}
              style={{ width: 160, height: 160, resizeMode: 'contain' }}
              tintColor="#FFFFFF"
            />
          </View>

          <View style={styles.statusRow}>
            <MaterialCommunityIcons name="target" size={14} color="#B7D9CA" />
            <View style={styles.greenDotStatus} />
            <Text style={styles.statusText}>ĐANG THAM GIA</Text>
          </View>

          <Text style={styles.activeCardTitle}>Hà Giang Loop 2024</Text>

          <View style={styles.progressRow}>
            <View style={[styles.dot, { backgroundColor: '#FF3B30' }]} />
            <Text style={styles.progressText}>Km 198/356</Text>
          </View>

          <View style={styles.progressRow}>
            <View style={[styles.dot, { backgroundColor: '#E08552' }]} />
            <Text style={styles.progressText}>Trạm dừng chân gần nhất còn 15 km</Text>
          </View>

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

          <View style={styles.continueBtn}>
            <Text style={styles.continueBtnText}>Tiếp tục hành trình </Text>
            <Feather name="arrow-right" size={18} color="#FFF" />
          </View>
        </TouchableOpacity>


        {/* Upcoming Trips Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>CHUYẾN ĐI SẮP TỚI</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AllUpcomingTrips')}>
            <Text style={styles.seeAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        {UPCOMING_TRIPS.map((trip) => (
          <TouchableOpacity
            key={trip.id}
            style={styles.upcomingCard}
            onPress={() => navigation.navigate('TripDetails')}
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
                <Ionicons name="rainy" size={18} color="#FFF" />
              </View>
            </View>

            <View style={styles.upcomingBottomRow}>
              <View style={styles.avatarsWrapper}>
                {avatars.map((uri, index) => (
                  <Image
                    key={index}
                    source={{ uri }}
                    style={[styles.smallAvatar, { marginLeft: index === 0 ? 0 : -10, width: 28, height: 28, borderRadius: 14 }]}
                  />
                ))}
                <View style={[styles.moreAvatar, { marginLeft: -10, width: 28, height: 28, borderRadius: 14, borderColor: '#444' }]}>
                  <Text style={[styles.moreAvatarText, { fontSize: 10 }]}>+4</Text>
                </View>
              </View>

              <View style={styles.distanceRow}>
                <MaterialCommunityIcons name="map-marker-path" size={16} color="#EAEAEA" />
                <Text style={styles.distanceText}>{trip.distance}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB Overlay Background */}
      <Animated.View
        style={[styles.modalOverlay, { opacity: overlayOpacity }]}
        pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
      >
        <TouchableWithoutFeedback onPress={() => setIsFabMenuVisible(false)}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* FAB and Items Container */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        {/* Item 3: Quét mã QR (Top) */}
        <Animated.View
          style={[styles.fabMenuItemContainer, { opacity: newTripOpacity, transform: [{ translateY: newTripTranslateY }] }]}
          pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity style={styles.fabMenuItem} onPress={() => setIsFabMenuVisible(false)}>
            <Text style={styles.fabMenuItemText}>Quét mã QR</Text>
            <View style={styles.fabMenuIcon}>
              <MaterialCommunityIcons name="qrcode-scan" size={20} color="#CD8554" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Item 2: Nhập mã mời (Middle) */}
        <Animated.View
          style={[styles.fabMenuItemContainer, { opacity: inviteOpacity, transform: [{ translateY: inviteTranslateY }] }]}
          pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity style={styles.fabMenuItem} onPress={() => setIsFabMenuVisible(false)}>
            <Text style={styles.fabMenuItemText}>Nhập mã mời</Text>
            <View style={styles.fabMenuIcon}>
              <MaterialCommunityIcons name="ticket-confirmation-outline" size={20} color="#CD8554" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Item 1: Tạo chuyến đi mới (Bottom) */}
        <Animated.View
          style={[styles.fabMenuItemContainer, { opacity: qrOpacity, transform: [{ translateY: qrTranslateY }] }]}
          pointerEvents={isFabMenuVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => {
              setIsFabMenuVisible(false);
              navigation.navigate('CreateTrip');
            }}
          >
            <Text style={styles.fabMenuItemText}>Tạo chuyến đi mới</Text>
            <View style={styles.fabMenuIcon}>
              <Feather name="plus" size={20} color="#CD8554" />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setIsFabMenuVisible(!isFabMenuVisible)}
        >
          <Animated.View style={{ transform: [{ rotate: fabRotation }] }}>
            <Feather name="plus" size={28} color="#FFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#7E7069',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5D3A29',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#D1CFC9',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FDFBF7',
  },

  // Active Card
  activeCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    position: 'relative',
    // Xóa backgroundColor cứng để hiển thị ảnh bìa
  },
  activeCardBgWatermarkContainer: {
    position: 'absolute',
    bottom: -15,
    right: -10,
    opacity: 0.1,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  greenDotStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34C759',
    marginHorizontal: 6,
  },
  statusText: {
    color: '#B7D9CA',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activeCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  progressText: {
    color: '#F4EBE3', // Làm sáng chữ để nổi hơn trên nền ảnh
    fontSize: 14,
    fontWeight: '500',
  },
  avatarsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#785640', // Giữ nguyên viền nâu cho hợp tone
  },
  moreAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F4F4F4',
    borderWidth: 2,
    borderColor: '#785640',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
  },
  continueBtn: {
    backgroundColor: 'rgba(205, 133, 84, 0.95)', // Nút cam hơi trong suốt để hiện thị tinh tế trên nền ảnh
    borderRadius: 12,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // FAB Container & Animations
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    zIndex: 11,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(205, 133, 84, 0.95)', // Trùng màu "Tiếp tục hành trình"
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    marginTop: 12, // Khoảng cách từ nút Quét QR xuống FAB
  },
  fabMenuItemContainer: {
    marginBottom: 16,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  fabMenuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  fabMenuIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Upcoming Trips
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#5D3A29',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A85A32',
    marginBottom: 2,
  },
  upcomingCard: {
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)', // Viền mờ đi vì đã có ảnh
    position: 'relative', // Cần thiết để chứa absolute ảnh bìa
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
    color: '#FFFFFF', // Đổi sang trắng để nổi bật trên nền đen
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
    color: '#EAEAEA', // Đổi sáng trắng xám
  },
  weatherCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)', // Bán trong suốt
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

export default HomeScreen;
