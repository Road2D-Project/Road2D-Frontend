import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { TripDetailsScreenNavigationProp } from '../../types/navigation';
import { colors } from '../../theme/colors';

const TIMELINE_DATA = [
  { id: '1', title: 'Km 0: Xuất phát', desc: 'Hà Giang', type: 'start' },
  { id: '2', title: 'Km 46: Cây xăng Quản Bạ', desc: '[Mở 6h-22h]', type: 'stop' },
  { id: '3', title: 'Km 55: Cổng Trời Quản Bạ', desc: '[Nghỉ 15-30p] ⭐4.9', type: 'photo' },
  { id: '4', title: 'Km 85: Quán Phở Yên Minh', desc: '[Recommended] Phở gà 35k', type: 'food' },
  { id: '5', title: 'Km 165: Đèo Mã Pì Lèng', desc: '⚠️ Đường hẹp, đi chậm', type: 'warning' },
];

const TripDetailsScreen = () => {
  const navigation = useNavigation<TripDetailsScreenNavigationProp>();
  const [activeTab, setActiveTab] = useState('Tổng quan');
  const [isSaved, setIsSaved] = useState(false);

  const renderTabs = () => {
    const tabs = ['Tổng quan', 'Điểm dừng', 'Plan', 'Review', 'Thời tiết'];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {tabs.map((tab) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderTongQuan = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Mô tả tuyến</Text>
      <Text style={styles.descText}>Cung đường huyền thoại của núi rừng Đông Bắc, cảnh sắc hùng vĩ, những đoạn đèo uốn lượn liên tục.</Text>
      
      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Cảnh báo đặc biệt</Text>
        <Text style={styles.warningText}>Đoạn Đồng Văn - Mèo Vạc nhiều đá dăm mùa mưa, sương mù dày đặc vào sáng sớm.</Text>
      </View>

      <Text style={styles.sectionTitle}>Loại xe phù hợp</Text>
      <View style={styles.tagsRow}>
        <Text style={styles.vehicleTag}>✓ Xe số</Text>
        <Text style={styles.vehicleTag}>✓ Côn tay</Text>
        <Text style={[styles.vehicleTag, { color: '#FF9800', backgroundColor: '#FFF3E0' }]}>⚠️ Tay ga</Text>
      </View>

      <Text style={styles.sectionTitle}>Chi phí ước tính</Text>
      <View style={styles.costBox}>
        <Text style={styles.costItem}>⛽ Xăng: ~180k</Text>
        <Text style={styles.costItem}>🏨 Khách sạn: ~300k/đêm</Text>
        <Text style={styles.costItem}>🍜 Ăn uống: ~150k/ngày</Text>
      </View>
    </View>
  );

  const renderDiemDung = () => (
    <View style={styles.tabContent}>
      <View style={styles.timelineContainer}>
        {TIMELINE_DATA.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, item.type === 'start' ? styles.dotPrimary : item.type === 'warning' ? styles.dotWarning : {}]} />
              {index < TIMELINE_DATA.length - 1 && <View style={styles.timelineLine} />}
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{item.title}</Text>
              <Text style={styles.timelineDesc}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderReview = () => (
    <View style={styles.tabContent}>
      <View style={styles.reviewOverview}>
        <Text style={styles.ratingBig}>4.8</Text>
        <View style={styles.stars}>
          <Text style={styles.starText}>⭐⭐⭐⭐⭐</Text>
          <Text style={styles.reviewCount}>Dựa trên 247 đánh giá</Text>
        </View>
      </View>
      
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150' }} style={styles.reviewerAvatar} />
          <View>
            <Text style={styles.reviewerName}>Hoàng Nam</Text>
            <Text style={styles.reviewMeta}>Xe côn tay • Đi 2 tuần trước</Text>
          </View>
        </View>
        <Text style={styles.reviewText}>Cung đường đẹp tuyệt vời nhưng đèo dốc khá gắt. Khuyên anh em tay lái yếu nên đi chậm đoạn Mèo Vạc. Nên đi vào mùa Thu để ngắm tam giác mạch!</Text>
        <View style={styles.reviewImages}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1627885444654-e67c87c4bfda?q=80&w=300' }} style={styles.reviewImg} />
          <Image source={{ uri: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?q=80&w=300' }} style={styles.reviewImg} />
        </View>
      </View>
    </View>
  );

  const renderWeather = () => (
    <View style={styles.tabContent}>
      <View style={styles.weatherAlert}>
        <Text style={styles.weatherAlertText}>⚠️ Mưa rải rác vào sáng sớm tại Mèo Vạc</Text>
      </View>
      
      {['Hôm nay', 'Ngày mai', 'Ngày mốt'].map((day, idx) => (
        <View key={idx} style={styles.weatherRow}>
          <Text style={styles.weatherDay}>{day}</Text>
          <Ionicons
            name={idx === 0 ? 'partly-sunny' : 'sunny'}
            size={28}
            color={idx === 0 ? '#78909C' : '#FFC107'}
            style={styles.weatherIcon}
          />
          <View style={styles.weatherTemp}>
            <Text style={styles.tempHigh}>22°</Text>
            <Text style={styles.tempLow}>16°</Text>
          </View>
          <Text style={styles.weatherRain}>{idx === 0 ? '60% mưa' : '10% mưa'}</Text>
        </View>
      ))}
    </View>
  );
  const renderPlan = () => (
    <View style={styles.tabContent}>
      <View style={styles.planCard}>
        <Text style={styles.planAuthor}>Tạo bởi: Tuấn Đạt • 3 ngày trước</Text>
        <Text style={styles.planTitle}>Plan 2 ngày cho nhóm 5 xe côn tay</Text>
        <Text style={styles.planPreview}>Ngày 1: HG → Đồng Văn (130km){'\n'}Ngày 2: ĐV → Mèo Vạc → HG</Text>
        <View style={styles.planFooter}>
          <Text style={styles.planStats}>▲ 247  💬 38  🔀 Fork 12</Text>
          <TouchableOpacity style={styles.forkBtn}><Text style={styles.forkText}>Fork về dùng</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=600' }} style={styles.headerImage} />
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.breadcrumb}>Hà Giang • Tây Bắc</Text>
          <Text style={styles.title}>Hà Giang Loop</Text>
          
          <View style={styles.statsRow}>
            <Text style={styles.statChip}>🛣️ 285 km</Text>
            <Text style={styles.statChip}>⏱️ 2-3 ngày</Text>
            <Text style={styles.statChip}>⭐ 4.8 (247)</Text>
          </View>

          <View style={styles.tagsRow}>
            <Text style={styles.tagPill}>Khó 🔴</Text>
            <Text style={styles.tagPill}>Cảnh đẹp 📸</Text>
            <Text style={styles.tagPill}>Đường núi</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.saveBtn, isSaved && styles.saveBtnActive]} 
              onPress={() => setIsSaved(!isSaved)}
            >
              <Text style={[styles.saveBtnText, isSaved && styles.saveBtnTextActive]}>
                {isSaved ? '❤️ Đã lưu' : '🤍 Lưu tuyến'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useBtn} onPress={() => navigation.navigate('CreateTrip')}>
              <Text style={styles.useBtnText}>🏍️ Dùng tuyến này</Text>
            </TouchableOpacity>
          </View>

          {renderTabs()}

          {activeTab === 'Tổng quan' && renderTongQuan()}
          {activeTab === 'Điểm dừng' && renderDiemDung()}
          {activeTab === 'Plan' && renderPlan()}
          {activeTab === 'Review' && renderReview()}
          {activeTab === 'Thời tiết' && renderWeather()}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  imageContainer: { width: '100%', height: 280 },
  headerImage: { width: '100%', height: '100%' },
  backButton: { position: 'absolute', top: Platform.OS === 'android' ? StatusBar.currentHeight! + 10 : 50, left: 20, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  infoSection: { backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, padding: 24, minHeight: 500 },
  breadcrumb: { fontSize: 12, color: colors.primary, fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  statChip: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  tagPill: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, color: colors.textSecondary },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  saveBtn: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveBtnActive: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  saveBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  saveBtnTextActive: { color: '#D32F2F' },
  useBtn: { flex: 2, backgroundColor: colors.primary, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  useBtnText: { fontSize: 15, fontWeight: 'bold', color: '#FFF' },
  tabScroll: { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 20 },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  activeTabText: { color: colors.primary, fontWeight: 'bold' },
  tabContent: { paddingBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8, marginTop: 16 },
  descText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  warningBox: { backgroundColor: '#FFEBEE', padding: 12, borderRadius: 12, marginTop: 12 },
  warningTitle: { color: '#D32F2F', fontWeight: 'bold', marginBottom: 4 },
  warningText: { color: '#D32F2F', fontSize: 13 },
  vehicleTag: { backgroundColor: '#E8F5E9', color: '#2E7D32', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, fontSize: 13, fontWeight: 'bold' },
  costBox: { backgroundColor: '#F9F6F0', padding: 12, borderRadius: 12 },
  costItem: { fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
  timelineContainer: { paddingTop: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 20 },
  timelineLeft: { alignItems: 'center', marginRight: 16, width: 20 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#D7CCC8', borderWidth: 3, borderColor: '#FFF' },
  dotPrimary: { backgroundColor: colors.primary, width: 18, height: 18, borderRadius: 9 },
  dotWarning: { backgroundColor: '#FF5252' },
  timelineLine: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4, marginBottom: -16 },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  timelineDesc: { fontSize: 13, color: colors.textSecondary },
  planCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  planAuthor: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  planTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8 },
  planPreview: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  planFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  planStats: { fontSize: 12, color: colors.textSecondary },
  forkBtn: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  forkText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { color: colors.textSecondary, fontStyle: 'italic' },
  reviewOverview: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  ratingBig: { fontSize: 36, fontWeight: 'bold', color: colors.primary, marginRight: 16 },
  stars: { flex: 1 },
  starText: { fontSize: 18, marginBottom: 4 },
  reviewCount: { fontSize: 12, color: colors.textSecondary },
  reviewCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  reviewerName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  reviewMeta: { fontSize: 12, color: colors.textSecondary },
  reviewText: { fontSize: 14, color: colors.textPrimary, lineHeight: 22, marginBottom: 12 },
  reviewImages: { flexDirection: 'row', gap: 8 },
  reviewImg: { width: 100, height: 75, borderRadius: 8 },
  weatherAlert: { backgroundColor: '#FFF3E0', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#FFE0B2' },
  weatherAlertText: { color: '#E65100', fontSize: 13, fontWeight: 'bold' },
  weatherRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  weatherDay: { flex: 1, fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  weatherIcon: { marginRight: 16 },
  weatherTemp: { width: 60, alignItems: 'center' },
  tempHigh: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  tempLow: { fontSize: 13, color: colors.textSecondary },
  weatherRain: { width: 60, fontSize: 13, color: '#1976D2', textAlign: 'right', fontWeight: '500' },
});

export default TripDetailsScreen;
