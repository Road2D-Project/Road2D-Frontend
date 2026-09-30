import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ─── Brand colors — đồng bộ với HomeScreen ────────────────────────────────────
const C = {
  primary:    '#CD8554',   // Nâu cam — dùng ở button "Tiếp tục hành trình"
  primaryDark:'#A85A32',   // Nâu cam đậm hơn — accent, "Xem tất cả"
  heading:    '#5D3A29',   // Nâu đậm — dùng cho tiêu đề lớn HomeScreen
  text:       '#3E2723',   // Gần đen nâu — body text
  sub:        '#6D4C41',   // Nâu trung — thay thế textSecondary nhạt
  bg:         '#FDFBF7',   // Kem nhạt — background app
  card:       '#FFFFFF',
  border:     '#E0D5CC',
  success:    '#4CAF50',
  error:      '#E53935',
};

// ─── Mock data ─────────────────────────────────────────────────────────────────
const PROFILE = {
  name: 'Phượt Thủ Yêu Đời',
  username: '@phuot_yeudoi',
  bio: 'Đam mê xê dịch · Hà Nội → khắp nơi',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200',
  cover: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=800',
  vehicle: 'Honda Winner X 150cc',
  vehicleId: 'Biển 30A-456.78',
  level: 'Phượt Thủ Cấp 3',
  xp: 4200,
  xpNext: 5000,
  stats: { trips: 12, km: 3500, friends: 150, moments: 28 },
};

