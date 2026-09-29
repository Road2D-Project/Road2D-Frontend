import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Animated,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  time: string;
}

interface MomentPost {
  id: string;
  author: string;
  avatar: string;
  time: string;
  caption: string;
  location: string;
  route: string;
  distance: string;
  duration: string;
  images: string[];
  likes: number;
  rating: number;
  ratingCount: number;
  comments: Comment[];
}

interface GhepDoanItem {
  id: string;
  author: string;
  avatar: string;
  type: string;
  title: string;
  route: string;
  vehicle: string;
  expense: string;
  req: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_COMMENTS: Record<string, Comment[]> = {
  '1': [
    { id: 'c1', author: 'Linh Hà', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=80', text: 'Đỉnh quá anh ơi! Lần sau cho em theo với!', time: '1 giờ trước' },
    { id: 'c2', author: 'Quân Moto', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=80', text: 'Mây đẹp vậy! Cung này mùa nào đẹp nhất vậy?', time: '45 phút trước' },
    { id: 'c3', author: 'Bảo Ngọc', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=80', text: '5 sao không chê vào đâu được. Đường đi có khó không anh?', time: '20 phút trước' },
  ],
  '2': [
    { id: 'c4', author: 'Minh Xế', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80', text: 'Đèo này mùa này đẹp lắm! Review thêm về đường xá đi chị.', time: '3 giờ trước' },
    { id: 'c5', author: 'Hải Nam', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=80', text: 'Bảo Lộc ngon, lần trước mình cũng đi cung này!', time: '2 giờ trước' },
  ],
  '3': [
    { id: 'c6', author: 'Tuấn Đạt', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80', text: 'Loop đẹp nhất VN luôn! Lần này đi mấy ngày vậy bạn?', time: '30 phút trước' },
  ],
};

const MOMENTS: MomentPost[] = [
  {
    id: '1',
    author: 'Tuấn Đạt',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80',
    time: '2 giờ trước',
    caption: 'Tà Xùa săn mây thành công sau 2 năm chờ đợi! Đường lên dốc cực kỳ gắt nhưng hoàn toàn xứng đáng. Mây trắng kéo vào lúc 5:30 sáng, lạnh 8°C nhưng cảnh đẹp đến nín thở.',
    location: 'Tà Xùa, Sơn La',
    route: 'Hà Nội → Nghĩa Lộ → Mù Cang Chải → Tà Xùa',
    distance: '285 km',
    duration: '2 ngày 1 đêm',
    images: [
      'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=600',
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=600',
    ],
    likes: 124,
    rating: 4.8,
    ratingCount: 37,
    comments: MOCK_COMMENTS['1'],
  },
  {
    id: '2',
    author: 'Thu Hà',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=80',
    time: '5 giờ trước',
    caption: 'Đèo Bảo Lộc buổi sáng sương mù giăng kín, đi mà cứ tưởng mình ở đâu đó ở Châu Âu vậy. Cà phê ven đường thơm không đâu bằng!',
    location: 'Đèo Bảo Lộc, Lâm Đồng',
    route: 'Sài Gòn → Bảo Lộc → Đà Lạt',
    distance: '180 km',
    duration: '1 ngày',
    images: [
      'https://images.unsplash.com/photo-1568853118939-f9f257ceeeeb?q=80&w=600',
    ],
    likes: 45,
    rating: 4.5,
    ratingCount: 12,
    comments: MOCK_COMMENTS['2'],
  },
  {
    id: '3',
    author: 'Minh Phượt',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=80',
    time: '1 ngày trước',
    caption: 'Hà Giang Loop lần 3 và vẫn cứ thấy mới. Mỗi lần đi là một lần khác nhau — mùa này hoa tam giác mạch bắt đầu nở, cánh đồng màu tím trải dài tít tắp.',
    location: 'Đồng Văn, Hà Giang',
    route: 'Hà Giang → Quản Bạ → Yên Minh → Đồng Văn → Mèo Vạc → Mã Pí Lèng',
    distance: '350 km',
    duration: '3 ngày 2 đêm',
    images: [
      'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=600',
      'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=600',
    ],
    likes: 312,
    rating: 5.0,
    ratingCount: 89,
    comments: MOCK_COMMENTS['3'],
  },
];

const GHEP_DOAN: GhepDoanItem[] = [
  { id: '1', author: 'Hải Nam', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=80', type: 'Tìm Ôm', title: 'Tìm ôm đi Tà Xùa 15-17/3', route: 'Hà Nội → Tà Xùa', vehicle: 'Winner X', expense: 'Camp 50/50', req: 'Có kinh nghiệm đi đèo' },
  { id: '2', author: 'Minh Trang', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=80', type: 'Tìm Xế', title: 'Cần xế cứng đi Hà Giang', route: 'Hà Giang Loop', vehicle: 'Tùy xế', expense: 'Bao xăng xế', req: 'Tay lái cứng' },
  { id: '3', author: 'Team FA', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=80', type: 'Ghép Đoàn', title: 'Đoàn 3 xe cần thêm 2 xe đi Đà Lạt', route: 'Sài Gòn → Đà Lạt', vehicle: 'Xe số/Côn tay', expense: 'Quỹ chung 1tr/ng', req: 'Vui vẻ hòa đồng' },
];

// Danh sách nhóm chat để share
const CHAT_GROUPS = [
  { id: '1', name: 'Team Săn Mây Tà Xùa', avatar: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=80' },
  { id: '2', name: 'Hội Ghiền Phượt VN', avatar: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=80' },
  { id: '3', name: 'Tuấn Đạt', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=80' },
  { id: '4', name: 'Thu Hà', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=80' },
];

// ─── Star Rating ───────────────────────────────────────────────────────────────

const StarRating = ({
  rating,
  interactive = false,
  onRate,
  size = 16,
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (star: number) => void;
  size?: number;
}) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <TouchableOpacity
        key={star}
        onPress={() => interactive && onRate && onRate(star)}
        disabled={!interactive}
        activeOpacity={interactive ? 0.6 : 1}
      >
        <Ionicons
          name={star <= Math.round(rating) ? 'star' : 'star-outline'}
          size={size}
          color={star <= Math.round(rating) ? colors.primary : colors.border}
        />
      </TouchableOpacity>
    ))}
  </View>
);

// ─── 3-dot Menu Component ─────────────────────────────────────────────────────

interface MenuOption {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}

const PostMenu = ({
  visible,
  options,
  onClose,
}: {
  visible: boolean;
  options: MenuOption[];
  onClose: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Open: scale từ 0.7 → 1, fade in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 260,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close: scale → 0.85, fade out nhanh
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible && opacityAnim._value === 0) return null;

  return (
    <>
      {/* Invisible backdrop to close */}
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        onPress={onClose}
        activeOpacity={1}
      />
      <Animated.View
        style={[
          styles.dropdownMenu,
          {
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
            ],
          },
        ]}
      >
        {options.map((opt, idx) => (
          <TouchableOpacity
            key={opt.label}
            style={[
              styles.dropdownItem,
              idx < options.length - 1 && styles.dropdownItemBorder,
            ]}
            onPress={() => {
              onClose();
              opt.onPress();
            }}
          >
            <Ionicons
              name={opt.icon}
              size={18}
              color={opt.color ?? colors.textSecondary}
              style={{ marginRight: 10 }}
            />
            <Text style={[styles.dropdownItemText, opt.color ? { color: opt.color } : null]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </>
  );
};

// ─── Share To Chat Modal ────────────────────────────────────────────────────────

const ShareToChatModal = ({
  visible,
  post,
  onClose,
}: {
  visible: boolean;
  post: MomentPost | null;
  onClose: () => void;
}) => {
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const handleSend = (chatId: string, chatName: string) => {
    setSentTo((prev) => new Set([...prev, chatId]));
    // Giả lập gửi — thực tế sẽ gọi API
    setTimeout(() => {
      setSentTo((prev) => {
        const next = new Set(prev);
        next.delete(chatId);
        return next;
      });
    }, 2000);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.shareSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Chia sẻ vào nhóm chat</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Post preview */}
          {post && (
            <View style={styles.sharePostPreview}>
              <Image source={{ uri: post.images[0] }} style={styles.sharePostThumb} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sharePostAuthor}>{post.author}</Text>
                <Text style={styles.sharePostCaption} numberOfLines={2}>{post.caption}</Text>
                <View style={styles.sharePostLocation}>
                  <Ionicons name="location" size={12} color={colors.primary} />
                  <Text style={styles.sharePostLocationText}>{post.location}</Text>
                </View>
              </View>
            </View>
          )}

          <Text style={styles.shareSectionLabel}>Gửi đến</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
            {CHAT_GROUPS.map((chat) => {
              const isSent = sentTo.has(chat.id);
              return (
                <View key={chat.id} style={styles.chatGroupRow}>
                  <Image source={{ uri: chat.avatar }} style={styles.chatGroupAvatar} />
                  <Text style={styles.chatGroupName}>{chat.name}</Text>
                  <TouchableOpacity
                    style={[styles.sendBtn, isSent && styles.sendBtnSent]}
                    onPress={() => handleSend(chat.id, chat.name)}
                  >
                    <Text style={styles.sendBtnText}>{isSent ? 'Đã gửi' : 'Gửi'}</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>

          {/* Share ngoài app */}
          <TouchableOpacity
            style={styles.shareExternalBtn}
            onPress={() => {
              onClose();
              Share.share({
                message: `${post?.author} tại ${post?.location}\n${post?.caption}\n\nĐược chia sẻ từ Road2D`,
                title: 'Chia sẻ khoảnh khắc',
              });
            }}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
            <Text style={styles.shareExternalText}>Chia sẻ ra ngoài</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────

const CommunityScreen = () => {
  const [activeTab, setActiveTab] = useState<'Feed' | 'GhepDoan'>('Feed');
  const [ghepDoanFilter, setGhepDoanFilter] = useState('Tất cả');
  const [interested, setInterested] = useState<Record<string, boolean>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  // 3-dot menu state
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);

  // Comment modal
  const [commentModalPostId, setCommentModalPostId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [localComments, setLocalComments] = useState<Record<string, Comment[]>>(
    MOMENTS.reduce((acc, p) => ({ ...acc, [p.id]: p.comments }), {} as Record<string, Comment[]>)
  );

  // Share modal
  const [sharePost, setSharePost] = useState<MomentPost | null>(null);

  // Create post modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draft, setDraft] = useState({ caption: '', location: '', route: '', distance: '', duration: '' });

  const toggleLike = (id: string) => setLikedPosts((p) => ({ ...p, [id]: !p[id] }));
  const toggleInterest = (id: string) => setInterested((p) => ({ ...p, [id]: !p[id] }));
  const handleRateMoment = (postId: string, star: number) => setUserRatings((p) => ({ ...p, [postId]: star }));

  const openComments = (postId: string) => {
    setCommentModalPostId(postId);
    setNewCommentText('');
  };

  const submitComment = () => {
    if (!newCommentText.trim() || !commentModalPostId) return;
    const newC: Comment = {
      id: Date.now().toString(),
      author: 'Bạn',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=80',
      text: newCommentText.trim(),
      time: 'Vừa xong',
    };
    setLocalComments((prev) => ({
      ...prev,
      [commentModalPostId]: [...(prev[commentModalPostId] ?? []), newC],
    }));
    setNewCommentText('');
  };

  const getMenuOptions = useCallback((post: MomentPost): MenuOption[] => [
    {
      icon: 'share-social-outline',
      label: 'Chia sẻ vào nhóm chat',
      onPress: () => setSharePost(post),
    },
    {
      icon: 'copy-outline',
      label: 'Sao chép liên kết',
      onPress: () => Alert.alert('Đã sao chép', 'Liên kết bài viết đã được sao chép!'),
    },
    {
      icon: 'bookmark-outline',
      label: 'Lưu khoảnh khắc',
      onPress: () => Alert.alert('Đã lưu', `Khoảnh khắc của ${post.author} đã được lưu!`),
    },
    {
      icon: 'eye-off-outline',
      label: 'Ẩn bài này',
      onPress: () => Alert.alert('Ẩn bài', 'Bạn sẽ không thấy bài này nữa.'),
    },
    {
      icon: 'flag-outline',
      label: 'Tố cáo bài viết',
      color: '#E53935',
      onPress: () =>
        Alert.alert(
          'Tố cáo bài viết',
          'Chọn lý do tố cáo:',
          [
            { text: 'Nội dung sai lệch', onPress: () => Alert.alert('Đã gửi', 'Cảm ơn bạn đã báo cáo!') },
            { text: 'Spam', onPress: () => Alert.alert('Đã gửi', 'Cảm ơn bạn đã báo cáo!') },
            { text: 'Nội dung phản cảm', onPress: () => Alert.alert('Đã gửi', 'Cảm ơn bạn đã báo cáo!') },
            { text: 'Huỷ', style: 'cancel' },
          ]
        ),
    },
  ], []);

  const getActiveComments = () => commentModalPostId ? (localComments[commentModalPostId] ?? []) : [];
  const getActivePost = () => commentModalPostId ? MOMENTS.find((p) => p.id === commentModalPostId) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cộng Đồng</Text>
        <TouchableOpacity style={styles.createPostBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['Feed', 'GhepDoan'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'Feed' ? 'Khoảnh khắc' : 'Ghép đoàn'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ════ FEED TAB ════ */}
        {activeTab === 'Feed' && MOMENTS.map((post) => {
          const liked = !!likedPosts[post.id];
          const myRating = userRatings[post.id];
          const displayComments = localComments[post.id] ?? [];
          const isMenuOpen = openMenuPostId === post.id;

          return (
            <View key={post.id} style={styles.momentCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <Image source={{ uri: post.avatar }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{post.author}</Text>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>

                {/* 3-dot button */}
                <View>
                  <TouchableOpacity
                    style={styles.menuDotBtn}
                    onPress={() => setOpenMenuPostId(isMenuOpen ? null : post.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>

                  {/* Dropdown menu */}
                  <PostMenu
                    visible={isMenuOpen}
                    options={getMenuOptions(post)}
                    onClose={() => setOpenMenuPostId(null)}
                  />
                </View>
              </View>

              {/* Location */}
              <View style={styles.locationRow}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.locationText} numberOfLines={1}>{post.location}</Text>
              </View>
              <View style={styles.routeRow}>
                <Ionicons name="navigate" size={13} color={colors.textSecondary} />
                <Text style={styles.routeText} numberOfLines={2}>{post.route}</Text>
              </View>

              {/* Stats chips */}
              <View style={styles.statChips}>
                <View style={styles.statChip}><Text style={styles.statChipText}>{post.distance}</Text></View>
                <View style={styles.statChip}><Text style={styles.statChipText}>{post.duration}</Text></View>
              </View>

              {/* Caption */}
              <Text style={styles.captionText}>{post.caption}</Text>

              {/* Images */}
              {post.images.length === 1 ? (
                <Image source={{ uri: post.images[0] }} style={styles.singleImage} />
              ) : (
                <View style={styles.imageGrid}>
                  <Image source={{ uri: post.images[0] }} style={styles.gridImageLeft} />
                  <Image source={{ uri: post.images[1] }} style={styles.gridImageRight} />
                </View>
              )}

              {/* Rating */}
              <View style={styles.ratingRow}>
                <StarRating rating={post.rating} size={15} />
                <Text style={styles.ratingValue}>{post.rating.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({post.ratingCount} đánh giá)</Text>
                {myRating ? (
                  <Text style={styles.myRatingBadge}>Bạn: {myRating}★</Text>
                ) : (
                  <TouchableOpacity onPress={() => handleRateMoment(post.id, 5)} style={styles.rateBtn}>
                    <Text style={styles.rateBtnText}>Đánh giá</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.divider} />

              {/* Actions */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(post.id)}>
                  <Ionicons name={liked ? 'heart' : 'heart-outline'} size={20} color={liked ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.actionText, liked && styles.actionTextLiked]}>
                    {post.likes + (liked ? 1 : 0)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => openComments(post.id)}>
                  <Ionicons name="chatbubble-outline" size={19} color={colors.textSecondary} />
                  <Text style={styles.actionText}>{displayComments.length}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleRateMoment(post.id, myRating ? 0 : 5)}
                >
                  <Ionicons name={myRating ? 'star' : 'star-outline'} size={19} color={myRating ? colors.primary : colors.textSecondary} />
                  <Text style={[styles.actionText, myRating ? styles.actionTextLiked : null]}>
                    {myRating ? `${myRating}★` : 'Đánh giá'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Latest comment preview */}
              {displayComments.length > 0 && (
                <TouchableOpacity style={styles.commentPreview} onPress={() => openComments(post.id)}>
                  <Image source={{ uri: displayComments[displayComments.length - 1].avatar }} style={styles.commentAvatarSmall} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentPreviewAuthor}>{displayComments[displayComments.length - 1].author}</Text>
                    <Text style={styles.commentPreviewText} numberOfLines={1}>{displayComments[displayComments.length - 1].text}</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* ════ GHEP DOAN TAB ════ */}
        {activeTab === 'GhepDoan' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {['Tất cả', 'Tìm Xế', 'Tìm Ôm', 'Ghép Đoàn'].map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, ghepDoanFilter === f && styles.activeFilterChip]}
                  onPress={() => setGhepDoanFilter(f)}
                >
                  <Text style={[styles.filterChipText, ghepDoanFilter === f && styles.activeFilterText]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {GHEP_DOAN.filter((item) => ghepDoanFilter === 'Tất cả' || item.type === ghepDoanFilter).map((item) => (
              <View key={item.id} style={styles.ghepDoanCard}>
                <View style={styles.gdHeader}>
                  <Image source={{ uri: item.avatar }} style={styles.gdAvatar} />
                  <View style={styles.gdMeta}>
                    <Text style={styles.gdAuthor}>{item.author}</Text>
                    <View style={styles.gdTypePill}><Text style={styles.gdTypeText}>{item.type}</Text></View>
                  </View>
                </View>
                <Text style={styles.gdTitle}>{item.title}</Text>
                <View style={styles.gdDetails}>
                  <Text style={styles.gdDetailText}>Lộ trình: {item.route}</Text>
                  <Text style={styles.gdDetailText}>Xe: {item.vehicle}</Text>
                  <Text style={styles.gdDetailText}>Chi phí: {item.expense}</Text>
                  <Text style={styles.gdDetailText}>Yêu cầu: {item.req}</Text>
                </View>
                <View style={styles.gdActions}>
                  <TouchableOpacity style={styles.gdActionBtn}><Text style={styles.gdActionText}>Nhắn tin</Text></TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.gdActionBtn, styles.gdPrimaryBtn, interested[item.id] && styles.gdInterestedBtn]}
                    onPress={() => toggleInterest(item.id)}
                  >
                    <Text style={[styles.gdPrimaryText, interested[item.id] && styles.gdInterestedText]}>
                      {interested[item.id] ? 'Đã quan tâm' : 'Quan tâm'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ══ COMMENT MODAL ══ */}
      <Modal
        visible={commentModalPostId !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setCommentModalPostId(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCommentModalPostId(null)} />
          <View style={styles.commentSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Bình luận ({getActiveComments().length})</Text>
              <TouchableOpacity onPress={() => setCommentModalPostId(null)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {getActivePost() && (
              <View style={styles.commentPostSummary}>
                <Ionicons name="location" size={13} color={colors.primary} />
                <Text style={styles.commentPostLocation}>{getActivePost()!.location}</Text>
                <Text style={styles.commentPostDot}>·</Text>
                <StarRating rating={getActivePost()!.rating} size={12} />
              </View>
            )}
            {commentModalPostId && (
              <View style={styles.modalRatingRow}>
                <Text style={styles.modalRatingLabel}>Đánh giá khoảnh khắc này:</Text>
                <StarRating rating={userRatings[commentModalPostId] ?? 0} interactive onRate={(s) => handleRateMoment(commentModalPostId, s)} size={24} />
              </View>
            )}
            <ScrollView style={styles.commentList} showsVerticalScrollIndicator={false}>
              {getActiveComments().map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <Image source={{ uri: c.avatar }} style={styles.commentAvatar} />
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{c.author}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                    <Text style={styles.commentTime}>{c.time}</Text>
                  </View>
                </View>
              ))}
              {getActiveComments().length === 0 && (
                <Text style={styles.emptyComments}>Chưa có bình luận. Hãy là người đầu tiên!</Text>
              )}
            </ScrollView>
            <View style={styles.commentInputRow}>
              <Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=80' }} style={styles.commentAvatar} />
              <TextInput
                style={styles.commentInput}
                placeholder="Viết bình luận..."
                placeholderTextColor={colors.textSecondary}
                value={newCommentText}
                onChangeText={setNewCommentText}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendCommentBtn, !newCommentText.trim() && styles.sendBtnDisabled]}
                onPress={submitComment}
                disabled={!newCommentText.trim()}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══ SHARE TO CHAT MODAL ══ */}
      <ShareToChatModal
        visible={sharePost !== null}
        post={sharePost}
        onClose={() => setSharePost(null)}
      />

      {/* ══ CREATE MOMENT MODAL ══ */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCreateModal(false)} />
          <View style={styles.createSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Chia sẻ khoảnh khắc</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              <TouchableOpacity style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
                <Text style={styles.photoPlaceholderText}>Thêm ảnh chuyến đi</Text>
                <Text style={styles.photoPlaceholderSub}>Tối đa 9 ảnh</Text>
              </TouchableOpacity>
              <View style={styles.createField}>
                <Text style={styles.createLabel}>Khoảnh khắc của bạn</Text>
                <TextInput style={[styles.createInput, styles.createTextArea]} placeholder="Kể về chuyến đi, cảm xúc, mẹo hay..." placeholderTextColor={colors.textSecondary} multiline numberOfLines={4} value={draft.caption} onChangeText={(t) => setDraft((d) => ({ ...d, caption: t }))} />
              </View>
              <View style={styles.createField}>
                <Text style={styles.createLabel}>Địa điểm</Text>
                <View style={styles.createInputRow}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <TextInput style={[styles.createInput, { flex: 1 }]} placeholder="VD: Tà Xùa, Sơn La" placeholderTextColor={colors.textSecondary} value={draft.location} onChangeText={(t) => setDraft((d) => ({ ...d, location: t }))} />
                </View>
              </View>
              <View style={styles.createField}>
                <Text style={styles.createLabel}>Lộ trình</Text>
                <View style={styles.createInputRow}>
                  <Ionicons name="navigate-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <TextInput style={[styles.createInput, { flex: 1 }]} placeholder="VD: Hà Nội → Nghĩa Lộ → Tà Xùa" placeholderTextColor={colors.textSecondary} value={draft.route} onChangeText={(t) => setDraft((d) => ({ ...d, route: t }))} />
                </View>
              </View>
              <View style={styles.createRow}>
                <View style={[styles.createField, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.createLabel}>Quãng đường</Text>
                  <TextInput style={styles.createInput} placeholder="VD: 285 km" placeholderTextColor={colors.textSecondary} value={draft.distance} onChangeText={(t) => setDraft((d) => ({ ...d, distance: t }))} />
                </View>
                <View style={[styles.createField, { flex: 1 }]}>
                  <Text style={styles.createLabel}>Thời gian</Text>
                  <TextInput style={styles.createInput} placeholder="VD: 2 ngày 1 đêm" placeholderTextColor={colors.textSecondary} value={draft.duration} onChangeText={(t) => setDraft((d) => ({ ...d, duration: t }))} />
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.submitBtn, !draft.caption.trim() && styles.submitBtnDisabled]}
              disabled={!draft.caption.trim()}
              onPress={() => { setShowCreateModal(false); setDraft({ caption: '', location: '', route: '', distance: '', duration: '' }); }}
            >
              <Text style={styles.submitBtnText}>Đăng khoảnh khắc</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.background },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#5D3A29' },
  createPostBtn: { width: 40, height: 40, backgroundColor: colors.primary, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 20, backgroundColor: colors.background },
  tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: colors.primary },
  tabText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  activeTabText: { color: colors.primary, fontWeight: 'bold' },
  scrollContent: { paddingTop: 12, paddingHorizontal: 16 },

  // Moment Card
  momentCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  authorName: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  postTime: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // 3-dot menu
  menuDotBtn: { padding: 4 },
  dropdownMenu: {
    position: 'absolute',
    top: 32,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 100,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F0EB' },
  dropdownItemText: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },

  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  locationText: { fontSize: 13, fontWeight: '700', color: colors.primary, marginLeft: 4, flex: 1 },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  routeText: { fontSize: 12, color: colors.textSecondary, marginLeft: 4, flex: 1, lineHeight: 18 },
  statChips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statChip: { backgroundColor: colors.cardBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  captionText: { fontSize: 14, color: colors.textPrimary, lineHeight: 21, marginBottom: 12 },
  singleImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  imageGrid: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  gridImageLeft: { flex: 1, height: 160, borderRadius: 12 },
  gridImageRight: { flex: 1, height: 160, borderRadius: 12 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  ratingValue: { fontSize: 13, fontWeight: 'bold', color: colors.textPrimary },
  ratingCount: { fontSize: 12, color: colors.textSecondary },
  myRatingBadge: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: colors.primary, backgroundColor: colors.cardBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rateBtn: { marginLeft: 'auto', backgroundColor: colors.cardBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  rateBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  actionText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  actionTextLiked: { color: colors.primary, fontWeight: '700' },

  commentPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 10, backgroundColor: colors.background, borderRadius: 10, gap: 8 },
  commentAvatarSmall: { width: 28, height: 28, borderRadius: 14 },
  commentPreviewAuthor: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  commentPreviewText: { fontSize: 12, color: colors.textSecondary },

  // Ghep Doan
  filterScroll: { marginBottom: 12 },
  filterChip: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.border },
  activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  activeFilterText: { color: '#FFFFFF' },
  ghepDoanCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: colors.border },
  gdHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  gdAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  gdMeta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gdAuthor: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  gdTypePill: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  gdTypeText: { fontSize: 11, color: '#2E7D32', fontWeight: 'bold' },
  gdTitle: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  gdDetails: { backgroundColor: colors.background, padding: 12, borderRadius: 8, marginBottom: 16, gap: 4 },
  gdDetailText: { fontSize: 13, color: colors.textSecondary },
  gdActions: { flexDirection: 'row', gap: 12 },
  gdActionBtn: { flex: 1, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  gdActionText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
  gdPrimaryBtn: { backgroundColor: colors.primary, borderColor: colors.primary },
  gdPrimaryText: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  gdInterestedBtn: { backgroundColor: colors.cardBg, borderColor: colors.border },
  gdInterestedText: { color: colors.textPrimary },

  // Modal base
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },

  // Comment Sheet
  commentSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '75%', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  commentPostSummary: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  commentPostLocation: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  commentPostDot: { fontSize: 12, color: colors.textSecondary },
  modalRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalRatingLabel: { fontSize: 13, color: colors.textSecondary },
  commentList: { flex: 1, marginBottom: 12 },
  commentItem: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  commentBubble: { flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 10 },
  commentAuthor: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  commentText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  commentTime: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  emptyComments: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, marginTop: 40 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  commentInput: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.textPrimary, maxHeight: 100 },
  sendCommentBtn: { width: 40, height: 40, backgroundColor: colors.primary, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },

  // Share Modal
  shareSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20, maxHeight: '80%' },
  sharePostPreview: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, padding: 12, marginBottom: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  sharePostThumb: { width: 64, height: 64, borderRadius: 10 },
  sharePostAuthor: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  sharePostCaption: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 4 },
  sharePostLocation: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sharePostLocationText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  shareSectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  chatGroupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F0EB', gap: 12 },
  chatGroupAvatar: { width: 44, height: 44, borderRadius: 22 },
  chatGroupName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  sendBtn: { paddingHorizontal: 18, paddingVertical: 7, backgroundColor: colors.primary, borderRadius: 20 },
  sendBtnSent: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border },
  sendBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  shareExternalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.textPrimary, height: 50, borderRadius: 16, marginTop: 16 },
  shareExternalText: { color: colors.primary, fontWeight: 'bold', fontSize: 15 },

  // Create Moment Sheet
  createSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '90%', paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  photoPlaceholder: { height: 150, borderRadius: 16, borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: colors.background, gap: 8 },
  photoPlaceholderText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  photoPlaceholderSub: { fontSize: 12, color: colors.border },
  createField: { marginBottom: 16 },
  createLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  createInput: { backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.textPrimary, borderWidth: 1, borderColor: colors.border },
  createTextArea: { height: 100, textAlignVertical: 'top' },
  createInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  createRow: { flexDirection: 'row' },
  submitBtn: { backgroundColor: colors.primary, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});

export default CommunityScreen;
