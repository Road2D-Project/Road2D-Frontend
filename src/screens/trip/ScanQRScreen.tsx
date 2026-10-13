/**
 * ScanQRScreen.tsx
 * Màn hình quét mã QR để tham gia chuyến đi (từ nút (+) trên HomeScreen).
 *
 * Tính năng:
 * - Quét trực tiếp bằng CameraView (expo-camera)
 * - Bật/tắt đèn flash
 * - Chọn ảnh chứa mã QR từ thư viện máy (expo-image-picker + scanFromURLAsync)
 * - Tự động trích xuất token/tripId và gọi tripService.joinTrip(token)
 * - Thông báo chuẩn khi quét trúng trip đã tham gia: "Bạn đã ở trong chuyến đi này rồi!"
 *   kèm nút "Xem chuyến đi" để mở trực tiếp chi tiết chuyến đi.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { ScanQRScreenNavigationProp } from '../../types/navigation';
import tripService from '../../services/api/tripService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCAN_BOX_SIZE = Math.min(SCREEN_WIDTH * 0.72, 280);

// ─── Brand Colors ─────────────────────────────────────────────────────────────
const C = {
  primary: '#CD8554',
  primaryDark: '#A85A32',
  heading: '#5D3A29',
  text: '#3E2723',
  sub: '#6D4C41',
  bg: '#FDFBF7',
  card: '#FFFFFF',
  border: '#E0D5CC',
  success: '#4CAF50',
  mask: 'rgba(0, 0, 0, 0.62)',
};

/** Trích xuất token và tripId từ chuỗi QR (hỗ trợ JSON, URL deep link, hoặc raw UUID) */
function parseQRData(raw: string): { token: string; tripId?: string } {
  const str = raw.trim();
  // 1. Dạng JSON: {"token": "...", "tripId": "..."}
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.token) {
        return { token: String(parsed.token).trim(), tripId: parsed.tripId ? String(parsed.tripId) : undefined };
      }
    } catch {
      // Bỏ qua nếu parse JSON lỗi
    }
  }

  // 2. Dạng URL: road2d://join/<token>?tripId=... hoặc https://road2d.app/join/<token>?tripId=...
  if (str.includes('join/')) {
    const afterJoin = str.split('join/')[1];
    const [tokenPart, queryPart] = afterJoin.split('?');
    const token = tokenPart.replace(/\/+$/, '').trim();
    let tripId: string | undefined;
    if (queryPart) {
      const match = queryPart.match(/tripId=([a-zA-Z0-9-]+)/);
      if (match) {
        tripId = match[1];
      }
    }
    return { token, tripId };
  }

  // 3. Chuỗi token raw (UUID hoặc invite code)
  return { token: str };
}

