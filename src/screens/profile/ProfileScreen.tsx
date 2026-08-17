import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { colors } from '../../theme/colors';

const ProfileScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600' }} style={styles.coverImage} />
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150' }} style={styles.avatar} />
          </View>
          
          <Text style={styles.name}>Phượt Thủ Yêu Đời</Text>
          <Text style={styles.bio}>Đam mê xê dịch, thích ngắm hoàng hôn.</Text>
          
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Chuyến đi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>3,500</Text>
              <Text style={styles.statLabel}>Km đã đi</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>150</Text>
              <Text style={styles.statLabel}>Bạn bè</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => Alert.alert('Chỉnh sửa', 'Tính năng đang được cập nhật!')}>
              <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => Alert.alert('Cài đặt', 'Tính năng cài đặt hệ thống!')}>
              <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/3E2723/settings.png' }} style={styles.settingsIcon} />
            </TouchableOpacity>
          </View>

          {/* Settings List */}
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>Chung</Text>
            
            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Đã lưu', 'Bạn có 3 tuyến đường đã lưu.')}>
              <View style={styles.menuItemLeft}>
                <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/795548/bookmark-ribbon.png' }} style={styles.menuIcon} />
                <Text style={styles.menuText}>Cung đường đã lưu</Text>
              </View>
              <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/D7CCC8/forward.png' }} style={styles.forwardIcon} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('SOS', 'Tính năng danh bạ khẩn cấp.')}>
              <View style={styles.menuItemLeft}>
                <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/795548/shield.png' }} style={styles.menuIcon} />
                <Text style={styles.menuText}>Danh bạ khẩn cấp SOS</Text>
              </View>
              <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/D7CCC8/forward.png' }} style={styles.forwardIcon} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?')}>
              <View style={styles.menuItemLeft}>
                <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/FF5252/exit.png' }} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: '#FF5252' }]}>Đăng xuất</Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  coverContainer: {
    width: '100%',
    height: 180,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  profileSection: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    padding: 4,
    marginTop: -50,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 32,
    gap: 16,
  },
  editBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  settingsBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsIcon: {
    width: 24,
    height: 24,
  },
  menuContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 16,
    marginLeft: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  forwardIcon: {
    width: 20,
    height: 20,
  }
});

export default ProfileScreen;
