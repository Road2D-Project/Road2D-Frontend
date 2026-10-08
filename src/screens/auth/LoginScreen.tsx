/**
 * LoginScreen.tsx
 *
 * Flow đăng nhập:
 *
 * [landing] — 2 nút: "Số điện thoại" và "Google (disabled)"
 *      │
 *      ├── [phone-input]  → nhập SĐT → checkPhone()
 *      │       │
 *      │       ├── registered=true  → [phone-password] → loginByPhone() → Home
 *      │       │         └── "Quên mật khẩu" link
 *      │       │
 *      │       └── registered=false → sendOtp() → [otp-verify] → verifyOtp() →
 *      │                              [register] → registerByPhone() → Home
 *      │
 *      └── [login-form]  → nhập username + password → login() → Home
 */

import { FontAwesome, AntDesign, Ionicons } from '@expo/vector-icons';
import React, { useState, useRef } from 'react';
import {
  Image,
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import authService from '../../services/api/authService';
import tokenStorage from '../../services/storage/tokenStorage';
import { useAuthStore } from '../../store/useAuthStore';
import { MOCK_CURRENT_USER } from '../../mocks/mockData';
import type { LoginScreenNavigationProp } from '../../types/navigation';

type ScreenMode =
  | 'landing'
  | 'login-form'
  | 'phone-input'
  | 'phone-password'
  | 'otp-verify'
  | 'register';

const GoogleGLogo = () => (
  <AntDesign name="google" size={20} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
);

const LoginScreen = ({ navigation }: { navigation: LoginScreenNavigationProp }) => {
  const [mode, setMode] = useState<ScreenMode>('landing');
  const [isLoading, setIsLoading] = useState(false);

  // Username/password form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  // Phone flow
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [phonePasswordError, setPhonePasswordError] = useState('');

  // OTP flow
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Register flow
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regError, setRegError] = useState('');

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const saveAndNavigate = async (accessToken: string, refreshToken: string) => {
    await tokenStorage.saveTokens(accessToken, refreshToken);
    // TODO BACKEND: thay MOCK_CURRENT_USER bằng `await authService.getMe()` map sang User
    useAuthStore.getState().login({
      ...MOCK_CURRENT_USER,
      phone: phone.replace(/\s/g, '') || MOCK_CURRENT_USER.phone,
    });
    // AuthGuard trong AppNavigator sẽ tự động đổi sang màn Home khi isAuthenticated = true
  };

  const startCountdown = (seconds = 60) => {
    setOtpCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const extractErrorMessage = (err: any, fallback: string): string => {
    return (
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      fallback
    );
  };

  const handleNetworkError = (err: any, fallback: string) => {
    if (!err?.response) {
      Alert.alert(
        'Không kết nối được server',
        'Backend chưa chạy. Bạn có muốn vào Home để xem UI không?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Vào xem UI', onPress: () => navigation.navigate('Home') },
        ],
      );
      return true;
    }
    return false;
  };

  // ─── Username / Password login ─────────────────────────────────────────────

  const handleLogin = async () => {
    if (!username.trim()) { setFormError('Vui lòng nhập tên đăng nhập'); return; }
    if (!password.trim()) { setFormError('Vui lòng nhập mật khẩu'); return; }

    setIsLoading(true);
    setFormError('');
    try {
      const res = await authService.login({ username: username.trim(), password });
      await saveAndNavigate(res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      if (handleNetworkError(err, '')) return;
      if (err?.response?.status === 400) {
        setFormError('Tên đăng nhập hoặc mật khẩu không đúng.');
      } else {
        setFormError(extractErrorMessage(err, 'Đăng nhập thất bại. Vui lòng thử lại.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Phone: check registration ─────────────────────────────────────────────

  const handleCheckPhone = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^0\d{9}$/.test(cleaned)) {
      setPhoneError('Số điện thoại không hợp lệ (10 chữ số, bắt đầu bằng 0)');
      return;
    }

    setIsLoading(true);
    setPhoneError('');
    try {
      const { registered } = await authService.checkPhone(cleaned);
      if (registered) {
        setMode('phone-password');
      } else {
        await authService.sendOtp(cleaned);
        startCountdown();
        setMode('otp-verify');
      }
    } catch (err: any) {
      if (handleNetworkError(err, '')) return;
      setPhoneError(extractErrorMessage(err, 'Không thể kiểm tra số điện thoại. Thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Phone: login with password ────────────────────────────────────────────

  const handlePhonePasswordLogin = async () => {
    if (!phonePassword.trim()) { setPhonePasswordError('Vui lòng nhập mật khẩu'); return; }

    setIsLoading(true);
    setPhonePasswordError('');
    try {
      const res = await authService.loginByPhone(phone.replace(/\s/g, ''), phonePassword);
      await saveAndNavigate(res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      if (handleNetworkError(err, '')) return;
      if (err?.response?.status === 400) {
        setPhonePasswordError('Mật khẩu không đúng.');
      } else {
        setPhonePasswordError(extractErrorMessage(err, 'Đăng nhập thất bại.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP: resend ───────────────────────────────────────────────────────────

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setIsLoading(true);
    try {
      await authService.sendOtp(phone.replace(/\s/g, ''));
      startCountdown();
    } catch {
      Alert.alert('Lỗi', 'Không thể gửi lại OTP. Thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP: verify ───────────────────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setOtpError('Vui lòng nhập đủ 6 số'); return; }

    setIsLoading(true);
    setOtpError('');
    try {
      // For new users: verify OTP then go to register screen
      await authService.verifyOtpAndLogin(phone.replace(/\s/g, ''), otp);
      setMode('register');
    } catch (err: any) {
      if (handleNetworkError(err, '')) return;
      setOtpError(extractErrorMessage(err, 'Mã OTP không đúng. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Register: create account ──────────────────────────────────────────────

  const handleRegister = async () => {
    if (regPassword.length < 6) { setRegError('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    if (regPassword !== regConfirm) { setRegError('Mật khẩu nhập lại không khớp'); return; }

    setIsLoading(true);
    setRegError('');
    try {
      const res = await authService.registerByPhone({
        phone: phone.replace(/\s/g, ''),
        otp,
        password: regPassword,
        confirm_password: regConfirm,
      });
      await saveAndNavigate(res.data.access_token, res.data.refresh_token);
    } catch (err: any) {
      if (handleNetworkError(err, '')) return;
      setRegError(extractErrorMessage(err, 'Đăng ký thất bại. Vui lòng thử lại.'));
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Shared sub-components ─────────────────────────────────────────────────

  const BackButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity style={styles.backButton} onPress={onPress}>
      <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );

  const SmallLogo = ({ subtitle }: { subtitle: string }) => (
    <View style={styles.formLogoContainer}>
      <Image
        source={require('../../assets/images/logoapp.png')}
        style={styles.formLogoImage}
      />
      <Text style={styles.formTitle}>Road2D</Text>
      <Text style={styles.formSubtitle}>{subtitle}</Text>
    </View>
  );

  const Background = () => (
    <ImageBackground
      source={require('../../assets/images/LoginBackground.png')}
      style={styles.background}
    >
      <View style={styles.overlay} />
    </ImageBackground>
  );

  // ─── LANDING ───────────────────────────────────────────────────────────────
  if (mode === 'landing') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Background />

        <View style={styles.content}>
          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/images/logoapp.png')}
                style={styles.logoImage}
              />
            </View>
            <Text style={styles.title}>Road2D</Text>
            <Text style={styles.subtitle}>"Cùng nhau trên mọi chặng đường"</Text>
          </View>

          <View style={styles.bottomContainer}>
            <Button
              title="Tiếp tục với Số điện thoại"
              size="lg"
              style={{ backgroundColor: colors.authButtonBg }}
              leftIcon={<FontAwesome name="mobile-phone" size={26} color="#FFF" />}
              onPress={() => { setMode('phone-input'); setPhone(''); setPhoneError(''); }}
            />

            {/* Google — chưa implement, hiển thị mờ + disabled */}
            <Button
              title="Tiếp tục với Google"
              variant="outline"
              size="lg"
              style={styles.buttonOutlineDisabled}
              textStyle={{ color: 'rgba(255,255,255,0.4)' }}
              leftIcon={<GoogleGLogo />}
              disabled
            />

            <TouchableOpacity onPress={() => { setMode('login-form'); setUsername(''); setPassword(''); setFormError(''); }}>
              <Text style={styles.loginTextLink}>Đăng nhập bằng tên người dùng</Text>
            </TouchableOpacity>

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
  }

  // ─── USERNAME / PASSWORD FORM ───────────────────────────────────────────────
  if (mode === 'login-form') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Background />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BackButton onPress={() => setMode('landing')} />
            <SmallLogo subtitle="Đăng nhập tài khoản" />

            <View style={styles.formContainer}>
              <Input
                label="Tên đăng nhập"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChangeText={(t) => { setUsername(t); setFormError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={styles.inputDark}
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Input
                label="Mật khẩu"
                placeholder="Nhập mật khẩu"
                value={password}
                onChangeText={(t) => { setPassword(t); setFormError(''); }}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                error={formError}
                style={styles.inputDark}
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Button
                title="Đăng nhập"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                onPress={handleLogin}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── PHONE INPUT ───────────────────────────────────────────────────────────
  if (mode === 'phone-input') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Background />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BackButton onPress={() => setMode('landing')} />
            <SmallLogo subtitle="Nhập số điện thoại của bạn" />

            <View style={styles.formContainer}>
              <Input
                label="Số điện thoại"
                placeholder="0xxxxxxxxx"
                value={phone}
                onChangeText={(t) => { setPhone(t); setPhoneError(''); }}
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={handleCheckPhone}
                error={phoneError}
                style={styles.inputDark}
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Button
                title="Tiếp tục"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                onPress={handleCheckPhone}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── PHONE PASSWORD (registered user) ──────────────────────────────────────
  if (mode === 'phone-password') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Background />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BackButton onPress={() => setMode('phone-input')} />
            <SmallLogo subtitle={`Đăng nhập với ${phone}`} />

            <View style={styles.formContainer}>
              <Input
                label="Mật khẩu"
                placeholder="Nhập mật khẩu"
                value={phonePassword}
                onChangeText={(t) => { setPhonePassword(t); setPhonePasswordError(''); }}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handlePhonePasswordLogin}
                error={phonePasswordError}
                style={styles.inputDark}
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Button
                title="Đăng nhập"
                size="lg"
                loading={isLoading}
                disabled={isLoading}
                onPress={handlePhonePasswordLogin}
              />
              <TouchableOpacity
                style={styles.forgotPasswordButton}
                onPress={() => Alert.alert('Quên mật khẩu', 'Tính năng đang phát triển.')}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── OTP VERIFY (new user) ─────────────────────────────────────────────────
  if (mode === 'otp-verify') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Background />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BackButton onPress={() => setMode('phone-input')} />
            <SmallLogo subtitle={`Nhập mã OTP gửi đến ${phone}`} />

            <View style={styles.formContainer}>
              <Input
                label="Mã OTP (6 số)"
                placeholder="______"
                value={otp}
                onChangeText={(t) => { setOtp(t.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                keyboardType="number-pad"
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
                error={otpError}
                maxLength={6}
                style={[styles.inputDark, styles.otpInput]}
                placeholderTextColor="rgba(255,255,255,0.35)"
              />
              <Button
                title="Xác nhận"
                size="lg"
                loading={isLoading}
                disabled={isLoading || otp.length !== 6}
                onPress={handleVerifyOtp}
              />
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={otpCountdown > 0}
              >
                <Text style={[styles.resendText, otpCountdown > 0 && styles.resendTextDisabled]}>
                  {otpCountdown > 0 ? `Gửi lại sau ${otpCountdown}s` : 'Gửi lại mã OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── REGISTER (set password after OTP) ────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Background />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackButton onPress={() => setMode('otp-verify')} />
          <SmallLogo subtitle="Tạo mật khẩu cho tài khoản mới" />

          <View style={styles.formContainer}>
            <Input
              label="Mật khẩu"
              placeholder="Tối thiểu 6 ký tự"
              value={regPassword}
              onChangeText={(t) => { setRegPassword(t); setRegError(''); }}
              secureTextEntry
              returnKeyType="next"
              style={styles.inputDark}
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            <Input
              label="Nhập lại mật khẩu"
              placeholder="Nhập lại mật khẩu"
              value={regConfirm}
              onChangeText={(t) => { setRegConfirm(t); setRegError(''); }}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              error={regError}
              style={styles.inputDark}
              placeholderTextColor="rgba(255,255,255,0.35)"
            />
            <Button
              title="Tạo tài khoản"
              size="lg"
              loading={isLoading}
              disabled={isLoading}
              onPress={handleRegister}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  // ── Landing ──
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
  buttonOutlineDisabled: {
    borderColor: 'rgba(255,255,255,0.15)',
    opacity: 0.6,
  },
  loginTextLink: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  termsText: {
    marginTop: 8,
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

  // ── Forms (shared) ──
  formScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  formLogoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formLogoImage: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
  },
  formTitle: {
    fontSize: 24,
    fontFamily: 'UTM Facebook',
    color: '#FFFFFF',
    marginTop: 8,
  },
  formSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  formContainer: {
    gap: 4,
  },
  // Override Input component styles for dark background
  inputDark: {
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // ── Phone password ──
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },

  // ── OTP ──
  otpInput: {
    textAlign: 'center',
    fontSize: 24,
    letterSpacing: 8,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'none',
  },
});

export default LoginScreen;
