import React from 'react';
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
} from 'react-native';
import { colors } from '../../theme/colors';
import { useNavigation } from '@react-navigation/native';
import type { ChatScreenNavigationProp } from '../../types/navigation';

interface Chat {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  type: 'group' | 'direct';
}

const CHATS: Chat[] = [
  {
    id: '1',
    name: 'Team Săn Mây Tà Xùa',
    avatar: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=80',
    lastMessage: 'Tuấn Đạt: Mọi người chuẩn bị áo ấm nhé!',
    time: '10:42',
    unread: 3,
    type: 'group',
  },
  {
    id: '2',
    name: 'Hội Ghiền Phượt VN',
    avatar: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=80',
    lastMessage: 'Minh Trang: Mình xin 1 slot ôm.',
    time: 'Hôm qua',
    unread: 0,
    type: 'group',
  },
  {
    id: '3',
    name: 'Tuấn Đạt',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80',
    lastMessage: 'Oke bro, mình sẽ ghé qua điểm tập kết lúc 5 giờ.',
    time: '08:15',
    unread: 1,
    type: 'direct',
  },
  {
    id: '4',
    name: 'Thu Hà',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=80',
    lastMessage: 'Chị tìm được chỗ camp rồi nhé, sẽ share link sau!',
    time: 'T2',
    unread: 0,
    type: 'direct',
  },
];

const ChatScreen = () => {
  const navigation = useNavigation<ChatScreenNavigationProp>();

  const openConversation = (chat: Chat) => {
    navigation.navigate('Conversation', { chatId: chat.id, chatName: chat.name });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header — gọn, không icon dư */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trò Chuyện</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Active Trip Quick Actions */}
        <View style={styles.quickActionsBox}>
          <Text style={styles.quickActionsTitle}>Thao tác nhanh cho chuyến đang diễn ra</Text>
          <View style={styles.qaRow}>
            <TouchableOpacity style={styles.qaButton}>
              <Text style={styles.qaBtnText}>Chia sẻ vị trí</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qaButton}>
              <Text style={styles.qaBtnText}>Tạo Bình chọn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>Tin nhắn</Text>

        {CHATS.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatRow}
            onPress={() => openConversation(chat)}
            activeOpacity={0.75}
          >
            <View style={styles.avatarWrap}>
              <Image source={{ uri: chat.avatar }} style={styles.chatAvatar} />
              {chat.type === 'group' && (
                <View style={styles.groupBadge} />
              )}
            </View>
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatName} numberOfLines={1}>{chat.name}</Text>
                <Text style={[styles.chatTime, chat.unread > 0 && styles.chatTimeUnread]}>
                  {chat.time}
                </Text>
              </View>
              <View style={styles.chatFooter}>
                <Text
                  style={[styles.chatMessage, chat.unread > 0 && styles.chatMessageUnread]}
                  numberOfLines={1}
                >
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#5D3A29',
  },
  container: { padding: 16 },

  quickActionsBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  qaRow: { flexDirection: 'row', gap: 12 },
  qaButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qaBtnText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  chatAvatar: { width: 52, height: 52, borderRadius: 26 },
  groupBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatInfo: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  chatTime: { fontSize: 12, color: colors.textSecondary },
  chatTimeUnread: { color: colors.primary, fontWeight: 'bold' },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: { fontSize: 13, color: colors.textSecondary, flex: 1, marginRight: 8 },
  chatMessageUnread: { color: colors.textPrimary, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: colors.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
});

export default ChatScreen;