const RECENT_TRIPS = [
  { id: '1', name: 'Tà Xùa săn mây', km: 285, image: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=200', rating: 5 },
  { id: '2', name: 'Hà Giang Loop', km: 350, image: 'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=200', rating: 5 },
  { id: '3', name: 'Đà Lạt - Nha Trang', km: 130, image: 'https://images.unsplash.com/photo-1568853118939-f9f257ceeeeb?q=80&w=200', rating: 4 },
];

const BADGES = [
  { id: '1', label: '1000 km', icon: 'ribbon-outline' as const },
  { id: '2', label: 'Săn mây', icon: 'cloud-outline' as const },
  { id: '3', label: 'Hà Giang', icon: 'map-outline' as const },
  { id: '4', label: 'Night ride', icon: 'moon-outline' as const },
];

const MENU_ITEMS = [
  { icon: 'bookmark-outline' as const, label: 'Cung đường đã lưu', onPress: () => Alert.alert('Đã lưu', 'Bạn có 3 cung đường đã lưu.') },
  { icon: 'people-outline' as const, label: 'Danh sách bạn bè', onPress: () => Alert.alert('Bạn bè', '150 bạn bè') },
  { icon: 'shield-checkmark-outline' as const, label: 'Danh bạ khẩn cấp SOS', onPress: () => Alert.alert('SOS', 'Tính năng danh bạ khẩn cấp.') },
  { icon: 'notifications-outline' as const, label: 'Thông báo', onPress: () => Alert.alert('Thông báo', 'Cài đặt thông báo') },
  { icon: 'lock-closed-outline' as const, label: 'Quyền riêng tư', onPress: () => Alert.alert('Quyền riêng tư', 'Cài đặt quyền riêng tư') },
];

// ─── Screen ────────────────────────────────────────────────────────────────────
const ProfileScreen = () => {
  const [isFollowing, setIsFollowing] = useState(false);
  const xpPercent = (PROFILE.xp / PROFILE.xpNext) * 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: PROFILE.cover }} style={styles.coverImage} />
          {/* Dark gradient overlay */}
          <View style={styles.coverGradient} />
          <TouchableOpacity
            style={styles.settingsOverlay}
            onPress={() => Alert.alert('Cài đặt', 'Tính năng đang cập nhật!')}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Avatar + Name */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: PROFILE.avatar }} style={styles.avatar} />
              <View style={styles.levelBadge}>
                <Ionicons name="star" size={9} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.nameBlock}>
              <Text style={styles.name}>{PROFILE.name}</Text>
              <Text style={styles.username}>{PROFILE.username}</Text>
            </View>
          </View>

          <Text style={styles.bio}>{PROFILE.bio}</Text>

          {/* XP bar */}
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>{PROFILE.level}</Text>
            <Text style={styles.xpLabel}>{PROFILE.xp.toLocaleString()} / {PROFILE.xpNext.toLocaleString()} XP</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpPercent}%` as any }]} />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { value: PROFILE.stats.trips, label: 'Chuyến đi' },
              { value: PROFILE.stats.km.toLocaleString(), label: 'Km đã đi' },
              { value: PROFILE.stats.moments, label: 'Khoảnh khắc' },
              { value: PROFILE.stats.friends, label: 'Bạn bè' },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => Alert.alert('Chỉnh sửa', 'Tính năng đang được cập nhật!')}
            >
              <Ionicons name="pencil-outline" size={16} color="#FFFFFF" />
              <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={() => setIsFollowing((v) => !v)}
            >
              <Ionicons
                name={isFollowing ? 'checkmark' : 'person-add-outline'}
                size={15}
                color={isFollowing ? C.sub : C.primary}
              />
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle */}
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIconWrap}>
              <Ionicons name="bicycle-outline" size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.vehicleName}>{PROFILE.vehicle}</Text>
              <Text style={styles.vehicleId}>{PROFILE.vehicleId}</Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Đổi xe', 'Chọn phương tiện khác')}>
              <Text style={styles.changeVehicle}>Đổi xe</Text>
            </TouchableOpacity>
          </View>

          {/* Badges */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Huy hiệu</Text>
            <View style={styles.badgesRow}>
              {BADGES.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View style={styles.badgeIcon}>
                    <Ionicons name={badge.icon} size={22} color={C.primary} />
                  </View>
                  <Text style={styles.badgeLabel}>{badge.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Recent trips */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Chuyến đi gần đây</Text>
              <TouchableOpacity>
                <Text style={styles.seeAll}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {RECENT_TRIPS.map((trip) => (
                <TouchableOpacity key={trip.id} style={styles.tripCard}>
                  <Image source={{ uri: trip.image }} style={styles.tripImage} />
                  <Text style={styles.tripName} numberOfLines={1}>{trip.name}</Text>
                  <Text style={styles.tripKm}>{trip.km} km</Text>
                  <View style={styles.tripStars}>
                    {Array.from({ length: trip.rating }).map((_, i) => (
                      <Ionicons key={i} name="star" size={10} color={C.primary} />
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Menu */}
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Tài khoản</Text>
            {MENU_ITEMS.map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={20} color={C.primary} />
                  </View>
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={C.border} />
              </TouchableOpacity>
            ))}

            {/* Logout */}
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', [
                { text: 'Huỷ', style: 'cancel' },
                { text: 'Đăng xuất', style: 'destructive' },
              ])}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#FDECEA' }]}>
                  <Ionicons name="log-out-outline" size={20} color={C.error} />
                </View>
                <Text style={[styles.menuText, { color: C.error }]}>Đăng xuất</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // Cover
  coverContainer: { width: '100%', height: 200, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30,10,0,0.25)',
  },
  settingsOverlay: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 38,
    height: 38,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Body
  body: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // Avatar row
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: -48,
    marginBottom: 12,
  },
  avatarContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: C.bg,
    position: 'relative',
    shadowColor: C.heading,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 41 },
  levelBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  nameBlock: { marginLeft: 14, flex: 1, paddingBottom: 4 },
  name: { fontSize: 20, fontWeight: '800', color: C.heading },
  username: { fontSize: 13, color: C.sub, marginTop: 2 },

  bio: {
    fontSize: 14,
    color: C.sub,
    marginBottom: 16,
    lineHeight: 20,
  },

  // XP
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  levelLabel: { fontSize: 13, fontWeight: '700', color: C.primaryDark },
  xpLabel: { fontSize: 12, color: C.sub },
  xpBarBg: {
    width: '100%',
    height: 7,
    backgroundColor: '#E0D5CC',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: C.primary,
    borderRadius: 4,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 18,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: C.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: C.heading, marginBottom: 2 },
  statLabel: { fontSize: 11, color: C.sub, fontWeight: '500' },
  statDivider: { width: 1, height: 30, backgroundColor: C.border },

  // Actions
  actionsRow: { flexDirection: 'row', marginBottom: 16, gap: 10 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: C.primary,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  editBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    height: 46,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  followingBtn: { borderColor: C.border, backgroundColor: '#F5F0EC' },
  followBtnText: { color: C.primary, fontWeight: '700', fontSize: 14 },
  followingBtnText: { color: C.sub },

  // Vehicle
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.heading,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  vehicleIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleName: { fontSize: 14, fontWeight: '700', color: C.text },
  vehicleId: { fontSize: 12, color: C.sub, marginTop: 2 },
  changeVehicle: { fontSize: 13, color: C.primary, fontWeight: '600' },

  // Section cards
  sectionCard: {
    backgroundColor: C.card,
    width: '100%',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: C.heading,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.heading },
  seeAll: { fontSize: 13, color: C.primaryDark, fontWeight: '600' },

  // Badges
  badgesRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  badgeItem: { alignItems: 'center', gap: 6 },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8D0BC',
  },
  badgeLabel: { fontSize: 11, color: C.sub, fontWeight: '600', textAlign: 'center' },

  // Recent trips
  tripCard: { width: 130, marginRight: 12 },
  tripImage: { width: 130, height: 90, borderRadius: 12, marginBottom: 6 },
  tripName: { fontSize: 13, fontWeight: '700', color: C.text, marginBottom: 2 },
  tripKm: { fontSize: 11, color: C.sub, marginBottom: 3 },
  tripStars: { flexDirection: 'row', gap: 2 },

  // Menu
  menuContainer: {
    backgroundColor: C.card,
    width: '100%',
    borderRadius: 20,
    padding: 16,
    shadowColor: C.heading,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  menuTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.sub,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0EC',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FDF0E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: { fontSize: 15, fontWeight: '500', color: C.text },

  // re-export for border color ref
  border: { borderColor: C.border },
});

export default ProfileScreen;
