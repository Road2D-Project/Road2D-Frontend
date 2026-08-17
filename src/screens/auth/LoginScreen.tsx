import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';

const LoginScreen = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background Image */}
      <ImageBackground
        source={require('../../assets/images/LoginBackground.png')}
        style={styles.background}
      >
        <View style={styles.overlay} />
      </ImageBackground>

      <View style={styles.content}>
        <View style={styles.headerContainer}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/logoapp.png')}
              style={styles.logoImage}
            />
          </View>

          <Text style={styles.title}>Road2D</Text>
          <Text style={styles.subtitle}>"Cùng nhau trên mọi chặng đường" </Text>
        </View>

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('Home')}
          >
            <View style={styles.iconContainer}>
              <FontAwesome name="mobile-phone" size={26} color="#FFF" />
            </View>
            <Text style={styles.buttonText}>Tiếp tục với Số điện thoại</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonOutline]}
            onPress={() => navigation.navigate('Home')}
          >
            <View style={styles.iconContainer}>
              <Image
                source={{ uri: 'https://img.icons8.com/color/48/000000/google-logo.png' }}
                style={{ width: 24, height: 24 }}
              />
            </View>
            <Text style={styles.buttonText}>Tiếp tục với Google</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            Bằng cách tiếp tục, bạn đồng ý với <Text style={styles.linkText}>Điều khoản Sử dụng</Text>
            {'\n'}và <Text style={styles.linkText}>Chính sách Quyền riêng tư</Text> của chúng tôi
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E140F',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', // Tối màu nền 1 chút để nổi chữ
    justifyContent: 'flex-end',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 25,
    // Đổ bóng cam nâu
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  title: {
    fontSize: 40,
    color: colors.textLight,
    marginBottom: 8,
    marginTop: -48,
    fontFamily: 'UTM Facebook', // Font này sẽ tự nhận nếu bạn cài đặt file ttf
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    marginTop: -7,
    paddingHorizontal: 4, // Fix lỗi bị cắt mất dấu ngoặc kép khi in nghiêng
  },
  bottomContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.authButtonBg,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  termsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
