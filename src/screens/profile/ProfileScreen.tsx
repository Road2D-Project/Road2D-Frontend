import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

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
  stats: {
    trips: 12,
    km: 3500,
    friends: 150,
    moments: 28,
  },
};

const RECENT_TRIPS = [
  { id: '1', name: 'Tà Xùa săn mây', km: 285, image: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=200', rating: 5 },
  { id: '2', name: 'Hà Giang Loop', km: 350, image: 'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=200', rating: 5 },
  { id: '3', name: 'Đà Lạt - Nha Trang', km: 130, image: 'https://images.unsplash.com/photo-1568853118939-f9f257ceeeeb?q=80&w=200', rating: 4 },
];

const BADGES = [
  { id: '1', label: '1000 km', icon: 'ribbon-outline' },
  { id: '2', label: 'Săn mây', icon: 'cloud-outline' },
  { id: '3', label: 'Hà Giang', icon: 'map-outline' },
  { id: '4', label: 'Night ride', icon: 'moon-outline' },
];

// ─── Screen ────────────────────────────────────────────────────────────────────

const ProfileScreen = () => {
  const [isFollowing, setIsFollowing] = useState(false);
  const xpPercent = (PROFILE.xp / PROFILE.xpNext) * 100;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: PROFILE.cover }} style={styles.coverImage} />
          {/* Settings button overlay */}
          <TouchableOpacity
            style={styles.settingsOverlay}
            onPress={() => Alert.alert('Cài đặt', 'Tính năng đang cập nhật!')}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <Image source={{ uri: PROFILE.avatar }} style={styles.avatar} />
            <View style={styles.levelBadge}>
              <Ionicons name="star" size={10} color="#FFFFFF" />
            </View>
          </View>

          {/* Name + username */}
          <Text style={styles.name}>{PROFILE.name}</Text>
          <Text style={styles.username}>{PROFILE.username}</Text>
          <Text style={styles.bio}>{PROFILE.bio}</Text>

          {/* Level + XP bar */}
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>{PROFILE.level}</Text>
            <Text style={styles.xpLabel}>{PROFILE.xp} / {PROFILE.xpNext} XP</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpPercent}%` }]} />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{PROFILE.stats.trips}</Text>
              <Text style={styles.statLabel}>Chuyến đi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{PROFILE.stats.km.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Km đã đi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{PROFILE.stats.moments}</Text>
              <Text style={styles.statLabel}>Khoảnh khắc</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{PROFILE.stats.friends}</Text>
              <Text style={styles.statLabel}>Bạn bè</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => Alert.alert('Chỉnh sửa', 'Tính năng đang được cập nhật!')}
            >
              <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={() => setIsFollowing((v) => !v)}
            >
              <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vehicle info */}
          <View style={styles.vehicleCard}>
            <Ionicons name="bicycle-outline" size={22} color={colors.primary} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.vehicleName}>{PROFILE.vehicle}</Text>
              <Text style={styles.vehicleId}>{PROFILE.vehicleId}</Text>
            </View>
            <TouchableOpacity>
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
                    <Ionicons name={badge.icon as any} size={22} color={colors.primary} />
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
                      <Ionicons key={i} name="star" size={10} color={colors.primary} />
                    ))}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Settings Menu */}
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Tài khoản</Text>

            {[
              { icon: 'bookmark-outline', label: 'Cung đường đã lưu', onPress: () => Alert.alert('Đã lưu', 'Bạn có 3 cung đường đã lưu.') },
              { icon: 'people-outline', label: 'Danh sách bạn bè', onPress: () => Alert.alert('Bạn bè', '150 bạn bè') },
              { icon: 'shield-checkmark-outline', label: 'Danh bạ khẩn cấp SOS', onPress: () => Alert.alert('SOS', 'Tính năng danh bạ khẩn cấp.') },
              { icon: 'notifications-outline', label: 'Thông báo', onPress: () => Alert.alert('Thông báo', 'Cài đặt thông báo') },
              { icon: 'lock-closed-outline', label: 'Quyền riêng tư', onPress: () => Alert.alert('Quyền riêng tư', 'Cài đặt quyền riêng tư') },
            ].map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} style={{ marginRight: 14 }} />
                  <Text style={styles.menuText}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D7CCC8" />
              </TouchableOpacity>
            ))}

            {/* Logout */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?')}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} style={{ marginRight: 14 }} />
                <Text style={[styles.menuText, { color: colors.error }]}>Đăng xuất</Text>
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
    backgroundColor: colors.background,
  },
  coverContainer: { width: '100%', height: 180, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  settingsOverlay: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 38,
    height: 38,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileSection: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFFFFF',
    padding: 3,
    marginTop: -48,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
  levelBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: { fontSize: 22, fontWeight: 'bold', color: colors.textPrimary },
  username: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 4 },
  bio: { fontSize: 14, color: colors.textSecondary, marginBottom: 12, textAlign: 'center' },

  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  levelLabel: { fontSize: 13, fontWeight: '700', color: colors.primary },
  xpLabel: { fontSize: 12, color: colors.textSecondary },
  xpBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },

  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: 'bold', color: colors.primary, marginBottom: 2 },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },

  actionsRow: { flexDirection: 'row', width: '100%', marginBottom: 16, gap: 12 },
  editBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  followBtn: {
    width: 110,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  followingBtn: { backgroundColor: colors.cardBg, borderColor: colors.border },
  followBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
  followingBtnText: { color: colors.textSecondary },

  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  vehicleId: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  changeVehicle: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 14 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  badgesRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  badgeItem: { alignItems: 'center', gap: 6 },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  badgeLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', textAlign: 'center' },

  tripCard: { width: 130, marginRight: 12 },
  tripImage: { width: 130, height: 90, borderRadius: 12, marginBottom: 6 },
  tripName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  tripKm: { fontSize: 11, color: colors.textSecondary, marginBottom: 3 },
  tripStars: { flexDirection: 'row', gap: 2 },

  menuContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
});

export default ProfileScreen;
