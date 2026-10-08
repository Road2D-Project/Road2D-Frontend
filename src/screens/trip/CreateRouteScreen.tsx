import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, TextInput, ScrollView, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { CreateRouteScreenNavigationProp } from '../../types/navigation';
import { colors } from '../../theme/colors';

const CreateRouteScreen = () => {
  const navigation = useNavigation<CreateRouteScreenNavigationProp>();
  const [step, setStep] = useState(1);
  const [coverImage, setCoverImage] = useState<string | null>(null);

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Image source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800' }} style={styles.mapBg} />
      <View style={styles.mapOverlay} />
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>Tap bản đồ để thêm điểm, giữ để di chuyển</Text>
      </View>
      <View style={[styles.mapMarker, { top: '40%', left: '30%' }]}>
        <View style={styles.pin}>
          <Text style={styles.pinText}>1</Text>
        </View>
      </View>
      <View style={[styles.mapMarker, { top: '50%', left: '60%' }]}>
        <View style={styles.pin}>
          <Text style={styles.pinText}>2</Text>
        </View>
      </View>
      <View style={styles.fakePolyline} />
      
      <View style={styles.bottomPanel}>
        <Text style={styles.totalKmText}>Tổng quãng đường: <Text style={styles.kmHighlight}>45 km</Text></Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
          <Text style={styles.primaryBtnText}>Tiếp theo →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Thông tin Tuyến đường</Text>
      <TextInput style={styles.input} placeholder="Tên tuyến đường (VD: Hà Giang Loop)" placeholderTextColor="#999" />
      
      <TouchableOpacity 
        style={styles.uploadBox}
        onPress={() => setCoverImage('https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=600')}
      >
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.uploadedImg} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 8, opacity: 0.6 }} />
            <Text style={styles.uploadText}>Tải ảnh bìa lên</Text>
          </>
        )}
      </TouchableOpacity>

      <TextInput 
        style={[styles.input, styles.textArea]} 
        placeholder="Mô tả chi tiết chuyến đi..." 
        placeholderTextColor="#999"
        multiline
      />

      <Text style={styles.label}>Độ khó</Text>
      <View style={styles.row}>
        {['Dễ', 'Trung bình', 'Khó', 'Cực khó'].map(diff => (
          <TouchableOpacity key={diff} style={styles.chip}>
            <Text style={styles.chipText}>{diff}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 40 }]} onPress={() => setStep(3)}>
        <Text style={styles.primaryBtnText}>Tiếp theo: Điểm dừng →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Các Điểm Dừng</Text>
        
        <View style={styles.stopCard}>
          <View style={styles.stopHeader}>
            <View style={styles.pinSmall}><Text style={styles.pinSmallText}>1</Text></View>
            <Text style={styles.stopName}>Điểm Xuất Phát</Text>
          </View>
          <TextInput style={styles.stopInput} placeholder="Tên địa điểm..." />
        </View>

        <View style={styles.stopCard}>
          <View style={styles.stopHeader}>
            <View style={styles.pinSmall}><Text style={styles.pinSmallText}>2</Text></View>
            <Text style={styles.stopName}>Điểm Đích</Text>
          </View>
          <TextInput style={styles.stopInput} placeholder="Tên địa điểm..." />
        </View>

        <TouchableOpacity style={styles.addStopBtn}>
          <Text style={styles.addStopText}>+ Thêm điểm dừng tự do</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 40 }]} onPress={() => setStep(4)}>
          <Text style={styles.primaryBtnText}>Tiếp theo: Đăng tải →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Đăng tải lên Cộng Đồng</Text>
        
        <View style={styles.previewCard}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.previewCoverImg} />
          ) : (
            <View style={styles.previewCover} />
          )}
          <Text style={styles.previewTitle}>Tên tuyến đường</Text>
          <Text style={styles.previewDesc}>45 km • Trung bình</Text>
        </View>

        <Text style={styles.label}>Quyền riêng tư</Text>
        <View style={styles.row}>
          {['Công khai', 'Chỉ bạn bè', 'Chỉ mình tôi'].map(priv => (
            <TouchableOpacity key={priv} style={styles.chip}>
              <Text style={styles.chipText}>{priv}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#4CAF50', marginTop: 40 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Publish Tuyến Đường</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo Lộ Trình (Bước {step}/4)</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, justifyContent: 'center'
  },
  backIcon: { width: 24, height: 24 },
  headerTitle: {
    fontSize: 18, fontWeight: 'bold', color: colors.textPrimary
  },
  stepContainer: {
    flex: 1,
    position: 'relative'
  },
  scrollContent: {
    padding: 20,
  },
  mapBg: {
    position: 'absolute', width: '100%', height: '100%'
  },
  mapOverlay: {
    position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.2)'
  },
  instructionBanner: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFF', fontWeight: 'bold'
  },
  mapMarker: {
    position: 'absolute'
  },
  pin: {
    backgroundColor: colors.primary,
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF'
  },
  pinText: { color: '#FFF', fontWeight: 'bold' },
  fakePolyline: {
    position: 'absolute', top: '40%', left: '30%',
    width: 150, height: 100, borderTopWidth: 4, borderRightWidth: 4,
    borderColor: colors.primary,
    transform: [{ rotate: '15deg' }]
  },
  bottomPanel: {
    position: 'absolute', bottom: 0, width: '100%',
    backgroundColor: '#FFF', padding: 24,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, elevation: 10
  },
  totalKmText: {
    fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginBottom: 16, textAlign: 'center'
  },
  kmHighlight: { color: colors.primary, fontWeight: 'bold', fontSize: 24 },
  primaryBtn: {
    backgroundColor: colors.primary, height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center'
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  sectionTitle: {
    fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 20
  },
  input: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 16, height: 50, fontSize: 16, marginBottom: 20
  },
  uploadBox: {
    height: 140, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: colors.border,
    borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    marginBottom: 20, overflow: 'hidden'
  },
  uploadedImg: { width: '100%', height: '100%' },
  cameraIcon: { width: 32, height: 32, marginBottom: 8, opacity: 0.5 },
  uploadText: { color: colors.textSecondary },
  textArea: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  label: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  chip: {
    backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20
  },
  chipText: { color: colors.textPrimary, fontWeight: '500' },
  stopCard: {
    backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border
  },
  stopHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pinSmall: {
    backgroundColor: colors.primary, width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 10
  },
  pinSmallText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  stopName: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary },
  stopInput: {
    backgroundColor: '#F9F6F0', borderRadius: 8, paddingHorizontal: 12, height: 40
  },
  addStopBtn: {
    alignItems: 'center', paddingVertical: 16, borderWidth: 1, borderColor: colors.primary,
    borderStyle: 'dashed', borderRadius: 12, marginTop: 8
  },
  addStopText: { color: colors.primary, fontWeight: 'bold' },
  previewCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 30
  },
  previewCover: { width: '100%', height: 150, backgroundColor: '#E0E0E0' },
  previewCoverImg: { width: '100%', height: 150 },
  previewTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, padding: 16, paddingBottom: 4 },
  previewDesc: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 16, paddingBottom: 16 }
});

export default CreateRouteScreen;
