import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { colors } from '../../theme/colors';

const POSTS = [
  { id: '1', author: 'Tuấn Đạt', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=150', time: '2 giờ trước', content: 'Mới hoàn thành cung Tà Xùa săn mây thành công!', image: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=600', likes: 124, comments: 18 },
  { id: '2', author: 'Thu Hà', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150', time: '5 giờ trước', content: 'Góc tìm người lạc: Hồi sáng anh nào đi ngang đèo Bảo Lộc rớt cái găng tay thì ib em nhé 😂', image: 'https://images.unsplash.com/photo-1568853118939-f9f257ceeeeb?q=80&w=600', likes: 45, comments: 12 },
];

const GHEP_DOAN = [
  { id: '1', author: 'Hải Nam', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150', type: 'Tìm Ôm', title: 'Tìm ôm đi Tà Xùa 15-17/3', route: 'Hà Nội - Tà Xùa', vehicle: 'Winner X', expense: 'Camp 50/50', req: 'Có kinh nghiệm đi đèo' },
  { id: '2', author: 'Minh Trang', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150', type: 'Tìm Xế', title: 'Cần xế cứng đi Hà Giang', route: 'Hà Giang Loop', vehicle: 'Tùy xế', expense: 'Bao xăng xế', req: 'Tay lái cứng' },
  { id: '3', author: 'Team FA', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150', type: 'Ghép Đoàn', title: 'Đoàn 3 xe cần thêm 2 xe đi Đà Lạt', route: 'Sài Gòn - Đà Lạt', vehicle: 'Xe số/Côn tay', expense: 'Quỹ chung 1tr/ng', req: 'Vui vẻ hòa đồng' },
];

const CommunityScreen = () => {
  const [activeTab, setActiveTab] = useState('Feed');
  const [ghepDoanFilter, setGhepDoanFilter] = useState('Tất cả');
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [interested, setInterested] = useState<Record<string, boolean>>({});

  const toggleLike = (id: string) => {
    setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleInterest = (id: string) => {
    setInterested(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cộng Đồng</Text>
        <TouchableOpacity style={styles.createPostBtn}>
          <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/FFFFFF/plus-math.png' }} style={styles.plusIcon} />
        </TouchableOpacity>
      </View>

      {/* Main Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'Feed' && styles.activeTab]} onPress={() => setActiveTab('Feed')}>
          <Text style={[styles.tabText, activeTab === 'Feed' && styles.activeTabText]}>Bảng tin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'GhepDoan' && styles.activeTab]} onPress={() => setActiveTab('GhepDoan')}>
          <Text style={[styles.tabText, activeTab === 'GhepDoan' && styles.activeTabText]}>Ghép đoàn 🤝</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        {activeTab === 'Feed' && POSTS.map((post) => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image source={{ uri: post.avatar }} style={styles.postAvatar} />
              <View style={styles.postMeta}>
                <Text style={styles.postAuthor}>{post.author}</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{post.content}</Text>
            {post.image && <Image source={{ uri: post.image }} style={styles.postImage} />}
            
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id)}>
                <Image source={{ uri: likedPosts[post.id] ? 'https://img.icons8.com/material-filled/20/FF5252/facebook-like.png' : 'https://img.icons8.com/material-outlined/20/795548/facebook-like.png' }} style={styles.actionIcon} />
                <Text style={[styles.actionText, likedPosts[post.id] && { color: '#FF5252' }]}>
                  {post.likes + (likedPosts[post.id] ? 1 : 0)} Thích
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={{ uri: 'https://img.icons8.com/material-outlined/20/795548/speech-bubble.png' }} style={styles.actionIcon} />
                <Text style={styles.actionText}>{post.comments} Bình luận</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Image source={{ uri: 'https://img.icons8.com/material-outlined/20/795548/share.png' }} style={styles.actionIcon} />
                <Text style={styles.actionText}>Chia sẻ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {activeTab === 'GhepDoan' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['Tất cả', 'Tìm Xế 🏍️', 'Tìm Ôm 🧑', 'Ghép Đoàn 👥'].map(filter => (
                <TouchableOpacity 
                  key={filter} 
                  style={[styles.filterChip, ghepDoanFilter === filter && styles.activeFilterChip]}
                  onPress={() => setGhepDoanFilter(filter)}
                >
                  <Text style={[styles.filterChipText, ghepDoanFilter === filter && styles.activeFilterText]}>{filter}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {GHEP_DOAN.map(item => (
              <View key={item.id} style={styles.ghepDoanCard}>
                <View style={styles.gdHeader}>
                  <Image source={{ uri: item.avatar }} style={styles.gdAvatar} />
                  <View style={styles.gdMeta}>
                    <Text style={styles.gdAuthor}>{item.author}</Text>
                    <View style={styles.gdTypePill}>
                      <Text style={styles.gdTypeText}>{item.type}</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={styles.gdTitle}>{item.title}</Text>
                
                <View style={styles.gdDetails}>
                  <Text style={styles.gdDetailText}>🛣️ Lộ trình: {item.route}</Text>
                  <Text style={styles.gdDetailText}>🏍️ Xe: {item.vehicle}</Text>
                  <Text style={styles.gdDetailText}>💰 Chi phí: {item.expense}</Text>
                  <Text style={styles.gdDetailText}>⚠️ Yêu cầu: {item.req}</Text>
                </View>

                <View style={styles.gdActions}>
                  <TouchableOpacity style={styles.gdActionBtn}><Text style={styles.gdActionText}>Nhắn tin</Text></TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.gdActionBtn, styles.gdPrimaryBtn, interested[item.id] && styles.gdInterestedBtn]}
                    onPress={() => toggleInterest(item.id)}
                  >
                    <Text style={[styles.gdPrimaryText, interested[item.id] && styles.gdInterestedText]}>
                      {interested[item.id] ? '❤️ Đã quan tâm' : '🤍 Quan tâm'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: colors.background },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  createPostBtn: { width: 40, height: 40, backgroundColor: colors.primary, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  plusIcon: { width: 20, height: 20 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 20 },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
  activeTabText: { color: colors.primary, fontWeight: 'bold' },
  container: { padding: 16 },
  postCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  postAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  postMeta: { flex: 1 },
  postAuthor: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  postTime: { fontSize: 12, color: colors.textSecondary },
  postContent: { fontSize: 15, color: colors.textPrimary, lineHeight: 22, marginBottom: 12 },
  postImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { width: 20, height: 20, marginRight: 6 },
  actionText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  filterScroll: { flexDirection: 'row', marginBottom: 16 },
  filterChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  activeFilterText: { color: '#FFFFFF' },
  ghepDoanCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: colors.border },
  gdHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  gdAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  gdMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gdAuthor: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  gdTypePill: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gdTypeText: { fontSize: 12, color: '#4CAF50', fontWeight: 'bold' },
  gdTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  gdDetails: { backgroundColor: '#F9F6F0', padding: 12, borderRadius: 8, marginBottom: 16 },
  gdDetailText: { fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
  gdActions: { flexDirection: 'row', gap: 12 },
  gdActionBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  gdActionText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  gdPrimaryBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
  gdPrimaryText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  gdInterestedBtn: { backgroundColor: '#FFEBEE', borderColor: '#FFCDD2' },
  gdInterestedText: { color: '#D32F2F' }
});

export default CommunityScreen;
