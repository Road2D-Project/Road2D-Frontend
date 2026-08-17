import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Platform, StatusBar, ScrollView, Alert } from 'react-native';
import { colors } from '../../theme/colors';

const MEMBERS_LOCATION = [
  { id: '1', name: 'Tôi', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150', left: '45%', top: '40%', isLeader: true },
  { id: '2', name: 'A', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150', left: '30%', top: '55%', isLeader: false },
  { id: '3', name: 'B', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150', left: '60%', top: '60%', isLeader: false },
];

const LiveTrackingScreen = () => {
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'

  return (
    <View style={styles.container}>
      {/* Map Background (Placeholder cho Google Maps sau này) */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800&auto=format&fit=crop' }} 
        style={styles.mapPlaceholder} 
      />

      {/* Lớp phủ làm tối bản đồ một chút để nổi icon */}
      <View style={styles.mapOverlay} />

      {/* Các marker của thành viên */}
      {MEMBERS_LOCATION.map((member) => (
        <View 
          key={member.id} 
          style={[styles.markerContainer, { left: member.left, top: member.top }]}
        >
          <View style={[styles.markerAvatarWrap, member.isLeader && styles.leaderMarkerWrap]}>
            <Image source={{ uri: member.avatar }} style={styles.markerAvatar} />
          </View>
          <View style={styles.markerPointer} />
        </View>
      ))}

      <SafeAreaView style={styles.safeArea}>
        {/* Header (Nút SOS và Settings) */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.sosButton} onPress={() => Alert.alert('SOS Khẩn Cấp', 'Bạn muốn gửi tín hiệu khẩn cấp đến ai?', [{text: 'Cảnh sát'}, {text: 'Cứu hộ xe'}, {text: 'Trưởng đoàn'}])}>
            <Image source={{ uri: 'https://img.icons8.com/ios-filled/24/FFFFFF/sos.png' }} style={styles.headerIcon} />
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}>
            <Image source={{ uri: viewMode === 'map' ? 'https://img.icons8.com/material-outlined/24/3E2723/list.png' : 'https://img.icons8.com/material-outlined/24/3E2723/map.png' }} style={styles.headerIcon} />
          </TouchableOpacity>
        </View>

        {viewMode === 'list' && (
          <ScrollView style={styles.listView}>
            <Text style={styles.listTitle}>Danh sách thành viên đoàn</Text>
            {MEMBERS_LOCATION.map((member) => (
              <View key={member.id} style={styles.memberListItem}>
                <Image source={{ uri: member.avatar }} style={styles.memberListAvatar} />
                <View style={styles.memberListInfo}>
                  <Text style={styles.memberListName}>{member.name} {member.isLeader && '⭐'}</Text>
                  <Text style={styles.memberListStatus}>Tốc độ: 45km/h • Đang chạy an toàn</Text>
                </View>
                <View style={styles.memberListStatusDot} />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Cửa sổ Popup Check-in (Mô phỏng) */}
        {showCheckIn && (
          <View style={styles.checkInPopup}>
            <Text style={styles.checkInTitle}>Đã đến Trạm 2: Đèo Chuối</Text>
            <Text style={styles.checkInDesc}>Tất cả thành viên hãy xác nhận check-in để tiếp tục!</Text>
            <TouchableOpacity style={styles.checkInConfirmBtn} onPress={() => setShowCheckIn(false)}>
              <Text style={styles.checkInConfirmText}>Check-in Ngay</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.spacer} />

        {/* Bottom Panel (Bảng thông tin hành trình) */}
        <View style={styles.bottomPanel}>
          <View style={styles.dragHandle} />
          
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.panelTitle}>Đang tới: Đèo Chuối</Text>
              <Text style={styles.panelSubtitle}>Trạm 2 • 85km</Text>
            </View>
            <View style={styles.speedBox}>
              <Text style={styles.speedValue}>45</Text>
              <Text style={styles.speedUnit}>km/h</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '60%' }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressText}>Đã đi: 50km</Text>
              <Text style={styles.progressText}>Còn lại: 35km</Text>
            </View>
          </View>

          <View style={styles.memberAvatarsRow}>
            <Text style={styles.memberStatusText}>Khoảng cách đoàn: <Text style={styles.safeStatus}>An toàn (2km)</Text></Text>
            <View style={styles.avatarsOverlap}>
              {MEMBERS_LOCATION.map((member, index) => (
                <Image 
                  key={member.id} 
                  source={{ uri: member.avatar }} 
                  style={[styles.smallAvatar, { left: index * -10, zIndex: 10 - index }]} 
                />
              ))}
            </View>
          </View>

          {/* Swipe-up Realtime Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBoxSmall}>
              <Text style={styles.statBoxVal}>3.5h</Text>
              <Text style={styles.statBoxLabel}>Đã lái</Text>
            </View>
            <View style={styles.statBoxSmall}>
              <Text style={styles.statBoxVal}>4</Text>
              <Text style={styles.statBoxLabel}>Trạm dừng</Text>
            </View>
            <View style={styles.statBoxSmall}>
              <Text style={styles.statBoxVal}>42</Text>
              <Text style={styles.statBoxLabel}>Km/h (TB)</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.arriveButton}
            onPress={() => setShowCheckIn(true)}
          >
            <Text style={styles.arriveButtonText}>Đã tới Trạm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFE8DE',
  },
  mapPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.2)', // Overlay sáng nhẹ
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -24 }, { translateY: -60 }], // Center marker
  },
  markerAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  leaderMarkerWrap: {
    backgroundColor: colors.primary, // Viền cam cho trưởng đoàn
  },
  markerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -2,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5252',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 6,
  },
  settingButton: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIcon: {
    width: 20,
    height: 20,
  },
  listView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.textPrimary,
  },
  memberListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberListAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  memberListInfo: {
    flex: 1,
  },
  memberListName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  memberListStatus: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  memberListStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  spacer: {
    flex: 1,
  },
  checkInPopup: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  checkInTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  checkInDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  checkInConfirmBtn: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  checkInConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  panelSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  speedBox: {
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  speedValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.primary,
  },
  speedUnit: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  memberAvatarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  memberStatusText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  safeStatus: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  avatarsOverlap: {
    flexDirection: 'row',
  },
  smallAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 16,
  },
  statBoxSmall: {
    alignItems: 'center',
  },
  statBoxVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statBoxLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  arriveButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arriveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default LiveTrackingScreen;
