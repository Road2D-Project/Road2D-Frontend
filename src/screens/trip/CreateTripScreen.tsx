/**
 * CreateTripScreen.tsx
 *
 * Flow tạo trip (mock data — chờ backend):
 *
 * [step 1] Chọn route (tên + ảnh minh hoạ)
 * [step 2] Thiết lập chuyến (thời gian, phương tiện, ghi chú, public/private)
 * [step 3] Chọn bạn bè từ danh sách friend mock
 * [step 4] Xác nhận → hiện invite link + QR code mock
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  TextInput,
  Platform,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, CreateTripScreenNavigationProp } from '../../types/navigation';
import { useTripStore } from '../../store/useTripStore';

// ─── Brand colors ─────────────────────────────────────────────────────────────
const C = {
  primary:    '#CD8554',
  primaryDark:'#A85A32',
  heading:    '#5D3A29',
  text:       '#3E2723',
  sub:        '#6D4C41',
  bg:         '#FDFBF7',
  card:       '#FFFFFF',
  border:     '#E0D5CC',
  success:    '#4CAF50',
};

// ─── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_ROUTES = [
  {
    id: 'r1',
    name: 'Hà Giang Loop',
    distance: '350 km',
    stops: 6,
    image: 'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=400',
  },
  {
    id: 'r2',
    name: 'Tà Xùa Săn Mây',
    distance: '285 km',
    stops: 4,
    image: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=400',
  },
  {
    id: 'r3',
    name: 'Trảng Bom — Đà Lạt',
    distance: '300 km',
    stops: 5,
    image: 'https://images.unsplash.com/photo-1519098901909-b1553a1190af?q=80&w=400',
  },
  {
    id: 'r4',
    name: 'Cung Đường Tây Bắc',
    distance: '850 km',
    stops: 10,
    image: 'https://images.unsplash.com/photo-1549880181-56a44cf4a9a5?q=80&w=400',
  },
];

const MOCK_FRIENDS = [
  { id: 'f1', name: 'Tuấn Đạt', username: '@tuan.dat', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100' },
  { id: 'f2', name: 'Thu Hà', username: '@thu.ha', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100' },
  { id: 'f3', name: 'Minh Trang', username: '@minh.trang', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=100' },
  { id: 'f4', name: 'Hoài Nam', username: '@hoai.nam', avatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?q=80&w=100' },
  { id: 'f5', name: 'Thanh Trúc', username: '@thanh.truc', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100' },
  { id: 'f6', name: 'Bảo Long', username: '@bao.long', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=100' },
];

const VEHICLES = ['Xe đạp', 'Xe máy', 'Ô tô'] as const;

// ─── Sub-components ────────────────────────────────────────────────────────────

const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <View style={stepStyles.container}>
    {Array.from({ length: total }).map((_, i) => (
      <React.Fragment key={i}>
        <View style={[stepStyles.dot, i <= current && stepStyles.dotActive]}>
          {i < current ? (
            <Ionicons name="checkmark" size={10} color="#FFF" />
          ) : (
            <Text style={[stepStyles.dotText, i === current && stepStyles.dotTextActive]}>
              {i + 1}
            </Text>
          )}
        </View>
        {i < total - 1 && (
          <View style={[stepStyles.line, i < current && stepStyles.lineActive]} />
        )}
      </React.Fragment>
    ))}
  </View>
);

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#E8DDD5',
    justifyContent: 'center', alignItems: 'center',
  },
  dotActive: { backgroundColor: C.primary },
  dotText: { fontSize: 12, fontWeight: '700', color: C.sub },
  dotTextActive: { color: '#FFF' },
  line: { flex: 1, height: 2, backgroundColor: '#E8DDD5', marginHorizontal: 4 },
  lineActive: { backgroundColor: C.primary },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────

const CreateTripScreen = () => {
  const navigation = useNavigation<CreateTripScreenNavigationProp>();

  // Navigation state
  const [step, setStep] = useState(0); // 0-3

  // Step 1 state
  const [selectedRoute, setSelectedRoute] = useState<typeof MOCK_ROUTES[0] | null>(null);

  // Step 2 state
  const [tripName, setTripName] = useState('');
  const [vehicle, setVehicle] = useState<typeof VEHICLES[number]>('Xe máy');
  const [startDate, setStartDate] = useState('05:00 — 24/12/2026');
  const [note, setNote] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isRequireApproval, setIsRequireApproval] = useState(false);
  const [maxMembers, setMaxMembers] = useState('15');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 3 state
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchFriend, setSearchFriend] = useState('');

  // Step 4 mock result
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const currentTripId = useTripStore((s: any) => s.currentTripId);
  const createTrip = useTripStore((s: any) => s.createTrip);

  // ── Navigation helpers ──
  const goNext = () => setStep((s) => Math.min(s + 1, 3));
  const goBack = () => {
    if (step === 0) navigation.goBack();
    else setStep((s) => s - 1);
  };

  const toggleFriend = (id: string) => {
    setSelectedFriends((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!selectedRoute) return;
    setIsCreating(true);
    try {
      const payload = {
        name: tripName || selectedRoute.name,
        routeId: selectedRoute.id,
        routeName: selectedRoute.name,
        distanceKm: parseInt(selectedRoute.distance) || 0,
        startAt: new Date().toISOString(), // Dùng tạm Date.now() cho mock
        vehicle: vehicle as any,
        maxMembers: parseInt(maxMembers) || 15,
        isPublic,
        note,
        invitedUserIds: selectedFriends,
        coverImage: selectedRoute.image,
      };
      const trip = await createTrip(payload);
      setCreatedInviteCode(trip.inviteCode);
      setStep(3);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tạo chuyến đi.');
    } finally {
      setIsCreating(false);
    }
  };

  // ── STEP LABELS ──
  const STEP_LABELS = ['Chọn lộ trình', 'Thiết lập', 'Mời bạn bè', 'Hoàn tất'];

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 0 — Chọn route
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStep0 = () => (
    <>
      <Text style={styles.stepHeading}>Chọn lộ trình</Text>
      <Text style={styles.stepSub}>Chọn cung đường hoặc tạo mới từ bản đồ</Text>

      {MOCK_ROUTES.map((route) => (
        <TouchableOpacity
          key={route.id}
          style={[styles.routeCard, selectedRoute?.id === route.id && styles.routeCardActive]}
          activeOpacity={0.85}
          onPress={() => setSelectedRoute(route)}
        >
          <Image source={{ uri: route.image }} style={styles.routeCardImage} />
          <View style={styles.routeCardOverlay} />
          {selectedRoute?.id === route.id && (
            <View style={styles.routeSelectedBadge}>
              <Ionicons name="checkmark-circle" size={22} color={C.primary} />
            </View>
          )}
          <View style={styles.routeCardContent}>
            <Text style={styles.routeCardName}>{route.name}</Text>
            <View style={styles.routeCardMeta}>
              <View style={styles.routeMetaItem}>
                <MaterialCommunityIcons name="map-marker-path" size={13} color="#EAEAEA" />
                <Text style={styles.routeMetaText}>{route.distance}</Text>
              </View>
              <View style={styles.routeMetaItem}>
                <Ionicons name="location-outline" size={13} color="#EAEAEA" />
                <Text style={styles.routeMetaText}>{route.stops} trạm dừng</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={styles.createRouteBtn}
        onPress={() => navigation.navigate('CreateRoute')}
      >
        <Feather name="plus" size={18} color={C.primary} />
        <Text style={styles.createRouteBtnText}>Tạo lộ trình mới trên bản đồ</Text>
      </TouchableOpacity>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Thiết lập chuyến đi
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStep1 = () => (
    <>
      <Text style={styles.stepHeading}>Thiết lập chuyến đi</Text>
      {selectedRoute && (
        <View style={styles.selectedRouteChip}>
          <MaterialCommunityIcons name="map-marker-path" size={15} color={C.primary} />
          <Text style={styles.selectedRouteChipText}>{selectedRoute.name} · {selectedRoute.distance}</Text>
        </View>
      )}

      {/* Tên chuyến đi */}
      <Text style={styles.fieldLabel}>Tên chuyến đi</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Ví dụ: Hà Giang Loop tháng 12"
        placeholderTextColor={C.border}
        value={tripName}
        onChangeText={setTripName}
      />

      {/* Phương tiện */}
      <Text style={styles.fieldLabel}>Phương tiện</Text>
      <View style={styles.vehicleRow}>
        {VEHICLES.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.vehicleBtn, vehicle === v && styles.vehicleBtnActive]}
            onPress={() => setVehicle(v)}
          >
            <Text style={[styles.vehicleBtnText, vehicle === v && styles.vehicleBtnTextActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Thời gian */}
      <Text style={styles.fieldLabel}>Thời gian xuất phát</Text>
      <TouchableOpacity
        style={styles.inputBox}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.inputBoxText}>{startDate}</Text>
        <Ionicons name="calendar-outline" size={18} color={C.sub} />
      </TouchableOpacity>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', padding: 24, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: C.heading }}>Chọn thời gian xuất phát</Text>
            {['05:00 — 24/12/2026', '06:00 — 25/12/2026', '07:30 — 01/01/2027', '08:00 — 15/01/2027'].map(d => (
              <TouchableOpacity key={d} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }} onPress={() => { setStartDate(d); setShowDatePicker(false); }}>
                <Text style={{ fontSize: 16, color: startDate === d ? C.primary : C.text, fontWeight: startDate === d ? 'bold' : 'normal' }}>{d}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={{ marginTop: 20, padding: 16, backgroundColor: C.primary, borderRadius: 14, alignItems: 'center' }} onPress={() => setShowDatePicker(false)}>
              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>Xong</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Giới hạn thành viên */}
      <Text style={styles.fieldLabel}>Giới hạn thành viên</Text>
      <View style={styles.inputBox}>
        <TouchableOpacity onPress={() => setMaxMembers(String(Math.max(1, parseInt(maxMembers || '1') - 1)))}>
          <Ionicons name="remove-circle-outline" size={26} color={C.primary} />
        </TouchableOpacity>
        <TextInput
          style={[styles.textInput, { marginBottom: 0, flex: 1, borderWidth: 0, padding: 0, textAlign: 'center', fontSize: 16, fontWeight: 'bold' }]}
          keyboardType="number-pad"
          value={maxMembers}
          onChangeText={setMaxMembers}
          placeholder="Tối đa"
          placeholderTextColor={C.border}
        />
        <TouchableOpacity onPress={() => setMaxMembers(String(parseInt(maxMembers || '0') + 1))}>
          <Ionicons name="add-circle-outline" size={26} color={C.primary} />
        </TouchableOpacity>
        <Text style={[styles.inputBoxText, { marginLeft: 12 }]}>người</Text>
      </View>

      {/* Ghi chú */}
      <Text style={styles.fieldLabel}>Giới thiệu</Text>
      <TextInput
        style={[styles.textInput, styles.textArea]}
        placeholder="Nhớ mang áo mưa. Góp quỹ 500k/người..."
        placeholderTextColor={C.border}
        multiline
        value={note}
        onChangeText={setNote}
      />

      {/* Public / Private */}
      <View style={styles.switchRow}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={styles.switchLabel}>Hiển thị công khai</Text>
          <Text style={styles.switchDesc}>Những người có thể thấy được nhóm của bạn ở trên cộng đồng</Text>
        </View>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Yêu cầu phê duyệt */}
      <View style={[styles.switchRow, { marginTop: 16 }]}>
        <View style={{ flex: 1, paddingRight: 16 }}>
          <Text style={styles.switchLabel}>Yêu cầu phê duyệt</Text>
          <Text style={styles.switchDesc}>Thành viên mới tham gia vào nhóm phải thông qua sự phê duyệt của trưởng nhóm</Text>
        </View>
        <Switch
          value={isRequireApproval}
          onValueChange={setIsRequireApproval}
          trackColor={{ false: C.border, true: C.primary }}
          thumbColor="#FFFFFF"
        />
      </View>
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Mời bạn bè
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStep2 = () => (
    <>
      <Text style={styles.stepHeading}>Mời bạn bè</Text>
      <Text style={styles.stepSub}>
        Chọn bạn từ danh sách để mời vào chuyến đi ngay.
        {'\n'}Bạn cũng có thể share link sau khi tạo xong.
      </Text>

      {/* Thanh tìm kiếm */}
      <View style={[styles.inputBox, { marginBottom: 16 }]}>
        <Ionicons name="search-outline" size={20} color={C.sub} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.textInput, { marginBottom: 0, flex: 1, borderWidth: 0, padding: 0 }]}
          placeholder="Tìm kiếm bạn bè..."
          placeholderTextColor={C.border}
          value={searchFriend}
          onChangeText={setSearchFriend}
        />
      </View>

      {selectedFriends.length > 0 && (
        <View style={styles.selectedChipsRow}>
          {selectedFriends.map((id) => {
            const f = MOCK_FRIENDS.find((fr) => fr.id === id)!;
            return (
              <TouchableOpacity
                key={id}
                style={styles.selectedChip}
                onPress={() => toggleFriend(id)}
              >
                <Image source={{ uri: f.avatar }} style={styles.chipAvatar} />
                <Text style={styles.chipName}>{f.name.split(' ').pop()}</Text>
                <Ionicons name="close" size={12} color={C.sub} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {MOCK_FRIENDS.filter(f => f.name.toLowerCase().includes(searchFriend.toLowerCase())).map((friend) => {
        const selected = selectedFriends.includes(friend.id);
        return (
          <TouchableOpacity
            key={friend.id}
            style={[styles.friendRow, selected && styles.friendRowSelected]}
            activeOpacity={0.75}
            onPress={() => toggleFriend(friend.id)}
          >
            <Image source={{ uri: friend.avatar }} style={styles.friendAvatar} />
            <View style={styles.friendInfo}>
              <Text style={styles.friendName}>{friend.name}</Text>
              <Text style={styles.friendUsername}>{friend.username}</Text>
            </View>
            <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
              {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Hoàn tất
  // ═══════════════════════════════════════════════════════════════════════════
  const renderStep3 = () => {
    const invitedFriends = MOCK_FRIENDS.filter((f) => selectedFriends.includes(f.id));
    return (
      <>
        {/* Success icon */}
        <View style={styles.successIconWrap}>
          <View style={styles.successCircle}>
            <Ionicons name="checkmark" size={40} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>Tạo chuyến đi thành công!</Text>
          <Text style={styles.successSub}>
            {selectedRoute?.name ?? 'Chuyến đi'} · {selectedRoute?.distance}
          </Text>
        </View>

        {/* Invite code */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteCardLabel}>MÃ MỜI</Text>
          <Text style={styles.inviteCode}>{createdInviteCode || 'R2D-7F3K9'}</Text>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => Alert.alert('Đã sao chép!', `Mã ${createdInviteCode} đã được sao chép.`)}
          >
            <Feather name="copy" size={16} color={C.primary} />
            <Text style={styles.copyBtnText}>Sao chép mã</Text>
          </TouchableOpacity>
        </View>

        {/* Share link */}
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => Alert.alert('Chia sẻ link', 'https://road2d.app/join/' + createdInviteCode)}>
            <Feather name="share-2" size={18} color="#FFF" />
            <Text style={styles.shareBtnText}>Chia sẻ link</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareBtn, { backgroundColor: C.card, borderWidth: 1.5, borderColor: C.primary }]}
            onPress={() => Alert.alert('QR Code', 'QR code sẽ hiển thị ở đây trong bản chính thức.')}
          >
            <MaterialCommunityIcons name="qrcode" size={18} color={C.primary} />
            <Text style={[styles.shareBtnText, { color: C.primary }]}>Xem QR</Text>
          </TouchableOpacity>
        </View>

        {/* Invited members */}
        {invitedFriends.length > 0 && (
          <View style={styles.invitedSection}>
            <Text style={styles.invitedTitle}>Đã mời ({invitedFriends.length} người)</Text>
            {invitedFriends.map((f) => (
              <View key={f.id} style={styles.invitedRow}>
                <Image source={{ uri: f.avatar }} style={styles.invitedAvatar} />
                <Text style={styles.invitedName}>{f.name}</Text>
                <View style={styles.invitedStatus}>
                  <Text style={styles.invitedStatusText}>Đang chờ xác nhận</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Go to team roster */}
        <TouchableOpacity
          style={styles.rosterBtn}
          onPress={() => {
            if (currentTripId) {
              navigation.navigate('TeamRoster', { tripId: currentTripId });
            } else {
              navigation.navigate('Home');
            }
          }}
        >
          <Text style={styles.rosterBtnText}>Xem danh sách thành viên</Text>
          <Feather name="arrow-right" size={16} color={C.primary} />
        </TouchableOpacity>
      </>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Bottom CTA button text
  // ═══════════════════════════════════════════════════════════════════════════
  const getCtaLabel = () => {
    if (step === 0) return selectedRoute ? 'Tiếp tục' : 'Chọn lộ trình để tiếp tục';
    if (step === 1) return 'Tiếp tục';
    if (step === 2) return `Tạo chuyến đi${selectedFriends.length > 0 ? ` & mời ${selectedFriends.length} bạn` : ''}`;
    return 'Về trang chủ';
  };

  const handleCta = () => {
    if (step === 0 && !selectedRoute) return;
    if (step === 1 && !tripName.trim()) {
      Alert.alert('Thiếu tên', 'Vui lòng nhập tên chuyến đi.');
      return;
    }
    if (step === 2) { 
      if (!isCreating) handleCreate(); 
      return; 
    }
    if (step === 3) { navigation.navigate('Home'); return; }
    goNext();
  };

  const ctaDisabled = (step === 0 && !selectedRoute) || isCreating;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={22} color={C.heading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{STEP_LABELS[step]}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator current={step} total={4} />
        {step === 0 && renderStep0()}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.ctaBtn, ctaDisabled && styles.ctaBtnDisabled]}
          onPress={handleCta}
          activeOpacity={ctaDisabled ? 1 : 0.85}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              {step === 3
                ? <Ionicons name="home-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                : step === 2
                  ? <Ionicons name="paper-plane-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  : null
              }
              <Text style={styles.ctaBtnText}>{getCtaLabel()}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0E8E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.heading,
  },

  scrollContent: {
    padding: 20,
  },

  // Step content
  stepHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: C.heading,
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 14,
    color: C.sub,
    marginBottom: 20,
    lineHeight: 20,
  },

  // Step 0 — Route cards
  routeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    height: 110,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  routeCardActive: {
    borderColor: C.primary,
  },
  routeCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  routeCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  routeSelectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  routeCardContent: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    right: 14,
  },
  routeCardName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  routeCardMeta: { flexDirection: 'row', gap: 12 },
  routeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  routeMetaText: { fontSize: 12, color: '#EAEAEA', fontWeight: '500' },

  createRouteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  createRouteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },

  // Step 1 — Form
  selectedRouteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDF0E6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8D0BC',
  },
  selectedRouteChipText: { fontSize: 13, fontWeight: '600', color: C.primaryDark },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: C.sub,
    marginBottom: 8,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    marginBottom: 16,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  inputBoxText: { fontSize: 15, color: C.text },
  vehicleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  vehicleBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  vehicleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  vehicleBtnText: { fontSize: 13, fontWeight: '600', color: C.sub },
  vehicleBtnTextActive: { color: '#FFF' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  switchDesc: { fontSize: 12, color: C.sub },

  // Step 2 — Friends
  selectedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDF0E6',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E8D0BC',
  },
  chipAvatar: { width: 20, height: 20, borderRadius: 10 },
  chipName: { fontSize: 12, fontWeight: '600', color: C.primaryDark },

  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  friendRowSelected: {
    borderColor: C.primary,
    backgroundColor: '#FDF8F4',
  },
  friendAvatar: { width: 46, height: 46, borderRadius: 23, marginRight: 12 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 2 },
  friendUsername: { fontSize: 12, color: C.sub },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: { backgroundColor: C.primary, borderColor: C.primary },

  // Step 3 — Success
  successIconWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: C.heading, marginBottom: 4 },
  successSub: { fontSize: 14, color: C.sub },

  inviteCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E8D0BC',
    marginBottom: 14,
    shadowColor: C.heading,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inviteCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.sub,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  inviteCode: {
    fontSize: 36,
    fontWeight: '900',
    color: C.heading,
    letterSpacing: 4,
    marginBottom: 14,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  copyBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },

  shareRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 13,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  invitedSection: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  invitedTitle: { fontSize: 14, fontWeight: '700', color: C.heading, marginBottom: 12 },
  invitedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  invitedAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  invitedName: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
  invitedStatus: {
    backgroundColor: '#FFF8E6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  invitedStatusText: { fontSize: 11, color: '#A07800', fontWeight: '600' },

  rosterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 14,
  },
  rosterBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },

  // Bottom bar
  bottomBar: {
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  ctaBtn: {
    backgroundColor: C.primary,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaBtnDisabled: {
    backgroundColor: '#D7CCC8',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default CreateTripScreen;
