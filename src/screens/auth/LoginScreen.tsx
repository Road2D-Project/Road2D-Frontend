import { FontAwesome, AntDesign } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { Button } from '../../components/ui/Button';

/**
 * Google G logo — Sử dụng AntDesign từ @expo/vector-icons
 * (Icon đơn sắc trắng chuẩn, đảm bảo 100% hiển thị không phụ thuộc mạng)
 */
const GoogleGLogo = () => (
  <AntDesign name="google" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
);


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

          {/* Dùng Text trực tiếp để font UTM Facebook apply chắc chắn */}
          <Text style={styles.title}>Road2D</Text>
          <Text style={styles.subtitle}>"Cùng nhau trên mọi chặng đường"</Text>
        </View>

        <View style={styles.bottomContainer}>
          <Button
            title="Tiếp tục với Số điện thoại"
            size="lg"
            style={{ backgroundColor: colors.authButtonBg }}
            leftIcon={<FontAwesome name="mobile-phone" size={26} color="#FFF" />}
            onPress={() => navigation.navigate('Home')}
          />

          {/* Google button: text trắng, logo G 5 màu */}
          <Button
            title="Tiếp tục với Google"
            variant="outline"
            size="lg"
            style={styles.buttonOutline}
            textStyle={{ color: '#FFFFFF' }}
            leftIcon={<GoogleGLogo />}
            onPress={() => navigation.navigate('Home')}
          />

          {/* Terms — màu nâu vàng sáng, dễ đọc */}
          <Text style={styles.termsText}>
            {'Bằng cách tiếp tục, bạn đồng ý với '}
            <Text style={styles.linkText}>Điều khoản Sử dụng</Text>
            {' và '}
            <Text style={styles.linkText}>Chính sách Quyền riêng tư</Text>
            {' của chúng tôi'}
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    marginTop: 30,
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
    fontSize: 38,
    // KHÔNG dùng fontWeight khi đã dùng custom font:
    // fontWeight:'bold' sẽ fallback về system font vì không có file UTM Facebook Bold.ttf
    fontFamily: 'UTM Facebook',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: -55,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.85)',
    marginTop: -4,
    textAlign: 'center',
  },
  bottomContainer: {
    width: '100%',
    gap: 16,
  },
  buttonOutline: {
    borderColor: 'rgba(255,255,255,0.35)',
  },
  termsText: {
    marginTop: 16,
    lineHeight: 22,
    color: '#D4A96A',
    fontSize: 13,
    textAlign: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
    color: '#F0C88A',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default LoginScreen;