const ScanQRScreen = () => {
  const navigation = useNavigation<ScanQRScreenNavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();

  const [torch, setTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Modal trạng thái: Đã ở trong chuyến đi
  const [alreadyMemberModal, setAlreadyMemberModal] = useState<{
    visible: boolean;
    tripId?: string;
  }>({ visible: false });

  // Modal trạng thái: Tham gia thành công
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    tripId?: string;
    tripName?: string;
    isPending?: boolean;
  }>({ visible: false });

  /** Xử lý mã QR sau khi quét được từ camera hoặc tải ảnh */
  const handleProcessCode = useCallback(async (rawCode: string) => {
    if (!rawCode || isProcessing) return;
    setIsProcessing(true);
    setScanned(true);

    const { token, tripId } = parseQRData(rawCode);

    if (!token) {
      Alert.alert(
        'Mã không hợp lệ',
        'Nội dung mã QR không đúng định dạng của Road2D.',
        [{ text: 'Quét lại', onPress: () => { setScanned(false); setIsProcessing(false); } }]
      );
      return;
    }

    try {
      const joinedTrip = await tripService.joinTrip(token);
      const targetTripId = joinedTrip.id || tripId;
      const isPending = (joinedTrip as any)?.status === 'pending';

      setSuccessModal({
        visible: true,
        tripId: targetTripId,
        tripName: joinedTrip.name,
        isPending,
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const errorMsg = String(err?.response?.data?.message || err?.response?.data?.error || err?.message || '');

      // Trường hợp: Đã là thành viên của chuyến đi (409 Conflict)
      if (status === 409 || errorMsg.includes('already a trip member')) {
        let matchedTripId = tripId || (err as any)?.existingTrip?.id;

        // Nếu chưa có tripId, thử tra danh sách chuyến đi hiện có của user
        if (!matchedTripId) {
          try {
            const myTrips = await tripService.getTrips();
            const found = myTrips.find((t) => t.id === token || t.inviteCode === token);
            if (found) {
              matchedTripId = found.id;
            }
          } catch {
            // Bỏ qua lỗi phụ
          }
        }

        setAlreadyMemberModal({
          visible: true,
          tripId: matchedTripId,
        });
      } else if (status === 404 || errorMsg.includes('not found')) {
        Alert.alert(
          'Không tìm thấy chuyến đi',
          'Mã mời không tồn tại hoặc đã bị hủy bỏ bởi trưởng nhóm.',
          [{ text: 'Quét lại', onPress: () => { setScanned(false); setIsProcessing(false); } }]
        );
      } else {
        Alert.alert(
          'Không thể tham gia',
          errorMsg || 'Đã có lỗi xảy ra khi tham gia chuyến đi. Vui lòng thử lại sau.',
          [{ text: 'Thử lại', onPress: () => { setScanned(false); setIsProcessing(false); } }]
        );
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);

  /** Callback từ CameraView */
  const onBarcodeScanned = (result: { data?: string }) => {
    if (scanned || isProcessing || !result.data) return;
    handleProcessCode(result.data);
  };

  /** Chọn ảnh từ máy và quét QR qua scanFromURLAsync */
  const handlePickImage = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return;
      }

      const imageUri = pickerResult.assets[0].uri;
      setIsProcessing(true);

      const scanResults = await scanFromURLAsync(imageUri, ['qr']);
      if (scanResults && scanResults.length > 0 && scanResults[0].data) {
        await handleProcessCode(scanResults[0].data);
      } else {
        setIsProcessing(false);
        Alert.alert(
          'Không tìm thấy mã QR',
          'Không phát hiện mã QR nào trong hình ảnh đã chọn. Vui lòng thử lại với ảnh rõ nét hơn.',
          [{ text: 'Đồng ý' }]
        );
      }
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert(
        'Lỗi đọc ảnh',
        err?.message || 'Không thể đọc hình ảnh đã chọn. Vui lòng thử lại.'
      );
    }
  };

  // ─── Giao diện xin quyền Camera ───────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        {/* Header */}
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={C.heading} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quét mã QR</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.permissionCard}>
          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera-outline" size={52} color={C.primary} />
          </View>
          <Text style={styles.permissionTitle}>Cần quyền truy cập Máy ảnh</Text>
          <Text style={styles.permissionDesc}>
            Road2D cần quyền sử dụng máy ảnh để quét mã QR và kết nối bạn vào các chuyến đi cùng bạn bè.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryBtnText}>Cấp quyền máy ảnh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            <Ionicons name="images-outline" size={18} color={C.primary} style={{ marginRight: 8 }} />
            <Text style={styles.secondaryBtnText}>Tải ảnh từ thư viện</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Giao diện quét QR trực tiếp ──────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Camera Fullscreen */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
      />

      {/* Mask tối màu xung quanh khung quét */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Vùng tối phía trên */}
        <View style={[styles.maskTop, { height: (SCREEN_HEIGHT - SCAN_BOX_SIZE) / 2 - 40 }]} />

        {/* Dải giữa chứa khung quét */}
        <View style={[styles.maskCenterRow, { height: SCAN_BOX_SIZE }]}>
          <View style={[styles.maskSide, { width: (SCREEN_WIDTH - SCAN_BOX_SIZE) / 2 }]} />

          {/* Khung ngắm quét QR */}
          <View style={[styles.scanBox, { width: SCAN_BOX_SIZE, height: SCAN_BOX_SIZE }]}>
            {/* 4 góc bo của khung */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>

          <View style={[styles.maskSide, { width: (SCREEN_WIDTH - SCAN_BOX_SIZE) / 2 }]} />
        </View>

        {/* Vùng tối phía dưới */}
        <View style={styles.maskBottom}>
          <Text style={styles.scanInstruction}>
            Căn chỉnh mã QR chuyến đi vào giữa khung hình
          </Text>

          {/* Nút chọn ảnh từ thư viện */}
          <TouchableOpacity
            style={styles.galleryBtn}
            onPress={handlePickImage}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.galleryBtnText}>Chọn ảnh từ máy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Top Bar Header */}
      <SafeAreaView style={styles.headerBar} edges={['top']}>
        <TouchableOpacity
          style={styles.headerCircleBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>

        <Text style={styles.headerBarTitle}>Quét mã QR</Text>

        <TouchableOpacity
          style={[styles.headerCircleBtn, torch && styles.headerCircleBtnActive]}
          onPress={() => setTorch((t) => !t)}
          activeOpacity={0.8}
        >
          <Ionicons name={torch ? 'flash' : 'flash-off'} size={20} color="#FFF" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Loading Overlay khi đang xử lý API */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.processingText}>Đang kiểm tra chuyến đi...</Text>
          </View>
        </View>
      )}

      {/* ── Modal 1: Đã ở trong chuyến đi này rồi ──────────────────────────── */}
      <Modal
        visible={alreadyMemberModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAlreadyMemberModal({ visible: false });
          setScanned(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconCircleNotice}>
              <Ionicons name="information-circle" size={46} color={C.primary} />
            </View>

            <Text style={styles.modalTitle}>Đã ở trong chuyến đi</Text>
            <Text style={styles.modalMessage}>
              Bạn đã ở trong chuyến đi này rồi!
            </Text>

            <View style={styles.modalButtonColumn}>
              {alreadyMemberModal.tripId ? (
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    const id = alreadyMemberModal.tripId!;
                    setAlreadyMemberModal({ visible: false });
                    navigation.replace('TripDetails', { tripId: id });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalPrimaryBtnText}>Xem chuyến đi</Text>
                  <Feather name="arrow-right" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    setAlreadyMemberModal({ visible: false });
                    navigation.navigate('Home');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalPrimaryBtnText}>Về trang chủ</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setAlreadyMemberModal({ visible: false });
                  setScanned(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryBtnText}>Quét mã khác</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal 2: Tham gia thành công ─────────────────────────────────── */}
      <Modal
        visible={successModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSuccessModal({ visible: false });
          navigation.navigate('Home');
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <View style={styles.modalIconCircleSuccess}>
              <Ionicons name="checkmark-circle" size={46} color={C.success} />
            </View>

            <Text style={styles.modalTitle}>
              {successModal.isPending ? 'Đã gửi yêu cầu!' : 'Tham gia thành công!'}
            </Text>

            <Text style={styles.modalMessage}>
              {successModal.isPending
                ? 'Yêu cầu tham gia đã gửi đến trưởng nhóm. Bạn sẽ nhận thông báo khi được duyệt.'
                : `Bạn đã tham gia chuyến đi "${successModal.tripName || 'Road2D'}" thành công.`}
            </Text>

            <View style={styles.modalButtonColumn}>
              {successModal.tripId ? (
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    const id = successModal.tripId!;
                    setSuccessModal({ visible: false });
                    navigation.replace('TripDetails', { tripId: id });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalPrimaryBtnText}>Xem chi tiết chuyến đi</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setSuccessModal({ visible: false });
                  navigation.navigate('Home');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryBtnText}>Về trang chủ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ScanQRScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingCenter: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header Bar ──
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    zIndex: 10,
  },
  headerBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCircleBtnActive: {
    backgroundColor: C.primary,
  },

  // ── Viewfinder Mask ──
  maskTop: {
    width: '100%',
    backgroundColor: C.mask,
  },
  maskCenterRow: {
    flexDirection: 'row',
    width: '100%',
  },
  maskSide: {
    backgroundColor: C.mask,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: C.mask,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },

  scanBox: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: C.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },

  scanInstruction: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '500',
  },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  galleryBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Processing Overlay ──
  processingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  processingCard: {
    backgroundColor: C.card,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderRadius: 18,
    alignItems: 'center',
  },
  processingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: C.heading,
  },

  // ── Permission State ──
  permissionContainer: {
    flex: 1,
    backgroundColor: C.bg,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.heading,
  },
  permissionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F7EFE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.heading,
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionDesc: {
    fontSize: 14.5,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.primary,
    width: '100%',
    paddingVertical: 13,
    borderRadius: 14,
  },
  secondaryBtnText: {
    color: C.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Modals ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  modalBox: {
    backgroundColor: C.card,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  modalIconCircleNotice: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDF1E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIconCircleSuccess: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: C.heading,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 15,
    color: C.sub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButtonColumn: {
    width: '100%',
    gap: 10,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    backgroundColor: C.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  modalPrimaryBtnText: {
    color: '#FFF',
    fontSize: 15.5,
    fontWeight: '700',
  },
  modalSecondaryBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5ECE3',
    width: '100%',
  },
  modalSecondaryBtnText: {
    color: C.heading,
    fontSize: 15,
    fontWeight: '600',
  },
});
