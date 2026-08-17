import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { colors } from '../../theme/colors';

const CHATS = [
  {
    id: '1',
    name: 'Team Săn Mây Tà Xùa ☁️',
    avatar: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=150',
    lastMessage: 'Tuấn Đạt: Mọi người chuẩn bị áo ấm nhé!',
    time: '10:42',
    unread: 3,
  },
  {
    id: '2',
    name: 'Hội Ghiền Phượt VN',
    avatar: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=150',
    lastMessage: 'Minh Trang: Mình xin 1 slot ôm.',
    time: 'Hôm qua',
    unread: 0,
  }
];

const ChatScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trò Chuyện</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/3E2723/map-marker.png' }} style={styles.actionIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/3E2723/poll-topic.png' }} style={styles.actionIcon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/3E2723/search.png' }} style={styles.actionIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        {/* Active Trip Quick Actions */}
        <View style={styles.quickActionsBox}>
          <Text style={styles.quickActionsTitle}>Thao tác nhanh cho chuyến đi hiện tại</Text>
          <View style={styles.qaRow}>
            <TouchableOpacity style={styles.qaButton}>
              <Text style={styles.qaBtnText}>📍 Chia sẻ vị trí</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaButton}>
              <Text style={styles.qaBtnText}>📊 Tạo Bình chọn</Text>
            </TouchableOpacity>
          </View>
        </View>
        {CHATS.map((chat) => (
          <TouchableOpacity key={chat.id} style={styles.chatRow}>
            <Image source={{ uri: chat.avatar }} style={styles.chatAvatar} />
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName} numberOfLines={1}>{chat.name}</Text>
                <Text style={[styles.chatTime, chat.unread > 0 && styles.chatTimeUnread]}>{chat.time}</Text>
              </View>
              <View style={styles.chatFooter}>
                <Text style={[styles.chatMessage, chat.unread > 0 && styles.chatMessageUnread]} numberOfLines={1}>
                  {chat.lastMessage}
                </Text>
                {chat.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{chat.unread}</Text>
                  </View>
                )}
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
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 4,
  },
  actionIcon: {
    width: 24,
    height: 24,
  },
  quickActionsBox: {
    backgroundColor: '#F9F6F0',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  qaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  qaButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qaBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  container: {
    padding: 16,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chatAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  chatMessageUnread: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  }
});

export default ChatScreen;
