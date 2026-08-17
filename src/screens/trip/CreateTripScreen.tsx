import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Switch, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';

const CreateTripScreen = () => {
  const navigation = useNavigation<any>();
  const [vehicle, setVehicle] = useState('Xe máy');
  const [allowStrangers, setAllowStrangers] = useState(false);
  const [enableFund, setEnableFund] = useState(false);
  const [role, setRole] = useState('Xế 🏍️');

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Image source={{ uri: 'https://img.icons8.com/material-outlined/24/3E2723/back.png' }} style={styles.icon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thiết lập chuyến đi</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        
        {/* Route Summary Card */}
        <View style={styles.routeCard}>
          <Image source={{ uri: 'https://images.unsplash.com/photo-1627885444654-e67c87c4bfda?q=80&w=200&auto=format&fit=crop' }} style={styles.routeImage} />
          <View style={styles.routeInfo}>
            <Text style={styles.routeTitle}>Trảng Bom - Đà Lạt</Text>
            <Text style={styles.routeDesc}>300 KM • 5 Trạm nghỉ</Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương tiện di chuyển</Text>
          <View style={styles.vehicleContainer}>
            {['Xe đạp', 'Xe máy', 'Ô tô'].map((item) => (
              <TouchableOpacity 
                key={item} 
                style={[styles.vehicleBtn, vehicle === item && styles.vehicleBtnActive]}
                onPress={() => setVehicle(item)}
              >
                <Text style={[styles.vehicleText, vehicle === item && styles.vehicleTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian xuất phát dự kiến</Text>
          <TouchableOpacity style={styles.inputBox}>
            <Text style={styles.inputText}>05:00 Sáng - 24/12/2026</Text>
            <Image source={{ uri: 'https://img.icons8.com/material-outlined/20/795548/calendar.png' }} style={styles.inputIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giới hạn thành viên</Text>
          <TouchableOpacity style={styles.inputBox}>
            <Text style={styles.inputText}>Tối đa 15 người</Text>
            <Image source={{ uri: 'https://img.icons8.com/material-outlined/20/795548/conference.png' }} style={styles.inputIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vai trò của bạn</Text>
          <View style={styles.vehicleContainer}>
            {['Xế 🏍️', 'Ôm 🧑', 'Xe hơi 🚗'].map((item) => (
              <TouchableOpacity 
                key={item} 
                style={[styles.vehicleBtn, role === item && styles.vehicleBtnActive]}
                onPress={() => setRole(item)}
              >
                <Text style={[styles.vehicleText, role === item && styles.vehicleTextActive]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú cho thành viên</Text>
          <TextInput 
            style={styles.textArea} 
            placeholder="Nhớ mang áo mưa. Góp quỹ chung 500k/người. Xuất phát đúng 5h sáng." 
            placeholderTextColor="#A0938C"
            multiline
          />
        </View>

        <View style={styles.switchSection}>
          <View>
            <Text style={styles.sectionTitle}>Quỹ chung</Text>
            <Text style={styles.switchDesc}>Mọi người cùng đóng góp tiền ăn ở</Text>
          </View>
          <Switch 
            value={enableFund} 
            onValueChange={setEnableFund}
            trackColor={{ false: '#D7CCC8', true: colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </View>

        {enableFund && (
          <View style={[styles.section, { marginTop: 16 }]}>
            <TextInput style={styles.fundInput} placeholder="Nhập số tiền quỹ/người (VD: 500,000)" keyboardType="numeric" />
          </View>
        )}

        <View style={styles.switchSection}>
          <View>
            <Text style={styles.sectionTitle}>Cho phép người lạ tham gia</Text>
            <Text style={styles.switchDesc}>Mở công khai trên Cộng đồng</Text>
          </View>
          <Switch 
            value={allowStrangers} 
            onValueChange={setAllowStrangers}
            trackColor={{ false: '#D7CCC8', true: colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('TeamRoster')} // Giả lập bấm là chuyển sang trang Roster luôn (có thể thêm Popup sau)
        >
          <Text style={styles.primaryButtonText}>Tạo Chuyến Đi & Lấy Mã</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  icon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  container: {
    padding: 20,
  },
  routeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  routeImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  routeInfo: {
    flex: 1,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  routeDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  vehicleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vehicleBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  vehicleText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  vehicleTextActive: {
    color: '#FFFFFF',
  },
  inputBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  inputIcon: {
    width: 20,
    height: 20,
    opacity: 0.6,
  },
  switchSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  switchDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    color: colors.textPrimary,
  },
  fundInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    fontSize: 15,
    color: colors.textPrimary,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default CreateTripScreen;
