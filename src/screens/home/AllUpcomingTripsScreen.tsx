import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { AllUpcomingTripsScreenNavigationProp } from '../../types/navigation';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../../store/useTripStore';

const C = {
  primary: '#CD8554',
  primaryDark: '#A85A32',
  heading: '#5D3A29',
  text: '#3E2723',
  sub: '#6D4C41',
  bg: '#FDFBF7',
  card: '#FFFFFF',
  border: '#E8D0BC',
  borderLight: '#F0E6DE',
  success: '#4CAF50',
  warning: '#FF9800',
};

function formatTripDate(isoString?: string): string {
  if (!isoString) return 'Chưa định ngày';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Chưa định ngày';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Chưa định ngày';
  }
}

const AllUpcomingTripsScreen = () => {
  const navigation = useNavigation<AllUpcomingTripsScreenNavigationProp>();

  const trips = useTripStore((s) => s.trips);
  const fetchTrips = useTripStore((s) => s.fetchTrips);
  const loading = useTripStore((s) => s.loading);

  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTrips();
    }, [fetchTrips])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTrips();
    setRefreshing(false);
  }, [fetchTrips]);

  const filteredTrips = trips.filter((t) =>
    t.name?.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={C.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tất cả chuyến đi</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainerFull}>
        <Feather name="search" size={18} color={C.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm chuyến đi..."
          placeholderTextColor="#A0938C"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#A0938C" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {loading && trips.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Đang tải chuyến đi...</Text>
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="map-outline" size={36} color={C.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {search.trim() ? 'Không tìm thấy chuyến đi' : 'Chưa có chuyến đi nào'}
            </Text>
            <Text style={styles.emptySub}>
              {search.trim()
                ? `Không có chuyến đi nào phù hợp với từ khóa "${search}".`
                : 'Bạn chưa tạo hoặc tham gia chuyến đi nào. Hãy tạo chuyến đi mới ngay!'}
            </Text>
            {!search.trim() && (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => navigation.navigate('CreateTrip')}
              >
                <Feather name="plus" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.createBtnText}>Tạo chuyến đi mới</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTrips.map((trip) => {
            const isActive = trip.status === 'ACTIVE' || (trip.status as string) === 'active';
            const isLocked = trip.status === 'LOCKED' || (trip.status as string) === 'locked';

            return (
              <TouchableOpacity
                key={trip.id}
                style={styles.upcomingCard}
                activeOpacity={0.88}
                onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
              >
                <Image
                  source={{
                    uri:
                      trip.coverImage ||
                      'https://images.unsplash.com/photo-1549880181-56a44cf4a9a5?q=80&w=600',
                  }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                />
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.48)', borderRadius: 14 }]} />

                <View style={styles.upcomingTopRow}>
                  <View style={styles.upcomingInfoLeft}>
                    <Text style={styles.upcomingTitle} numberOfLines={1}>
                      {trip.name}
                    </Text>
                    <View style={styles.dateRow}>
                      <Feather name="calendar" size={14} color="#EAEAEA" />
                      <Text style={styles.dateText}>{formatTripDate(trip.startAt)}</Text>
                    </View>
                  </View>
                  {(isActive || isLocked) && (
                    <View
                      style={[
                        styles.statusPill,
                        isActive
                          ? { backgroundColor: C.success }
                          : { backgroundColor: '#795548' },
                      ]}
                    >
                      <Text style={styles.statusPillText}>
                        {isActive ? 'ĐANG DIỄN RA' : 'ĐÃ CHỐT'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.upcomingBottomRow}>
                  <View style={styles.bottomMetaRow}>
                    <Feather name="users" size={14} color="#EAEAEA" style={{ marginRight: 4 }} />
                    <Text style={styles.bottomMetaText}>
                      {Math.max(trip.members?.length || 2, 2)}/{trip.maxMembers} thành viên
                    </Text>
                    <Text style={styles.bottomMetaDivider}>•</Text>
                    <MaterialCommunityIcons name="motorbike" size={14} color="#EAEAEA" style={{ marginRight: 4 }} />
                    <Text style={styles.bottomMetaText}>{trip.vehicle || 'Xe máy'}</Text>
                  </View>

                  <View style={styles.distanceRow}>
                    <MaterialCommunityIcons name="map-marker-path" size={16} color="#EAEAEA" />
                    <Text style={styles.distanceText}>{trip.distanceKm > 0 ? trip.distanceKm : 15} km</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.heading,
  },
  searchContainerFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5EE',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: C.heading,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: C.sub,
  },
  emptyBox: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  upcomingCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
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
    marginRight: 10,
  },
  upcomingTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#EAEAEA',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  upcomingBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomMetaText: {
    fontSize: 12,
    color: '#EAEAEA',
    fontWeight: '500',
  },
  bottomMetaDivider: {
    color: '#EAEAEA',
    marginHorizontal: 6,
    fontSize: 12,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EAEAEA',
  },
});

export default AllUpcomingTripsScreen;
