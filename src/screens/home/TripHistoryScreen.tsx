import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { TripHistoryScreenNavigationProp } from '../../types/navigation';
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

const TripHistoryScreen = () => {
  const navigation = useNavigation<TripHistoryScreenNavigationProp>();

  const trips = useTripStore((s) => s.trips);
  const completedTripIds = useTripStore((s) => s.completedTripIds);
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

  // Các chuyến đi đã đi (hoàn thành)
  const pastTrips = useMemo(() => {
    return trips.filter(
      (t) => t.status === 'COMPLETED' || completedTripIds.includes(t.id)
    );
  }, [trips, completedTripIds]);

  // Lọc theo thanh tìm kiếm
  const filteredPastTrips = useMemo(() => {
    if (!search.trim()) return pastTrips;
    const q = search.trim().toLowerCase();
    return pastTrips.filter((t) => t.name?.toLowerCase().includes(q));
  }, [pastTrips, search]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={C.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử chuyến đi</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{pastTrips.length}</Text>
        </View>
      </View>

      {/* Thanh tìm kiếm chuyến đi đã đi */}
      <View style={styles.searchContainerFull}>
        <Feather name="search" size={18} color={C.primary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm chuyến đi trong lịch sử..."
          placeholderTextColor="#A0938C"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={18} color="#A0938C" />
          </TouchableOpacity>
        )}
      </View>

      {/* Danh sách chuyến đi */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
      >
        {loading && trips.length === 0 ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Đang tải lịch sử chuyến đi...</Text>
          </View>
        ) : filteredPastTrips.length === 0 ? (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconWrap}>
              <MaterialCommunityIcons
                name={search.trim() ? 'magnify' : 'flag-checkered'}
                size={34}
                color={C.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {search.trim() ? 'Không tìm thấy chuyến đi' : 'Chưa có chuyến đi nào trong lịch sử'}
            </Text>
            <Text style={styles.emptySub}>
              {search.trim()
                ? `Không có chuyến đi nào trong lịch sử phù hợp với từ khóa "${search}".`
                : 'Khi bạn hoàn thành hành trình hoặc dừng chuyến đi, các chuyến đi đó sẽ xuất hiện tại đây.'}
            </Text>
          </View>
        ) : (
          filteredPastTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              activeOpacity={0.88}
              onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
            >
              <Image
                source={{
                  uri:
                    trip.coverImage ||
                    'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=600',
                }}
                style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
              />
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14 },
                ]}
              />

              <View style={styles.tripTopRow}>
                <View style={styles.tripInfoLeft}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={styles.completedTag}>
                      <Ionicons
                        name="checkmark-done"
                        size={12}
                        color="#FFF"
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.completedTagText}>ĐÃ HOÀN THÀNH</Text>
                    </View>
                  </View>
                  <Text style={styles.tripTitle} numberOfLines={1}>
                    {trip.name}
                  </Text>
                  <View style={styles.dateRow}>
                    <Feather name="calendar" size={13} color="#EAEAEA" />
                    <Text style={styles.dateText}>{formatTripDate(trip.startAt)}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.tripBottomRow}>
                <View style={styles.bottomMetaRow}>
                  <Feather name="users" size={13} color="#EAEAEA" style={{ marginRight: 4 }} />
                  <Text style={styles.bottomMetaText}>
                    {trip.members?.length ?? trip.currentMembers ?? 1}/{trip.maxMembers}
                  </Text>
                  <Text style={styles.bottomMetaDivider}>•</Text>
                  <MaterialCommunityIcons
                    name="motorbike"
                    size={14}
                    color="#EAEAEA"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.bottomMetaText}>{trip.vehicle || 'Xe máy'}</Text>
                </View>

                <View style={styles.distanceRow}>
                  <MaterialCommunityIcons name="map-marker-path" size={15} color="#EAEAEA" />
                  <Text style={styles.distanceText}>
                    {trip.distanceKm > 0 ? trip.distanceKm : 15} km
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default TripHistoryScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    backgroundColor: C.card,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FAF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.heading,
  },
  countBadge: {
    backgroundColor: '#FAF5EE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primaryDark,
  },
  searchContainerFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 14,
    color: C.heading,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: C.sub,
    marginTop: 10,
  },
  emptyBox: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderLight,
    marginTop: 20,
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
    fontWeight: '700',
    color: C.heading,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  tripCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    minHeight: 140,
    justifyContent: 'space-between',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8D0BC',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tripTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tripInfoLeft: {
    flex: 1,
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5D3A29',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  completedTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  tripTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
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
    fontWeight: '500',
  },
  tripBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomMetaText: {
    fontSize: 12,
    color: '#EAEAEA',
    fontWeight: '600',
  },
  bottomMetaDivider: {
    marginHorizontal: 6,
    color: '#EAEAEA',
    fontSize: 10,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    color: '#EAEAEA',
    fontWeight: '700',
  },
});
