import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import type { RootStackParamList, ConversationScreenNavigationProp } from '../../types/navigation';

type ConversationRouteProp = RouteProp<RootStackParamList, 'Conversation'>;

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  time: string;
  type?: 'text' | 'location' | 'image';
}

// ─── Mock conversation data ────────────────────────────────────────────────────

const MOCK_CONVERSATIONS: Record<string, Message[]> = {
  '1': [
    { id: 'm1', sender: 'them', text: 'Mọi người chuẩn bị áo ấm nhé! Sáng mai tập kết lúc 5h tại ngã tư Kim Mã.', time: '10:30', type: 'text' },
    { id: 'm2', sender: 'me', text: 'OK anh! Em mang thêm bạt dã ngoại được không?', time: '10:32', type: 'text' },
    { id: 'm3', sender: 'them', text: 'Được chứ, đỉnh núi gió lạnh lắm, có thêm bạt tốt hơn!', time: '10:33', type: 'text' },
    { id: 'm4', sender: 'them', text: '📍 Điểm tập kết: Ngã tư Kim Mã - Liễu Giai', time: '10:34', type: 'location' },
    { id: 'm5', sender: 'me', text: 'Dạ, em đã đánh dấu rồi. Ai còn thiếu đồ camping thì ib em, em có thể cho mượn thêm 1 túi ngủ.', time: '10:38', type: 'text' },
    { id: 'm6', sender: 'them', text: 'Mọi người check lốp xe trước nhé! Cung Tà Xùa nhiều đoạn đường xấu.', time: '10:40', type: 'text' },
    { id: 'm7', sender: 'me', text: 'Vâng anh! Em hỏi thêm 1 chút: mình có dự phòng trạm sửa xe dọc đường không ạ?', time: '10:41', type: 'text' },
    { id: 'm8', sender: 'them', text: 'Có 1 chỗ ở Nghĩa Lộ, sau đó đến Mù Cang Chải thì có thêm 1 chỗ nữa. Nhưng đoạn cuối lên Tà Xùa thì không có, nên mang theo bơm tay và vá xe dự phòng nha!', time: '10:42', type: 'text' },
  ],
  '2': [
    { id: 'm1', sender: 'them', text: 'Chào mọi người! Ai muốn ghép cung Hà Giang tháng 11 không?', time: 'Hôm qua', type: 'text' },
    { id: 'm2', sender: 'me', text: 'Mình quan tâm! Đi mấy ngày vậy bạn?', time: 'Hôm qua', type: 'text' },
    { id: 'm3', sender: 'them', text: 'Dự tính 4 ngày 3 đêm, đi loop đầy đủ: Quản Bạ → Yên Minh → Đồng Văn → Mèo Vạc → Mã Pí Lèng rồi về.', time: 'Hôm qua', type: 'text' },
    { id: 'm4', sender: 'me', text: 'Xin 1 slot ôm! Mình có thể đóng quỹ bao nhiêu?', time: 'Hôm qua', type: 'text' },
    { id: 'm5', sender: 'them', text: 'Minh Trang: Mình xin 1 slot ôm.', time: 'Hôm qua', type: 'text' },
  ],
};

const AVATAR_ME = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=80';
const AVATAR_THEM_1 = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80';
const AVATAR_THEM_2 = 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=80';

const THEM_AVATARS: Record<string, string> = {
  '1': AVATAR_THEM_1,
  '2': AVATAR_THEM_2,
};

// ─── Screen ────────────────────────────────────────────────────────────────────

const ConversationScreen = () => {
  const navigation = useNavigation<ConversationScreenNavigationProp>();
  const route = useRoute<ConversationRouteProp>();
  const { chatId, chatName } = route.params;
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>(
    MOCK_CONVERSATIONS[chatId] ?? []
  );
  const [inputText, setInputText] = useState('');
  const themAvatar = THEM_AVATARS[chatId] ?? AVATAR_THEM_1;

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const msg: Message = {
      id: Date.now().toString(),
      sender: 'me',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };
    setMessages((prev) => [...prev, msg]);
    setInputText('');
    // Auto scroll
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = (msg: Message) => {
    const isMe = msg.sender === 'me';
    const isLocation = msg.type === 'location';

    return (
      <View
        key={msg.id}
        style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}
      >
        {!isMe && (
          <Image source={{ uri: themAvatar }} style={styles.msgAvatar} />
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, isLocation && styles.bubbleLocation]}>
          {isLocation ? (
            <View style={styles.locationBubble}>
              <Ionicons name="location" size={16} color={colors.primary} />
              <Text style={styles.locationBubbleText}>{msg.text.replace('📍 ', '')}</Text>
            </View>
          ) : (
            <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.text}</Text>
          )}
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{msg.time}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatName}</Text>
          <Text style={styles.headerSub}>3 thành viên · Đang hoạt động</Text>
        </View>
        <TouchableOpacity style={styles.headerAction}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Date separator */}
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>Hôm nay</Text>
            <View style={styles.dateLine} />
          </View>

          {messages.map(renderMessage)}
        </ScrollView>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.quickBtnText}>Chia sẻ vị trí</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn}>
            <Ionicons name="stats-chart-outline" size={18} color={colors.primary} />
            <Text style={styles.quickBtnText}>Tạo bình chọn</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn}>
            <Ionicons name="image-outline" size={18} color={colors.primary} />
            <Text style={styles.quickBtnText}>Gửi ảnh</Text>
          </TouchableOpacity>
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Nhắn tin..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  headerAction: { padding: 4 },

  messageList: { flex: 1 },
  messageListContent: { paddingHorizontal: 16, paddingVertical: 12 },

  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dateText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', maxWidth: '85%' },
  msgRowMe: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  msgRowThem: { alignSelf: 'flex-start' },
  msgAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },

  bubble: {
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleLocation: {
    backgroundColor: '#FFF8F0',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  locationBubble: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationBubbleText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  bubbleText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  bubbleTextMe: { color: '#FFFFFF' },
  msgTime: { fontSize: 10, color: colors.textSecondary, marginTop: 4, textAlign: 'right' },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },

  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: '#FFFFFF',
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.background,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickBtnText: { fontSize: 11, fontWeight: '600', color: colors.primary },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 42,
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});

export default ConversationScreen;
