# 🗺️ R2D — Lộ Trình 47 Ngày Code Frontend App

> **Stack hiện tại:** Expo ~54 · React Native 0.81 · TypeScript · React Navigation v7 · react-native-maps 1.20 · react-native-reanimated ~4.1.1 · @expo/vector-icons ^15.1.1
>
> **Trạng thái trước ngày 1 (thực tế):**
> | Hạng mục | Trạng thái | Ghi chú |
> |----------|-----------|---------|
> | Navigation stack + tabs | ✅ Có | AppNavigator + TabNavigator |
> | UI mockup 12 screens | ✅ Có | Đẹp nhưng hardcode data |
> | Theme colors + typography | ✅ Có | `colors.ts`, `typography.ts` |
> | axios install | ❌ BUG | Dùng nhưng không có trong package.json |
> | TextInput import CreateTripScreen | ❌ BUG | Crash khi mở màn hình |
> | Tab icons | ❌ BUG | Load từ icons8.com — offline = no icons |
> | 33 icon URLs rải rác | ❌ BUG | img.icons8.com khắp nơi |
> | expo-router + React Navigation | ❌ CONFLICT | Cả hai cùng tồn tại |
> | EXPO_PUBLIC_ prefix cho env vars | ❌ BUG | `api/index.ts` dùng sai prefix |
> | Splash screen color | ❌ WRONG | `#208AEF` xanh dương ≠ R2D brown |
> | App name/slug | ❌ WRONG | `"mobile-preview"` thay vì `"Road2D"` |
> | State management | ❌ Chưa có | store/slices/ trống rỗng |
> | Real maps | ❌ Chưa có | Dùng ảnh giả |
> | Auth thực | ❌ Chưa có | Chỉ navigate thẳng |
> | API service layer | ❌ Skeleton | index.ts có nhưng trống |
> | TypeScript types đầy đủ | ❌ Thiếu | Chỉ có User + ApiResponse |
> | Reusable components | ❌ Chưa có | common/ và ui/ trống rỗng |

---

## 📐 Tổng Quan 47 Ngày

| Giai đoạn | Ngày | Chủ đề | Mới? |
|-----------|------|--------|------|
| **Phase 0** | 1–4 | 🔧 Dọn Dẹp, Bug Fixes & Kiến Trúc | ✨ Mới |
| **Phase 1** | 5–9 | 🏗️ Nền Tảng Kỹ Thuật | Cập nhật |
| **Phase 2** | 10–16 | 🎨 Auth + Home + Component Library | Cập nhật |
| **Phase 3** | 17–25 | 🗺️ Maps Thực + Trip Flow + Safety Prototype | ✨ +1 ngày |
| **Phase 4** | 26–33 | 💬 Social, Community & Chat | Cập nhật |
| **Phase 5** | 34–40 | 🛡️ Safety Layer Đầy Đủ | Cập nhật |
| **Phase 6** | 41–47 | ✨ Polish, Real API, Deploy & Demo | ✨ +2 ngày |

---

## 🔧 PHASE 0 — Dọn Dẹp, Bug Fixes & Kiến Trúc (Ngày 1–4)

> **Tại sao Phase 0 quan trọng:** Codebase hiện tại có ít nhất 6 bugs sẽ gây crash hoặc UX tệ ngay khi demo. Không fix trước → mọi thứ build trên nền không vững.

---

### Ngày 1 — Architecture Decision + Critical Crash Fixes

**Mục tiêu:** Giải quyết các conflict kiến trúc và fix bugs gây crash trước khi làm bất cứ thứ gì.

**Cần làm:**

**🔴 Fix ngay — Bug gây crash:**
- [ ] Fix `CreateTripScreen.tsx`: thêm `TextInput` vào dòng import từ `'react-native'`
  ```tsx
  // TRƯỚC (line 2 — thiếu TextInput)
  import { View, Text, StyleSheet, ..., Switch, Platform, StatusBar } from 'react-native';
  // SAU
  import { View, Text, StyleSheet, ..., Switch, TextInput, Platform, StatusBar } from 'react-native';
  ```
- [ ] `npm install axios` — đang được import trong `src/services/api/index.ts` nhưng không có trong `package.json`

**🟡 Quyết định kiến trúc — Expo Router vs React Navigation:**
- [ ] Hiện tại: `app.json` có `"expo-router"` plugin, `package.json` có `expo-router ~6.0.24`, **nhưng** app dùng `App.js` → `AppNavigator` (React Navigation). Hai hệ thống conflict nhau.
- [ ] **Lựa chọn đơn giản nhất (khuyến nghị):** Giữ React Navigation, xóa expo-router:
  - Xóa `"expo-router"` khỏi `plugins` trong `app.json`
  - Xóa `"experiments": { "typedRoutes": true }` khỏi `app.json`
  - Kiểm tra và backup nội dung `app/index.tsx` nếu có code quan trọng
- [ ] Tạo `ARCHITECTURE.md` ở root: ghi lại quyết định này + lý do

**🟡 Quyết định Expo version:**
- [ ] Check `expo: ~54.0.0` trong package.json
- [ ] `AGENTS.md` yêu cầu đọc docs v57 — phải quyết định: upgrade lên 57 hay đọc docs đúng version 54?
- [ ] **Khuyến nghị:** Giữ v54 (ít rủi ro breaking change), đọc docs tại `https://docs.expo.dev/versions/v54.0.0/`
- [ ] Ghi quyết định vào `ARCHITECTURE.md`

**Kiến thức cần học:**
- Expo Router (file-based) vs React Navigation (code-based): khác biệt về routing paradigm
- Tại sao hai navigation systems không thể coexist: cả hai đăng ký root navigator, conflict nhau
- `expo-doctor`: `npx expo-doctor` để scan toàn bộ issues hiện tại

**Check sau ngày 1:**
- `npx expo start` không warning về navigation conflict
- Mở `CreateTripScreen` → không crash vì thiếu TextInput
- `ARCHITECTURE.md` tồn tại với các quyết định rõ ràng

---

### Ngày 2 — Icon System: Xóa Toàn Bộ icons8.com (33 Instances)

**Mục tiêu:** Thay tất cả 33 icon URLs từ `img.icons8.com` bằng `@expo/vector-icons` (đã có sẵn trong `package.json: ^15.1.1`). Offline → icons biến mất là bug nghiêm trọng.

**Tại sao quan trọng:** Mỗi icon = 1 network request. Tab bar có 5 icons = 10 requests (active + inactive state) mỗi lần render. Không có internet → tab bar trắng tinh.

**Map icon replacements theo file:**

```
TabNavigator.tsx (5 tab icons):
  home        → <Ionicons name="home" />         / <Ionicons name="home-outline" />
  map         → <Ionicons name="map" />           / <Ionicons name="map-outline" />
  conference  → <Ionicons name="people" />        / <Ionicons name="people-outline" />
  speech-bubble → <Ionicons name="chatbubbles" /> / <Ionicons name="chatbubbles-outline" />
  user        → <Ionicons name="person" />        / <Ionicons name="person-outline" />

TripDetailsScreen.tsx:
  back        → <Ionicons name="arrow-back" size={20} color="#FFF" />
  weather icons → <Ionicons name="partly-sunny" /> / <Ionicons name="sunny" />

TeamRosterScreen.tsx:
  back        → <Ionicons name="arrow-back" />
  share       → <Ionicons name="share-social" />
  checkmark   → <Ionicons name="checkmark" />
  speech-bubble → <Ionicons name="chatbubble" />

CreateTripScreen.tsx:
  back        → <Ionicons name="arrow-back" />
  calendar    → <Ionicons name="calendar-outline" />
  conference  → <Ionicons name="people-outline" />

CreateRouteScreen.tsx:
  camera      → <Ionicons name="camera-outline" size={32} />
  back        → <Ionicons name="arrow-back" />

ProfileScreen.tsx:
  settings    → <Ionicons name="settings-outline" />
  bookmark    → <Ionicons name="bookmark-outline" />
  forward     → <Ionicons name="chevron-forward" />
  shield      → <Ionicons name="shield-outline" />
  exit        → <Ionicons name="log-out-outline" color="#FF5252" />

LiveTrackingScreen.tsx:
  sos icon    → <Text style={{ color: '#FFF', fontWeight: 'bold' }}>SOS</Text>
  list/map toggle → <Ionicons name="list" /> / <Ionicons name="map-outline" />

ExploreMapScreen.tsx:
  search      → <Ionicons name="search" size={20} color="#FF9800" />

CommunityScreen.tsx:
  plus-math   → <Ionicons name="add" size={24} color="#FFF" />
  facebook-like → <AntDesign name="like2" /> / <AntDesign name="like1" />
  speech-bubble → <Ionicons name="chatbubble-outline" />
  share       → <Ionicons name="share-social-outline" />

ChatScreen.tsx:
  map-marker  → <Ionicons name="location-outline" />
  poll-topic  → <Ionicons name="stats-chart-outline" />
  search      → <Ionicons name="search-outline" />

LoginScreen.tsx:
  google-logo → Giữ <Image uri> hoặc dùng SVG Google logo riêng (không có trong Ionicons)
```

**Cần làm:**
- [ ] Update `TabNavigator.tsx`: xóa toàn bộ `iconUrl` logic, thay bằng `@expo/vector-icons`
- [ ] Update từng file screen theo map ở trên
- [ ] Run `grep -r "img.icons8.com" src/` → verify output empty

**Kiến thức cần học:**
- `@expo/vector-icons` gồm: `Ionicons`, `MaterialCommunityIcons`, `Feather`, `FontAwesome`, `AntDesign`, `MaterialIcons` — đều bundled, zero network
- Tại sao icon fonts tốt hơn URL images: bundle một lần khi build, cached, offline-ready, scalable (vector)
- `focused` state trong tab bar: dùng `name="home"` khi focused, `name="home-outline"` khi không focused

**Check sau ngày 2:**
- Bật airplane mode → tab bar vẫn hiện đầy đủ 5 icons với đúng active/inactive state
- `grep -r "icons8.com" src/` → 0 results

---

### Ngày 3 — Environment, Config Cleanup & EXPO_PUBLIC_ Fix

**Mục tiêu:** Fix các config sai, brand identity, và environment variable prefix.

**Cần làm:**

**🔴 Fix `src/services/api/index.ts`:**
```ts
// TRƯỚC — Expo không expose biến này (thiếu EXPO_PUBLIC_ prefix)
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';

// SAU — Expo chỉ expose biến có prefix EXPO_PUBLIC_
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1';
```

**🟡 Fix `app.json` — Brand Identity:**
```json
// TRƯỚC
"name": "mobile-preview",
"slug": "mobile-preview",
"splash": { "backgroundColor": "#208AEF" }  // Xanh dương ≠ R2D

// SAU
"name": "Road2D",
"slug": "road2d",
"splash": { "backgroundColor": "#3E2723" }  // R2D brown
```

**🟡 Update `.env.local`:**
```
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
EXPO_PUBLIC_ENV=development
```

**🟡 Verify font file:**
- [ ] Kiểm tra `src/assets/fonts/UTM Facebook.ttf` thực sự tồn tại
- [ ] Nếu không có: đặt fallback trong `App.js` — `if (error) { SplashScreen.hideAsync(); }` đã có, nhưng font sẽ không load → `LoginScreen` title sẽ dùng system default font

**🟡 `app.config.js` — thêm iOS config:**
```js
// Thêm iOS section để symmetric với Android
ios: {
  bundleIdentifier: 'com.road2d.app',
  config: {
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
},
```

**Kiến thức cần học:**
- `EXPO_PUBLIC_` prefix: Expo Metro bundler chỉ inline biến có prefix này vào bundle — biến không có prefix sẽ là `undefined` ở runtime
- Tại sao `process.env` hoạt động khác trong React Native vs Node.js: không có `dotenv`, Expo inject tại build time
- `expo-doctor` chạy check gì: verify SDK compatibility, plugin configs, native dependencies

**Check sau ngày 3:**
- Splash screen màu nâu `#3E2723` khi launch
- App name hiện "Road2D" trong app switcher
- `process.env.EXPO_PUBLIC_API_URL` trả về đúng giá trị khi log

---

### Ngày 4 — Code Quality Baseline: ESLint, Prettier, Path Aliases, TS Strict

**Mục tiêu:** Setup tooling quality trước khi code thêm — ngăn bug mới, code clean hơn, import ngắn hơn.

**Cần làm:**

**ESLint + Prettier:**
- [ ] `npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-react eslint-plugin-react-native prettier eslint-config-prettier`
- [ ] Tạo `.eslintrc.js` với rules: `no-any` warning, `no-unused-vars`, `react-hooks/rules-of-hooks`
- [ ] Tạo `.prettierrc`: `{ "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`
- [ ] Thêm scripts vào `package.json`: `"lint": "eslint src/**/*.tsx src/**/*.ts"`, `"format": "prettier --write src/"`

**TypeScript Path Aliases:**
- [ ] Update `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@screens/*": ["src/screens/*"],
        "@components/*": ["src/components/*"],
        "@services/*": ["src/services/*"],
        "@store/*": ["src/store/*"],
        "@theme/*": ["src/theme/*"],
        "@utils/*": ["src/utils/*"],
        "@types/*": ["src/types/*"],
        "@hooks/*": ["src/hooks/*"]
      }
    }
  }
  ```
- [ ] `npm install --save-dev babel-plugin-module-resolver`, update `babel.config.js`
- [ ] Test: `import { colors } from '@theme/colors'` thay vì `'../../theme/colors'`

**TypeScript strict mode (tăng dần):**
- [ ] Thêm `"strict": false, "noImplicitAny": true` trước (không bật strict toàn bộ ngay — sẽ có 100+ errors)
- [ ] Fix tất cả `navigation: any` → `navigation: NativeStackNavigationProp<any>` tạm (sẽ fix proper ở ngày 8)

**Kiến thức cần học:**
- Path aliases trong React Native: cần cả tsconfig.json (TypeScript) + babel.config.js (Metro bundler) — thiếu một cái sẽ không chạy được
- ESLint rules quan trọng nhất cho React Native: `react-hooks/exhaustive-deps`, `no-shadow`, `prefer-const`
- `noImplicitAny` vs `strict`: `strict` bật 6 checks cùng lúc — bật dần dần tránh overwhelm

**Check sau ngày 4:**
- `npm run lint` chạy không có errors (warnings OK)
- Import dùng path aliases: `import { colors } from '@theme/colors'` hoạt động
- `npx expo start` vẫn chạy bình thường sau tất cả thay đổi

---

## 🏗️ PHASE 1 — Nền Tảng Kỹ Thuật (Ngày 5–9)

### Ngày 5 — TypeScript Types + Domain Model

**Mục tiêu:** Định nghĩa toàn bộ domain model của R2D bằng TypeScript — làm nền cho mọi thứ.

**Cần làm:**
- [ ] Mở rộng `src/types/index.ts`: giữ `User`, `ApiResponse`, `PaginatedResponse`
- [ ] Tạo `src/types/trip.ts`: `Trip`, `TripMember`, `TripRole` (`LEADER | RIDER | PILLION | CAR`), `TripStatus` (`PLANNING | ACTIVE | COMPLETED | CANCELLED`)
- [ ] Tạo `src/types/route.ts`: `Route`, `RouteSegment`, `Waypoint`, `Stopover`, `DifficultyLevel` (`EASY | MEDIUM | HARD | EXTREME`)
- [ ] Tạo `src/types/social.ts`: `Post`, `Moment`, `Comment`, `Like`, `GhepDoanListing`
- [ ] Tạo `src/types/safety.ts`: `DangerZone`, `CoverageZone`, `ZoneType`, `RiskLevel` (`LOW | MEDIUM | HIGH | CRITICAL`), `GroupStatus`, `MemberStatus`
- [ ] Tạo `src/types/navigation.ts`: `RootStackParamList`, `TabParamList` — map tất cả screens

**Kiến thức cần học:**
- TypeScript Discriminated Unions: `type ZoneType = { type: 'COVERAGE'; signal: number } | { type: 'DANGER'; reason: string }` — exhaustive type checking
- `Partial<T>`, `Required<T>`, `Pick<T,K>`, `Omit<T,K>`: sẽ dùng nhiều khi làm form types
- Generic React Native navigation types: `NativeStackNavigationProp<RootStackParamList, 'ScreenName'>`

**Check sau ngày 5:**
- `tsc --noEmit` → 0 errors (chỉ với các types mới)
- Các files types có thể import được: `import type { Trip } from '@types/trip'`

---

### Ngày 6 — State Management: Zustand Setup

**Mục tiêu:** Setup Zustand — nhẹ hơn Redux, không boilerplate, phù hợp Expo.

**Cần làm:**
- [ ] `npm install zustand`
- [ ] Xóa `src/store/slices/` folder trống (Redux remnant, không dùng nữa)
- [ ] Tạo `src/store/useAuthStore.ts`: `{ user: User | null, token, isAuthenticated, login(), logout() }`
- [ ] Tạo `src/store/useTripStore.ts`: `{ currentTrip, upcomingTrips, activeTrip, setCurrentTrip(), addTrip() }`
- [ ] Tạo `src/store/useMapStore.ts`: `{ region, selectedRoute, selectedMarker, setRegion() }`
- [ ] Tạo `src/store/useSafetyStore.ts`: `{ dangerZones, coverageZones, groupStatuses, riskLevel }`
- [ ] Update `HomeScreen.tsx`: thay `UPCOMING_TRIPS` hardcode bằng `useTripStore().upcomingTrips`

**Kiến thức cần học:**
- Zustand vs Redux Toolkit: Zustand không cần reducers/actions boilerplate — `set()` trực tiếp vào state
- Zustand `persist` middleware với `AsyncStorage`: `create(persist(() => ({...}), { storage: createJSONStorage(() => AsyncStorage) }))`
- Phân biệt **server state** (data từ API) vs **client state** (UI state): Zustand cho client state, React Query/SWR cho server state

**Check sau ngày 6:**
- `useAuthStore.getState().isAuthenticated` đọc được từ bất kỳ component nào
- `useTripStore` cung cấp data cho HomeScreen

---

### Ngày 7 — Service Layer: Mock API Hoàn Chỉnh

**Mục tiêu:** Tạo abstraction layer hoàn chỉnh — UI không bao giờ gọi `axios` trực tiếp.

**Cần làm:**
- [ ] Update `src/services/api/index.ts`: thêm auth interceptor (đọc token từ store), error handling interceptor (401 → logout)
- [ ] Tạo `src/services/api/tripService.ts`: `getTrips()`, `createTrip()`, `getTripById()`, `joinTrip()`, `leaveTrip()`
- [ ] Tạo `src/services/api/routeService.ts`: `getRoutes()`, `createRoute()`, `searchRoutes()`, `saveRoute()`, `forkRoute()`
- [ ] Tạo `src/services/api/authService.ts`: `loginWithPhone()`, `verifyOTP()`, `loginWithGoogle()`, `refreshToken()`, `logout()`
- [ ] Tạo `src/services/api/socialService.ts`: `getPosts()`, `createPost()`, `likePost()`, `getGhepDoan()`
- [ ] Tạo `src/mocks/` với mock data cho từng service: trả về typed data khớp với types đã định nghĩa
- [ ] Tạo `src/services/storage/secureStorage.ts`: wrapper cho token storage

**Kiến thức cần học:**
- Axios interceptors flow: request → [request interceptor] → server → [response interceptor] → handler
- `AsyncStorage` vs `expo-secure-store`: token sensitive → SecureStore (Keychain/Keystore); non-sensitive → AsyncStorage
- Repository pattern: service layer như "repository" — UI hỏi service, không hỏi axios trực tiếp

**Check sau ngày 7:**
- `tripService.getTrips()` trả về `Trip[]` đúng type từ mock
- Auth interceptor tự động add `Authorization: Bearer <token>` header

---

### Ngày 8 — Navigation: Type-Safe + Auth Guard

**Mục tiêu:** Fix toàn bộ `any` trong navigation, thêm auth-based routing.

**Cần làm:**
- [ ] Update `AppNavigator.tsx`: dùng `RootStackParamList`, kiểm tra `useAuthStore().isAuthenticated` → redirect Login/Home
- [ ] Update `TabNavigator.tsx`: dùng `TabParamList`
- [ ] Update tất cả 12 screens: thay `useNavigation<any>()` bằng đúng type
- [ ] Tạo `src/navigation/AuthGuard.tsx`: HOC wrapper để protect routes
- [ ] Tạo `src/navigation/linking.ts`: deep link config cho trip invite QR

**Kiến thức cần học:**
- `CompositeNavigationProp`: type cho navigation khi screen ở trong nested navigator (Tab trong Stack)
- `useFocusEffect` vs `useEffect`: `useFocusEffect` chạy mỗi khi screen được focus lại, không chỉ mount
- Deep linking flow: URL scheme `road2d://` → `Linking.addEventListener` → parse params → navigate

**Check sau ngày 8:**
- `tsc --noEmit` → 0 errors liên quan navigation
- Logout → redirect về Login; Login → redirect về Home

---

### Ngày 9 — Error Boundary + Loading System + Global UX

**Mục tiêu:** App không bao giờ crash trắng màn hình, mọi state đều có loading/error UI.

**Cần làm:**
- [ ] Tạo `src/components/common/ErrorBoundary.tsx`: class component, catch crashes, hiện fallback UI với R2D branding
- [ ] Tạo `src/components/common/LoadingScreen.tsx`: full-screen branded loading
- [ ] Tạo `src/components/common/EmptyState.tsx`: illustrated empty state với icon + message + optional action button
- [ ] Tạo `src/hooks/useAsync.ts`: `{ data, loading, error, execute }` — standardized async state
- [ ] Wrap `<AppNavigator />` trong `<ErrorBoundary>` ở `App.js`

**Kiến thức cần học:**
- Error Boundary là class component vì chỉ `componentDidCatch` (class lifecycle) mới catch render errors — hooks không làm được
- `useAsync` pattern: tránh lặp `const [loading, setLoading] = useState(false)` ở mọi component
- Sentry concept cho React Native: error reporting service — không implement ngay nhưng cần biết

**Check sau ngày 9:**
- Simulate crash trong một component → ErrorBoundary hiện UI đẹp thay vì màn hình đỏ
- `useAsync` được dùng trong ít nhất 2 screen test

---

## 🎨 PHASE 2 — Auth + Home + Component Library (Ngày 10–16)

### Ngày 10 — Component Library: Buttons, Cards, Typography

**Mục tiêu:** Xây dựng design system reusable — xóa bỏ style duplicate đang tồn tại ở mọi screen.

**Cần làm:**
- [ ] Tạo `src/components/ui/Button.tsx`: variants `primary | secondary | outline | ghost | danger`, sizes `sm | md | lg`, `loading` prop (spinner thay text), `leftIcon`/`rightIcon`
- [ ] Tạo `src/components/ui/Card.tsx`: base card với configurable `shadow`, `radius`, `padding`
- [ ] Tạo `src/components/ui/Typography.tsx`: `Heading1`, `Heading2`, `Body`, `Caption`, `Label` — dùng `typography.ts`
- [ ] Tạo `src/components/ui/Avatar.tsx`: sizes `xs | sm | md | lg`, online indicator badge, fallback initials khi không có ảnh
- [ ] Tạo `src/components/ui/Divider.tsx`: horizontal/vertical divider
- [ ] Load custom font: verify `src/assets/fonts/` structure, update `App.js` nếu cần thêm font

**Kiến thức cần học:**
- `StyleSheet.create()` vs inline styles: StyleSheet được serialize 1 lần và send qua bridge — performance tốt hơn
- Variant pattern với TypeScript: `type ButtonVariant = 'primary' | 'secondary'` + `const variantStyles: Record<ButtonVariant, ViewStyle>`
- `Platform.select()`: trả về value khác nhau cho iOS/Android trong cùng code

**Check sau ngày 10:**
- `LoginScreen` dùng `<Button>` và `<Typography>` từ component library
- Không còn `paddingVertical: 16, borderRadius: 30` duplicate ở nhiều nơi

---

### Ngày 11 — Component Library: Inputs, Chips, BottomSheet

**Mục tiêu:** Hoàn thiện input system và bottom sheet — hiện `ExploreMapScreen` có bottom sheet cứng.

**Cần làm:**
- [ ] Tạo `src/components/ui/Input.tsx`: label, error message, left/right icon slot, `secureTextEntry`, character count
- [ ] Tạo `src/components/ui/Chip.tsx`: selectable chip với active state, dismiss button — refactor từ filter chips đang duplicate ở `ExploreMapScreen` và `CommunityScreen`
- [ ] Tạo `src/components/ui/BottomSheet.tsx`: dùng `react-native-reanimated` + `react-native-gesture-handler` — draggable, snap points, backdrop
- [ ] Tạo `src/components/ui/Tag.tsx`: small non-interactive tag — refactor từ route tags trong `TripDetailsScreen`
- [ ] Tạo `src/components/ui/Badge.tsx`: count badge, status badge (online/offline)
- [ ] Tạo `src/components/ui/Skeleton.tsx`: shimmer loading placeholder dùng `expo-linear-gradient`

**Kiến thức cần học:**
- `react-native-reanimated` v4 (`~4.1.1`): `useSharedValue`, `useAnimatedStyle`, `withSpring` — hoàn toàn khác v2
- `GestureDetector` + `Pan` từ `react-native-gesture-handler` v2: API mới so với v1
- `KeyboardAvoidingView` behavior: `'padding'` (iOS) vs `'height'` (Android)

**Check sau ngày 11:**
- Bottom sheet ở `ExploreMapScreen` có thể drag up/down
- Filter chips ở cả hai screens dùng cùng `<Chip>` component

---

### Ngày 12 — Auth Flow: Phone OTP + Google OAuth

**Mục tiêu:** `LoginScreen` thành authentication thực sự.

**Cần làm:**
- [ ] Tích hợp `expo-auth-session` cho Google OAuth
- [ ] Tạo `src/screens/auth/PhoneInputScreen.tsx`: Vietnam phone với `+84` prefix
- [ ] Tạo `src/screens/auth/OTPScreen.tsx`: 6-digit OTP input, countdown timer, resend
- [ ] Kết nối `authService.loginWithPhone()` → nhận JWT → `useAuthStore.login()` → `expo-secure-store`
- [ ] Loading state trên buttons, disable trong khi submit
- [ ] Error handling: số sai format, OTP hết hạn, network error

**Kiến thức cần học:**
- Expo Auth Session OAuth flow: `useAuthRequest()`, `promptAsync()` → open browser → callback
- `expo-secure-store`: `setItemAsync()`, `getItemAsync()` — encrypted, platform-native storage
- OTP input pattern: `TextInput` với `maxLength={1}` × 6, auto-focus next on input

**Check sau ngày 12:**
- Google OAuth: open browser → consent → callback → logged in
- Phone OTP: nhập số → nhận OTP → verify → vào app
- Token được lưu securely, survive app restart

---

### Ngày 13 — HomeScreen: Data Thực + Animation Polish

**Mục tiêu:** `HomeScreen` kết nối store thật, animations smoother.

**Cần làm:**
- [ ] Thay `UPCOMING_TRIPS` hardcode bằng `useTripStore().upcomingTrips` + mock data
- [ ] Avatar thực từ `useAuthStore().user`
- [ ] Migrate FAB animation từ `Animated` API cũ sang `react-native-reanimated`
- [ ] Thêm skeleton loading khi trips đang fetch
- [ ] Pull-to-refresh với `RefreshControl`
- [ ] Active trip card: progress percentage real, ETA countdown

**Kiến thức cần học:**
- `Animated` (built-in) vs `react-native-reanimated`: Reanimated chạy trên UI thread (Worklet) → không block JS → smoother
- `withSpring` vs `withTiming`: spring có velocity và bounce — tự nhiên hơn cho UI elements
- `useReducer` khi state logic phức tạp: FAB với nhiều animated values → reducer cleaner hơn nhiều useState

**Check sau ngày 13:**
- FAB animation ≥ 60fps, không janky khi expand/collapse
- Skeleton loader hiện khi fetch data

---

### Ngày 14 — AllUpcomingTrips + TripCard Component

**Mục tiêu:** Tạo reusable TripCard, xây dựng list với filter và search.

**Cần làm:**
- [ ] Tạo `src/components/trip/TripCard.tsx`: reusable từ `HomeScreen` và `AllUpcomingTripsScreen`
- [ ] `AllUpcomingTripsScreen`: `FlatList` thay `ScrollView`, filter by `TripStatus`, search bar với debounce
- [ ] Swipe-to-delete với `Swipeable` từ `react-native-gesture-handler`
- [ ] Empty state khi không có trips

**Kiến thức cần học:**
- `FlatList` vs `ScrollView`: FlatList virtualize — chỉ render items trong viewport. List > 20 items → bắt buộc FlatList
- `FlatList` optimization props: `keyExtractor`, `getItemLayout` (fixed height), `removeClippedSubviews`, `initialNumToRender`
- Debounce với `useCallback`: `const debouncedSearch = useCallback(debounce(searchFn, 300), [])`

**Check sau ngày 14:**
- `AllUpcomingTripsScreen` dùng `FlatList`, scroll smooth
- Search debounce 300ms, không spam filter

---

### Ngày 15 — ProfileScreen: Real User Data + Edit

**Mục tiêu:** Profile với real user data, avatar upload, logout thực.

**Cần làm:**
- [ ] Hiển thị user data từ `useAuthStore`: tên, avatar, stats (trips, km, routes)
- [ ] Avatar upload: `expo-image-picker` → compress → upload → update store
- [ ] Edit profile: inline editing name/bio
- [ ] Logout: confirmation dialog → `authService.logout()` → clear stores → redirect Login
- [ ] Trip history section: trips completed từ `useTripStore`
- [ ] Saved routes section: link sang saved routes store

**Kiến thức cần học:**
- `expo-image-picker` permissions: `requestMediaLibraryPermissionsAsync()` — cần request trước
- Image compression: `expo-image-manipulator` → resize to max 800px, quality 0.8 trước upload
- `Alert.alert()` vs custom Modal: Alert dùng native dialog (đẹp hơn) cho destructive actions như logout

**Check sau ngày 15:**
- Upload avatar → hiện ngay trong UI → persist qua app restart
- Logout → clear token → về Login

---

### Ngày 16 — Theme System + Dark Mode

**Mục tiêu:** Dark mode responsive theo system setting.

**Cần làm:**
- [ ] Tạo `src/theme/darkColors.ts`: dark mode variants cho tất cả tokens trong `colors.ts`
- [ ] Tạo `src/hooks/useTheme.ts`: đọc `useColorScheme()`, trả về đúng color set
- [ ] Update `ThemedView` và `ThemedText` (đã có file nhưng chưa implement dark mode)
- [ ] `expo-system-ui`: set navigation bar color theo theme
- [ ] Theme toggle trong ProfileScreen settings (user override vs system)

**Kiến thức cần học:**
- `useColorScheme()` hook: `'light' | 'dark' | null` — null khi chưa set
- Dynamic theme context: React Context để propagate theme — avoid prop drilling
- Tại sao không dùng StyleSheet.create cho themed styles: StyleSheet static, không đổi theo runtime theme

**Check sau ngày 16:**
- Đổi system sang Dark mode → app tự đổi toàn bộ màu
- Splash screen và app theme nhất quán

---

## 🗺️ PHASE 3 — Real Maps + Trip Flow + Safety Prototype (Ngày 17–25)

> **Tại sao Safety Prototype ở đây:** Safety là tính năng phân biệt cốt lõi R2D. Prototype algorithm sớm ở ngày 20 để validate concept trước khi build full system ở Phase 5.

### Ngày 17 — react-native-maps: Integration Thực

**Mục tiêu:** Thay ảnh giả ở `ExploreMapScreen` bằng `react-native-maps` thực.

**Cần làm:**
- [ ] Configure API key: Android → `app.config.js` đã có `googleMaps.apiKey`; iOS → thêm vào `info.plist` qua plugin
- [ ] Update `ExploreMapScreen`: xóa `<Image>` map background + `fakePolyline`, thay bằng `<MapView>`
- [ ] Custom map style JSON: tạo brown/earth tone style khớp R2D — dùng [Google Maps Styling Wizard](https://mapstyle.withgoogle.com/)
- [ ] `<Marker>` cho route locations, `<Polyline>` cho fake route trước
- [ ] User location: `showsUserLocation={true}`, xin permission trước

**Kiến thức cần học:**
- `react-native-maps` providers: `PROVIDER_GOOGLE` (Android + iOS nếu muốn) vs `PROVIDER_DEFAULT` (Apple Maps on iOS)
- Custom map style JSON format: object array với `featureType`, `elementType`, `stylers`
- `MapView` re-render: không đặt `MapView` bên trong `ScrollView` — gây conflict gesture

**Check sau ngày 17:**
- Map thật hiện với custom brown style khớp R2D branding
- User dot hiện trên map

---

### Ngày 18 — Geolocation + GPS Tracking

**Mục tiêu:** Tích hợp GPS thực cho `LiveTrackingScreen`.

**Cần làm:**
- [ ] `npx expo install expo-location`
- [ ] Tạo `src/hooks/useLocation.ts`: request permissions → watch position → `{ coords, speed, heading, error, loading }`
- [ ] Update `LiveTrackingScreen`: user marker theo GPS thật, speed display từ `coords.speed`
- [ ] Xử lý GPS accuracy: hiện accuracy circle khi `coords.accuracy > 50m`
- [ ] Background location setup: `app.json` thêm `UIBackgroundModes: ['location']`, foreground service config

**Kiến thức cần học:**
- Expo Location accuracy levels: `Accuracy.Balanced` (30m, battery-friendly), `Accuracy.High` (10m), `Accuracy.BestForNavigation` (< 5m, battery heavy)
- `watchPositionAsync` vs `getCurrentPositionAsync`: watch = continuous updates, current = one-shot
- GPS cold start: đầu tiên GPS có thể mất 10-30s để lock — hiện loading indicator
- Background location iOS requirements: must request `BackgroundLocationPermission` separately

**Check sau ngày 18:**
- Di chuyển thiết bị → user dot di chuyển trên map
- Speed hiện đúng km/h từ GPS

---

### Ngày 19 — Route Drawing + Directions API

**Mục tiêu:** Vẽ routes thực trên map trong `CreateRouteScreen` và `TripDetailsScreen`.

**Cần làm:**
- [ ] Update `CreateRouteScreen` Step 1: `MapView` thật, tap → add waypoint, long-press waypoint → drag
- [ ] Tạo `src/hooks/useMapRoute.ts`: manage waypoints, calculate distance
- [ ] Tích hợp OpenRouteService API (free, open-source): waypoints → route polyline geometry
- [ ] Decode polyline: `npm install @mapbox/polyline` → decode encoded polyline từ ORS
- [ ] Update `TripDetailsScreen`: mini-map với route geometry thật
- [ ] `mapRef.current.fitToCoordinates()`: auto-zoom để fit toàn bộ route

**Kiến thức cần học:**
- OpenRouteService vs Google Directions: ORS miễn phí không cần thẻ; Google Maps Directions tính phí sau $200 credit
- Encoded polyline format: Google và ORS đều dùng — [Algorithm](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
- Snapping to road: ORS tự snap waypoints lên road network — không cần tự làm
- Route geometry: mảng `[lat, lon]` coordinates có thể có hàng nghìn points — cần optimize để render

**Check sau ngày 19:**
- Tap 3 điểm trên map → polyline hiện nối 3 điểm qua road network
- `TripDetailsScreen` có mini-map với Hà Giang Loop geometry thật

---

### Ngày 20 — 🆕 Safety Algorithm Prototype (Early)

**Mục tiêu:** Prototype core safety algorithms SỚMHƠN — validate concept, tìm bugs trong logic trước khi build full UI ở Phase 5.

**Tại sao ngày 20?** Đây là điểm giữa của project — đủ map foundation để test, đủ sớm để pivot nếu algorithm không khả thi.

**Cần làm:**
- [ ] Tạo `src/utils/geoUtils.ts` với core algorithms:
  ```ts
  // Haversine distance giữa 2 GPS points
  haversineDistance(p1: LatLng, p2: LatLng): number  // returns km

  // Point projection lên line segment (nearest point)
  projectPointToSegment(point: LatLng, start: LatLng, end: LatLng): LatLng

  // Distance từ point tới polyline (route)
  distanceToPolyline(point: LatLng, polyline: LatLng[]): number

  // Ray casting: point trong polygon không?
  isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean

  // Distance từ point tới polygon boundary (nearest edge)
  distanceToPolygon(point: LatLng, polygon: LatLng[]): number
  ```
- [ ] Tạo mock coverage zone: vẽ 1 polygon GeoJSON đại diện no-signal area trên route Hà Giang
- [ ] Test trực tiếp trên `LiveTrackingScreen`: log ra `distanceToZone` khi GPS thay đổi
- [ ] Viết unit tests: `src/__tests__/geoUtils.test.ts` — verify haversine với known distances

**Kiến thức cần học:**
- Haversine formula: `d = 2r·arcsin(√(sin²(Δφ/2) + cos(φ₁)cos(φ₂)sin²(Δλ/2)))` — geodesic distance trên hình cầu
- Ray casting algorithm: bắn tia ngang từ point, đếm số lần cắt polygon boundary → odd = inside
- Point-to-segment distance: chiều cao từ điểm xuống đoạn thẳng — nếu projection nằm ngoài segment thì dùng distance tới endpoint gần nhất
- GeoJSON coordinate order: `[longitude, latitude]` (ngược với React Native Maps là `{ latitude, longitude }`) — common source of bugs!

**Check sau ngày 20:**
- `haversineDistance({lat: 21.024, lng: 105.841}, {lat: 23.134, lng: 104.353})` ≈ 305km (HN → HG)
- `isPointInPolygon(currentPos, mockCoverageZone)` trả về đúng khi di chuyển qua zone
- Unit tests pass cho tất cả geo functions

---

### Ngày 21 — TripDetailsScreen: Hoàn Thiện Tabs

**Mục tiêu:** Tất cả 5 tabs trong TripDetails có nội dung thực và tương tác.

**Cần làm:**
- [ ] Tab "Tổng quan": real route data từ `routeService`
- [ ] Tab "Điểm dừng": tap stopover → popup detail, thêm stopover vào trip
- [ ] Tab "Plan": `PlanCard` component, fetch từ `tripService`
- [ ] Tab "Review": rating breakdown, infinite scroll; real rating input
- [ ] Tab "Thời tiết": [OpenMeteo API](https://api.open-meteo.com) — free, no key needed
- [ ] Sticky header collapse khi scroll

**Kiến thức cần học:**
- OpenMeteo API: `GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,precipitation_probability`
- `Animated.ScrollView` + interpolation cho collapsible header
- Lazy tab loading: chỉ fetch data khi tab được tap, không fetch tất cả khi mount

**Check sau ngày 21:**
- Tab "Thời tiết" hiện forecast thực của tọa độ Hà Giang
- Scroll xuống → header image thu nhỏ lại

---

### Ngày 22 — CreateTripScreen: Form Validation Thực

**Mục tiêu:** Form thực với validation, kết nối route selection.

**Cần làm:**
- [ ] `npm install react-hook-form zod @hookform/resolvers`
- [ ] Tạo Zod schema: validate departure time (phải là tương lai), member limit (1–50), vehicle type required
- [ ] Date/time picker: `@react-native-community/datetimepicker`
- [ ] "Dùng tuyến này" từ `TripDetailsScreen` → pre-fill route trong CreateTrip (navigation params)
- [ ] Submit → `tripService.createTrip()` → navigate sang `TeamRosterScreen`

**Kiến thức cần học:**
- `react-hook-form` với React Native: dùng `Controller` component vì RN inputs không có DOM `ref`
- Zod refinements: `.refine(val => val > Date.now(), 'Ngày phải là tương lai')`
- Form state machine: `idle | validating | submitting | success | error`

**Check sau ngày 22:**
- Submit form trống → inline error messages hiện đúng field
- Submit valid → navigate sang TeamRoster với trip data

---

### Ngày 23 — TeamRosterScreen: QR Invite System

**Mục tiêu:** Member management với QR code invite.

**Cần làm:**
- [ ] `npm install react-native-qrcode-svg`
- [ ] Generate QR code: URL `road2d://join?tripId={id}&token={inviteToken}`
- [ ] Deep link handler: scan QR → open app → join trip flow
- [ ] Role UI: xế/ôm/xe hơi với badge, leader có crown icon
- [ ] Remove member: leader only, long-press → confirm dialog

**Kiến thức cần học:**
- QR Code format: QR chứa URL với deep link scheme — app đăng ký scheme trong `app.json`
- `expo-linking`: `Linking.addEventListener('url', handleUrl)`, `Linking.getInitialURL()`
- App scheme: `"scheme": "road2d"` trong `app.json` — thay vì `"mobilepreview"` đang có

**Check sau ngày 23:**
- Tạo trip → QR hiện
- Scan QR bằng camera → mở app → join trip

---

### Ngày 24 — ExploreMapScreen: Real Routes + Interactive

**Mục tiêu:** Map screen kết nối real data, markers tương tác với bottom sheet.

**Cần làm:**
- [ ] Fetch routes từ `routeService` theo filter (Gần tôi, Trending, Đã lưu, Đang có rider)
- [ ] "Gần tôi": `expo-location` → gửi coordinates → filter by proximity
- [ ] Tap marker → highlight route card trong bottom sheet; tap card → center map + highlight polyline
- [ ] Search: debounced `routeService.searchRoutes(query)`
- [ ] Route polylines trên map với màu khác nhau (easy=xanh, hard=đỏ)

**Kiến thức cần học:**
- Map marker → bottom sheet correlation: `useState<string | null>(selectedRouteId)` là bridge giữa map và sheet
- `mapRef.current.animateToRegion()`: animate smooth khi tap card
- Marker clustering concept: nhiều markers gần nhau → group thành cluster icon

**Check sau ngày 24:**
- Tap marker → bottom sheet scroll đến đúng card
- Filter "Gần tôi" → markers theo vị trí user

---

### Ngày 25 — LiveTrackingScreen: Navigation Mode Thực

**Mục tiêu:** GPS tracking thực, route progress, group simulation.

**Cần làm:**
- [ ] Real GPS tracking với animated user marker
- [ ] Route progress: project GPS position lên polyline → tính % completed
- [ ] Bearing calculation: hướng di chuyển → xoay map
- [ ] Speed + ETA thực từ GPS
- [ ] Simulate group member positions: animated fake lat/lng để test group UX
- [ ] "Đã tới Trạm" → update progress → notify members

**Kiến thức cần học:**
- Point-on-line projection: dùng `projectPointToSegment` từ `geoUtils.ts` (đã viết ngày 20!)
- Bearing: `atan2(sin(Δlon)·cos(lat2), cos(lat1)·sin(lat2) - sin(lat1)·cos(lat2)·cos(Δlon))` → degrees
- ETA: `remainingDistance / averageSpeed` — smooth speed bằng rolling average 5 readings
- `MapView.followsUserLocation`: tự track user location — nhưng lock user không scroll map được

**Check sau ngày 25:**
- User marker di chuyển theo GPS thực
- Progress bar tăng theo vị trí thực tế trên route
- ETA hiện đúng dựa trên tốc độ thực

---

## 💬 PHASE 4 — Social, Community & Chat (Ngày 26–33)

### Ngày 26 — CommunityScreen: Infinite Scroll Feed

**Mục tiêu:** Feed thực với infinite scroll và optimistic likes.

**Cần làm:**
- [ ] Tạo `src/hooks/usePosts.ts`: fetch, paginate, optimistic like/unlike
- [ ] `FlatList` với `onEndReached` → fetch next page
- [ ] Optimistic like: tap → immediate +1 → API call → rollback nếu fail
- [ ] `expo-image` (đã cài `~3.0.11`) thay `Image` built-in: blurhash placeholder, better caching
- [ ] Post timestamp với `dayjs`: `npm install dayjs`

**Kiến thức cần học:**
- Optimistic UI: update local state ngay, nếu API fail → revert. Cần lưu pre-update state
- `expo-image` so với `Image`: built-in caching, `placeholder` (blurhash), `transition` animations
- Pagination cursor vs offset: cursor pagination stable hơn khi data thay đổi trong khi user scroll

**Check sau ngày 26:**
- Scroll xuống → load thêm posts
- Like → số đổi ngay, không chờ API

---

### Ngày 27 — CreatePost + Camera + Geo-Tag

**Mục tiêu:** User tạo post với ảnh, geo-tagged.

**Cần làm:**
- [ ] `npx expo install expo-image-picker expo-camera expo-image-manipulator`
- [ ] Tạo `src/screens/community/CreatePostScreen.tsx`
- [ ] Multi-image picker từ gallery, camera capture
- [ ] Compress ảnh: `expo-image-manipulator` → max 1080px, quality 0.8
- [ ] Geo-tag tự động từ `expo-location`
- [ ] "Đang đi cung nào" dropdown: link post với active trip

**Kiến thức cần học:**
- `expo-image-manipulator`: `manipulateAsync(uri, [{resize: {width: 1080}}], {compress: 0.8, format: 'jpeg'})`
- Multipart/form-data upload với axios: `const form = new FormData(); form.append('image', { uri, name, type })`
- Camera vs Image Picker permissions: camera cần `requestCameraPermissionsAsync()`

**Check sau ngày 27:**
- Tạo post với 3 ảnh → upload → xuất hiện trong feed với geo marker

---

### Ngày 28 — Ghép Đoàn: Full Matching Feature

**Mục tiêu:** Ghép đoàn với create listing, interest notification.

**Cần làm:**
- [ ] Create listing flow: form tạo yêu cầu ghép đoàn (route, dates, vehicle, requirements)
- [ ] Fetch listings với filter: Tìm Xế / Tìm Ôm / Ghép Đoàn
- [ ] Interest system với optimistic update
- [ ] Match notification concept: khi accept → notify cả hai
- [ ] "Nhắn tin" → ChatScreen với context

**Kiến thức cần học:**
- Matching algorithm concept: filter by `dateOverlap(listingDates, userAvailability)` + `routeProximity` + `vehicleCompatibility`
- Push notification flow: backend nhận event → gửi FCM/APNs → device nhận notification
- Deep link từ notification: tap notification → open specific screen

**Check sau ngày 28:**
- Tạo listing → xuất hiện trong Ghép Đoàn tab
- Tap "Quan tâm" → chủ listing nhận notification (mock)

---

### Ngày 29 — ChatScreen: Realtime Messaging

**Mục tiêu:** Chat thực với trip group context.

**Cần làm:**
- [ ] Chat list: danh sách conversations (trip groups + direct)
- [ ] Chat room: message list (`FlatList inverted={true}`) + input bar
- [ ] Message types: text, location share, trip invite card
- [ ] WebSocket hoặc Firebase RTDB cho realtime (chọn 1)
- [ ] Typing indicator, read receipts

**Kiến thức cần học:**
- `FlatList inverted={true}`: messages từ dưới lên — chuẩn chat UX
- WebSocket lifecycle: open → send/receive → ping/pong keepalive → close
- Firebase RTDB vs Firestore: RTDB cho low-latency realtime, Firestore cho queries phức tạp
- `KeyboardAvoidingView` + input at bottom: iOS cần `behavior="padding"`, Android cần `behavior="height"`

**Check sau ngày 29:**
- Gửi tin nhắn → xuất hiện ngay không cần refresh
- Location share → recipient tap → mở map

---

### Ngày 30 — Moment System: Geo-Tagged Travel Moments

**Mục tiêu:** Photos gắn với route + vị trí, hiện trên map.

**Cần làm:**
- [ ] `src/screens/moment/CreateMomentScreen.tsx`: capture → auto-attach GPS + route context
- [ ] Moments hiện trên map `ExploreMapScreen` như photo pins
- [ ] Moment detail: full-screen ảnh + route context
- [ ] Route page shows moments từ previous travelers
- [ ] Moments timeline trong `TripDetailsScreen` tab

**Kiến thức cần học:**
- EXIF metadata: ảnh chụp có embedded GPS, timestamp — đọc bằng `expo-media-library`
- Map photo pins: custom Marker với thumbnail — `<Marker><Image /></Marker>`
- Content layer ordering trên map: moments layer, route layer, zone layer — quan trọng cho safety layer sau

**Check sau ngày 30:**
- Chụp ảnh trong LiveTracking → pin xuất hiện trên map route

---

### Ngày 31 — Route Publishing: 4-Step Flow Hoàn Chỉnh

**Mục tiêu:** Publish route thực lên community.

**Cần làm:**
- [ ] Complete CreateRouteScreen 4 bước với real validation
- [ ] Step 3: interactive stopover picker trên map
- [ ] `MapView.takeSnapshot()` → auto-generate thumbnail
- [ ] Privacy settings: Public / Friends / Private
- [ ] Fork route: copy route → navigate CreateTrip với pre-fill

**Kiến thức cần học:**
- `MapView.takeSnapshot(options)`: width, height, format, quality — chụp ảnh map region
- Route geometry storage: encoded polyline compact hơn mảng coordinates ~5x
- Community content: rate limiting để ngăn spam routes

**Check sau ngày 31:**
- Publish route → xuất hiện trong ExploreMapScreen của community

---

### Ngày 32 — Notifications System

**Mục tiêu:** Push + local notifications cho toàn app.

**Cần làm:**
- [ ] `npx expo install expo-notifications`
- [ ] Request permission khi onboard
- [ ] Local notifications: trip departure reminder, stopover arrival
- [ ] FCM setup (Android) + APNs concept (iOS)
- [ ] In-app notification center: bell icon, list of notifications
- [ ] Notification types: member joined, message, route liked, **safety alert** (preview cho Phase 5)

**Kiến thức cần học:**
- Expo Notifications: `scheduleNotificationAsync` (local), `addNotificationReceivedListener`, `addNotificationResponseReceivedListener`
- Android notification channels: group notifications theo category (SAFETY, SOCIAL, TRIP)
- Badge count: `expo-notifications.setBadgeCountAsync()`

**Check sau ngày 32:**
- Đặt reminder trip → nhận notification đúng giờ
- Member join → leader nhận notification

---

### Ngày 33 — Saved Routes + Bookmarks + Offline Metadata

**Mục tiêu:** Users save routes, accessible offline.

**Cần làm:**
- [ ] Save route: `useSavedRoutesStore` với persist via AsyncStorage
- [ ] Saved routes trong ProfileScreen
- [ ] Offline metadata: route name, thumbnail, km, stopovers — lưu locally khi save
- [ ] Sort/filter saved routes
- [ ] Unsave với optimistic update

**Kiến thức cần học:**
- Zustand persist: `(set) => ({ saved: [], save: (route) => set(state => ({ saved: [...state.saved, route] })) })`
- Cache invalidation: khi tác giả update route, saved copy trở nên stale — cần timestamp + re-fetch khi online
- `expo-sqlite` concept: structured local DB mạnh hơn AsyncStorage — dùng cho Phase 5 offline

**Check sau ngày 33:**
- Save route → tắt WiFi → Saved tab vẫn hiện route
- Data persist qua app restart

---

## 🛡️ PHASE 5 — Safety Layer Đầy Đủ (Ngày 34–40)

> **Note:** Algorithms đã prototype ở Ngày 20. Phase này xây dựng full UI, thêm danger zones, offline support, và group safety.

### Ngày 34 — Coverage Zone Visualization

**Mục tiêu:** Hiển thị cellular coverage zones lên map.

**Cần làm:**
- [ ] Tạo `src/services/safety/coverageService.ts`: fetch GeoJSON polygons theo route bounding box
- [ ] GeoJSON data: tạo mock coverage zones cho Hà Giang (biết là no-signal zone thực tế)
- [ ] `<Polygon>` trên MapView: `fillColor="rgba(255,0,0,0.15)"` cho no-signal, `fillColor="rgba(255,200,0,0.15)"` cho low-signal
- [ ] Coverage legend card overlay
- [ ] Toggle layer on/off

**Kiến thức cần học:**
- GeoJSON format: `{ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [[...]] }, properties: {...} }] }`
- react-native-maps `<Polygon>`: `coordinates` nhận `LatLng[]`, hỗ trợ `holes` cho donut polygons
- Coverage data sources: OpenCelliD (crowd-sourced), GSMA coverage APIs — R2D chưa quyết định provider

**Check sau ngày 34:**
- Vùng no-signal Hà Giang hiện bằng polygon đỏ nhạt trên map
- Toggle OFF → polygons biến mất

---

### Ngày 35 — Distance-to-Zone + Time-to-Zone: Full Implementation

**Mục tiêu:** Tích hợp algorithms từ Ngày 20 vào real-time tracking.

**Cần làm:**
- [ ] `src/services/safety/riskCalculator.ts`: `calculateDistanceToZone(position, zones)`, `calculateTimeToZone(distance, speed)`
- [ ] Tích hợp vào `LiveTrackingScreen`: mỗi GPS update → recalculate distance
- [ ] Speed smoothing: rolling average 5 GPS readings để tránh noisy speed
- [ ] Log kết quả: khi distance < 20km → bắt đầu monitoring tích cực hơn (update mỗi 5s thay 30s)

**Kiến thức cần học:**
- `distanceToPolygon` đã có từ Ngày 20 — gọi lại, không viết lại
- Speed smoothing: `avgSpeed = lastNSpeeds.reduce(sum) / N` — N = 5 thường đủ
- Adaptive update frequency: battery optimization — không cần update mỗi giây khi còn 50km

**Check sau ngày 35:**
- Di chuyển gần zone → console.log hiện distance giảm đúng
- Time-to-zone = `distance / smoothedSpeed` tính đúng

---

### Ngày 36 — Proactive Warnings UI

**Mục tiêu:** Cảnh báo sớm với UX không gây "alert fatigue".

**Cần làm:**
- [ ] Tạo `src/components/safety/CoverageWarningBanner.tsx`: dismissible banner ở top LiveTracking
- [ ] Warning thresholds: `distanceToZone < 10km` → yellow; `< 5km` → orange; `< 2km` → red
- [ ] Time thresholds: `timeToZone < 15min` → show warning
- [ ] Dismiss logic: suppress 5 phút → re-show nếu vẫn approaching
- [ ] Warning severity enum: `LOW | MEDIUM | HIGH | CRITICAL`
- [ ] Haptic feedback khi warning xuất hiện: `expo-haptics`

**Kiến thức cần học:**
- Alert fatigue: quá nhiều warnings → user ignore all → counter-productive. NASA HMI guidelines: max 1 warning at a time
- Haptic pattern: `Haptics.notificationAsync(NotificationFeedbackType.Warning)` — tốt hơn sound cho navigation
- Warning persistence: `useRef` để track suppress timer, không dùng state (tránh re-render)

**Check sau ngày 36:**
- Test với mock distance = 8km → yellow banner xuất hiện
- Dismiss → 5 phút sau re-appear nếu vẫn approaching zone

---

### Ngày 37 — Danger Zones + Risk Scoring

**Mục tiêu:** Danger zone layer và contextual risk score.

**Cần làm:**
- [ ] Tạo mock danger zones: Đèo Mã Pì Lèng, Đèo Ô Quy Hồ, Đèo Khau Phạ — với type `MOUNTAIN_ROAD`
- [ ] `dangerZoneService.ts`: fetch + display như coverage zones nhưng màu khác (amber)
- [ ] Risk score formula: `score = 0.30 * connectivity + 0.25 * terrain + 0.20 * remoteness + 0.15 * groupSpread + 0.10 * timeOfDay`
- [ ] `src/components/safety/RiskIndicator.tsx`: compact widget với màu và icon theo risk level
- [ ] Hiện risk score trong LiveTracking bottom panel

**Kiến thức cần học:**
- Weighted scoring normalization: mỗi factor cần về scale 0.0–1.0 trước khi apply weight
- `timeOfDay` factor: đêm khuya trên đường núi risk cao hơn ban ngày → `hour >= 20 || hour <= 5 ? 1.0 : 0.2`
- Thresholds cho risk levels: 0–0.3 = LOW, 0.3–0.5 = MEDIUM, 0.5–0.75 = HIGH, > 0.75 = CRITICAL

**Check sau ngày 37:**
- Khi đang trong danger zone + no-signal + member lag sau → CRITICAL
- Risk indicator đổi màu realtime

---

### Ngày 38 — Offline Navigation Preparation

**Mục tiêu:** Download route data + danger zones trước chuyến đi.

**Cần làm:**
- [ ] `npx expo install expo-file-system @react-native-community/netinfo`
- [ ] Tạo `src/screens/trip/OfflinePreparationScreen.tsx`: before-trip flow
- [ ] Download route geometry, waypoints, danger zones, coverage zones → `expo-file-system`
- [ ] Storage estimate, download progress
- [ ] "Offline mode": khi `!isConnected` → đọc từ local files
- [ ] Tạo `src/services/storage/offlineStorage.ts`: read/write local JSON files

**Kiến thức cần học:**
- `expo-file-system`: `downloadAsync(url, fileUri)`, `readAsStringAsync(fileUri)`, `deleteAsync(fileUri)`
- `FileSystem.documentDirectory`: persistent storage (không bị xóa khi clear cache)
- `@react-native-community/netinfo`: `useNetInfo()` hook — `isConnected`, `type` (wifi/cellular/none)
- Offline-first architecture: luôn read từ local first, update từ network khi có

**Check sau ngày 38:**
- Download → file lưu local → tắt WiFi → LiveTracking vẫn hiện zone data

---

### Ngày 39 — Group Safety: Member Tracking + Spread Alert

**Mục tiêu:** Theo dõi spread của nhóm, cảnh báo khi ai đó bị tách.

**Cần làm:**
- [ ] Mock WebSocket: member locations broadcast mỗi 10s
- [ ] `groupSpread`: max distance giữa tất cả members
- [ ] Member status: `ONLINE | LOW_SIGNAL | OFFLINE | SEPARATED`
- [ ] Alert khi: spread > 5km, member offline > 60s, member đi lệch route > 1km
- [ ] "Last seen": timestamp + coordinates khi member mất kết nối
- [ ] SOS button: hiện danh sách emergency contacts

**Kiến thức cần học:**
- Group centroid: `centerLat = average(allMemberLats)`, `centerLon = average(allMemberLons)`
- SEPARATED vs OFFLINE: SEPARATED = online nhưng xa; OFFLINE = không nhận update
- `expo-haptics`: SOS button cần haptic mạnh (Heavy impact)

**Check sau ngày 39:**
- Simulate: member A ở km 100, B ở km 130, C ở km 90 → spread = 40km → alert
- Member D mất update 65s → trạng thái OFFLINE

---

### Ngày 40 — Safety Briefing Screen: Pre-Trip Summary

**Mục tiêu:** Tóm tắt safety trước khi bắt đầu chuyến đi.

**Cần làm:**
- [ ] Tạo `src/screens/trip/SafetyBriefingScreen.tsx`: insert giữa CreateTrip và LiveTracking
- [ ] Scan route → tìm intersections với coverage + danger zones
- [ ] Hiện: số danger zones, vùng mất sóng dự kiến, thời điểm enter zone (dựa trên departure time + avg speed)
- [ ] Pre-trip checklist: "Download offline data?", "Emergency contacts set?", "Members confirmed?"
- [ ] Emergency contacts input
- [ ] "Bắt đầu hành trình" → LiveTracking

**Kiến thức cần học:**
- Route analysis: scan polyline theo đoạn 100m, check mỗi đoạn xem intersect zone nào
- Time prediction: `departureTime + (distanceToZone / estimatedAvgSpeed)` = estimated zone entry time
- UX writing cho safety: ngôn ngữ rõ ràng, không panic, actionable ("Tải offline data ngay" thay vì "Cảnh báo!")

**Check sau ngày 40:**
- Route Hà Giang → Safety Briefing hiện đúng số danger zones và giờ dự kiến mất sóng

---

## ✨ PHASE 6 — Polish, Real API, Deploy & Demo (Ngày 41–47)

### Ngày 41 — Performance Audit + Optimization

**Mục tiêu:** Profile app, fix bottlenecks, đạt ≥ 60fps.

**Cần làm:**
- [ ] Dùng Flipper hoặc React DevTools Profiler để find re-renders
- [ ] `React.memo` cho `TripCard`, `PostCard`, `RouteCard`, `MomentPin`
- [ ] `useMemo` cho expensive calculations: risk score, group spread, distance calculations
- [ ] `useCallback` cho event handlers trong lists
- [ ] `FlatList` optimization: `windowSize={5}`, `maxToRenderPerBatch={10}`, `updateCellsBatchingPeriod={50}`
- [ ] Tất cả `<Image>` → `<expo-image>` với `cachePolicy="disk"`

**Kiến thức cần học:**
- React Profiler flame chart: width = render time, màu đậm = re-render, xem "Why did this render?"
- `React.memo` khi hiệu quả: chỉ khi component render tốn VÀ props thực sự không đổi nhiều
- JS thread vs UI thread: heavy geo calculations nên dùng `InteractionManager.runAfterInteractions()`

**Check sau ngày 41:**
- FPS ≥ 55 khi scroll feed 20+ items
- Map render không drop frames khi di chuyển

---

### Ngày 42 — Error Handling + Network States

**Mục tiêu:** Mọi error case có UX tốt, retry logic.

**Cần làm:**
- [ ] Audit tất cả API calls: đều có try/catch + error state
- [ ] `npm install react-native-toast-message`: toast thay Alert cho non-critical errors
- [ ] Retry với exponential backoff: `delay = Math.min(500 * 2^attempt, 10000)`
- [ ] Network offline banner: persistent banner khi `!isConnected`
- [ ] Error boundary hiện "Something went wrong" với option restart
- [ ] Offline graceful degradation: show cached data khi không có network

**Kiến thức cần học:**
- Exponential backoff với jitter: thêm random delay để tránh thundering herd
- `react-native-toast-message` positioning: top vs bottom — bottom tốt hơn vì không che content
- Graceful degradation vs fail-fast: với safety data, fail-fast an toàn hơn (hiện cảnh báo thiếu data)

**Check sau ngày 42:**
- Tắt WiFi → toast "Không có mạng" + data từ cache vẫn hiện
- API fail → retry tự động 3 lần → sau đó hiện error state với Retry button

---

### Ngày 43 — Accessibility + i18n Vietnamese/English

**Mục tiêu:** App accessible, sẵn sàng đa ngôn ngữ.

**Cần làm:**
- [ ] `npm install react-i18next i18next`
- [ ] Tạo `src/locales/vi.json`: extract tất cả strings tiếng Việt hardcode từ 12 screens
- [ ] Tạo `src/locales/en.json`: English translations
- [ ] Language switcher trong ProfileScreen Settings
- [ ] `accessibilityLabel` cho tất cả `TouchableOpacity` và `Image`
- [ ] `accessibilityRole`: `"button"`, `"link"`, `"header"`, `"image"`
- [ ] Test với TalkBack (Android) / VoiceOver (iOS)

**Kiến thức cần học:**
- `react-i18next` với React Native: `useTranslation()` hook, `<Trans>` component, `t('key')`
- Dynamic language change: `i18n.changeLanguage('en')` — không cần restart app
- WCAG contrast ratio: text/background phải ≥ 4.5:1 — check R2D brown palette tại [contrast checker](https://webaim.org/resources/contrastchecker/)

**Check sau ngày 43:**
- VoiceOver navigate screen → mọi element có meaningful label
- Đổi language → toàn bộ UI string đổi không restart

---

### Ngày 44 — Testing: Unit + Integration

**Mục tiêu:** Test core logic và flows quan trọng nhất.

**Cần làm:**
- [ ] `npm install --save-dev jest @types/jest ts-jest @testing-library/react-native`
- [ ] Unit tests `geoUtils.ts`: haversine, isPointInPolygon, distanceToPolygon — 100% coverage
- [ ] Unit tests `riskCalculator.ts`: test edge cases (speed = 0, inside zone, group spread = 0)
- [ ] Integration test auth flow: login → store → protected route
- [ ] Manual test all navigation flows: Login → Home → TripDetails → CreateTrip → TeamRoster → Safety → Live
- [ ] Test edge cases: trip 0 members, route 1 waypoint, no GPS permission, offline mode

**Kiến thức cần học:**
- Jest với TypeScript: `ts-jest` transform, `moduleNameMapper` cho path aliases
- `@testing-library/react-native`: `render`, `fireEvent`, `waitFor`, `act`
- Test doubles: **mock** (kiểm soát return), **stub** (hardcode return), **spy** (verify call count)

**Check sau ngày 44:**
- `npm test` → tất cả pass
- geoUtils 100% coverage, riskCalculator ≥ 90%

---

### Ngày 45 — 🆕 Real API Integration

**Mục tiêu:** Chuyển từ mock data sang real backend API kết nối thực.

**Tại sao ngày 45?** Cần UI hoàn chỉnh trước để biết chính xác các API contracts cần. Backend team (hoặc self-built) cần cung cấp endpoints này.

**Cần làm:**
- [ ] Confirm API contracts với backend: request/response format cho mỗi endpoint
- [ ] Update `src/mocks/` → `src/services/api/`: swap mock returns với real `axios` calls
- [ ] Handle pagination: `cursor`-based pagination từ backend
- [ ] Handle auth: refresh token flow khi access token expire
- [ ] Error mapping: backend error codes → user-friendly messages bằng tiếng Việt
- [ ] Update `.env.local`: `EXPO_PUBLIC_API_URL` trỏ sang staging server
- [ ] Tạo `src/config/api.ts`: list tất cả endpoint URLs — easy to update

**Kiến thức cần học:**
- API contract testing: đảm bảo frontend types match backend response — dùng `zod.parse()` để validate runtime
- Token refresh flow: interceptor detect 401 → gọi `/auth/refresh` → retry original request — avoid multiple concurrent refreshes với `isRefreshing` flag
- CORS: khi test trên simulator vs device: simulator gọi `localhost` dễ hơn device (cần IP thực)

**Check sau ngày 45:**
- Home screen fetch trips thực từ backend
- Create trip → data persist trong DB thực (verify bằng backend admin panel)
- Auth token refresh tự động khi expire

---

### Ngày 46 — EAS Build + Deploy Preview

**Mục tiêu:** Build APK/IPA thực và deploy Expo Preview.

**Cần làm:**
- [ ] `npm install -g eas-cli` → `eas login` → `eas build:configure`
- [ ] Tạo `eas.json` với profiles:
  ```json
  {
    "build": {
      "development": { "developmentClient": true, "distribution": "internal" },
      "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
      "production": { "distribution": "store" }
    }
  }
  ```
- [ ] `eas build --profile preview --platform android` → download APK
- [ ] Fix `app.json` `bundleIdentifier`/`package`: `"com.road2d.app"`
- [ ] `expo-updates` setup cho OTA updates
- [ ] Update `README.md`: architecture overview, setup guide, screenshot/video

**Kiến thức cần học:**
- EAS Build vs expo build (deprecated): EAS dùng cloud runners, hỗ trợ custom native code
- APK vs AAB: APK để test trực tiếp (sideload), AAB để submit Play Store
- Android keystore: `eas credentials` để manage — không commit keystore lên git
- OTA updates: Expo Updates cho phép update JS bundle không cần resubmit store — chỉ work cho JS changes, không cho native changes

**Check sau ngày 46:**
- APK install được trên Android device thực
- App chạy đúng tất cả features trên real device

---

### Ngày 47 — 🆕 Demo Preparation + Documentation

**Mục tiêu:** Chuẩn bị demo video, presentation materials, và document architecture.

**Cần làm:**

**Demo Script (gợi ý 5-phút demo):**
1. (30s) Open app → Login → Home: giới thiệu R2D concept
2. (45s) ExploreMapScreen → tap Hà Giang Loop route → TripDetails: route discovery
3. (45s) CreateTrip flow → TeamRoster → QR code invite: collaborative planning
4. (60s) LiveTracking: GPS tracking, group members, real-time coverage warning
5. (60s) Safety Briefing: danger zones, time-to-zone prediction
6. (45s) CommunityScreen: social feed, moments trên map
7. (15s) Profile → stats → saved routes: personal tracking

**Cần làm:**
- [ ] Record demo video với `expo-av` hoặc screen recording
- [ ] Tạo demo trip với realistic data: route Hà Giang với real coordinates, 4 mock members, 3 mock moments
- [ ] `ARCHITECTURE.md`: cập nhật đầy đủ — navigation decisions, state management, safety algorithm explanation
- [ ] `README.md`: screenshots, feature list, setup instructions cho dev mới
- [ ] Tạo `docs/SAFETY_ALGORITHM.md`: giải thích chi tiết haversine, distance-to-zone, risk scoring — dùng cho thesis/research writeup
- [ ] Chuẩn bị "Known Limitations" list: honest về những gì chưa làm được (real coverage data, ML, etc.)

**Kiến thức cần học:**
- Demo best practices: luôn có fallback khi demo (pre-loaded data), tránh live API calls trong demo nếu mạng không ổn định
- Architecture diagram: draw.io hoặc Mermaid cho flow diagram
- Research writeup: phân biệt rõ "Confirmed features" vs "Research hypotheses" (như Section 32 trong project context)

**Check sau ngày 47:**
- Demo video 5 phút, smooth, không crash
- `ARCHITECTURE.md` và `docs/SAFETY_ALGORITHM.md` hoàn chỉnh
- Có thể trả lời câu hỏi "Tại sao không dùng ML?" — vì GIS + deterministic algorithms đủ mạnh cho bài toán này

---

## 📋 Checklist Kỹ Năng Sau 47 Ngày

### Phase 0 — Cleanup
- [ ] Fix crashes trước khi code mới
- [ ] Icon system với @expo/vector-icons (offline-ready)
- [ ] Environment config chuẩn (EXPO_PUBLIC_ prefix)
- [ ] Code quality tools (ESLint, Prettier, path aliases)

### TypeScript & Architecture
- [ ] Domain model đầy đủ (Trip, Route, Safety types)
- [ ] Navigation type-safe (không còn `any`)
- [ ] Service layer abstraction

### State & Data
- [ ] Zustand stores (Auth, Trip, Map, Safety)
- [ ] Optimistic UI updates
- [ ] Offline-first với expo-file-system
- [ ] Real API integration (không chỉ mock)

### Maps & Location
- [ ] react-native-maps: MapView, Marker, Polyline, Polygon
- [ ] expo-location: foreground + background
- [ ] Custom brown/earth-tone map style
- [ ] Geo algorithms: haversine, ray casting, point-to-polygon

### Safety (Core Differentiator)
- [ ] Coverage zone GeoJSON visualization
- [ ] Distance-to-zone (real-time)
- [ ] Time-to-zone với speed smoothing
- [ ] Proactive warning system (không reactive)
- [ ] Risk scoring (weighted multi-factor)
- [ ] Group spread monitoring
- [ ] Offline safety data

### Quality
- [ ] Performance ≥ 60fps
- [ ] Error boundaries + retry logic
- [ ] Accessibility labels
- [ ] i18n (vi/en)
- [ ] Unit tests cho safety algorithms
- [ ] EAS Build → real device APK

---

## 🔗 Tài Liệu Tham Khảo

| Tài liệu | URL | Dùng khi nào |
|-----------|-----|--------------|
| Expo Docs v54 | https://docs.expo.dev/versions/v54.0.0/ | **Đọc trước khi dùng bất kỳ Expo package** |
| React Navigation v7 | https://reactnavigation.org/docs/7.x/ | Navigation, typed routes |
| react-native-maps | https://github.com/react-native-maps/react-native-maps | Map APIs, Polygon, Polyline |
| Reanimated v3 | https://docs.swmansion.com/react-native-reanimated/ | Animations (v4 compat) |
| Zustand | https://zustand-demo.pmnd.rs/ | State management |
| react-hook-form | https://react-hook-form.com/ | Form validation |
| OpenRouteService | https://openrouteservice.org/dev/#/api-docs | Free directions API |
| OpenMeteo | https://open-meteo.com/en/docs | Free weather API |
| GeoJSON Spec | https://geojson.org/ | Coverage/danger zone format |
| EAS Build | https://docs.expo.dev/build/introduction/ | Build & Deploy |
| expo-doctor | `npx expo-doctor` | Diagnose config issues |

---

> **⚠️ Rules không được phá vỡ:**
>
> 1. **Đọc docs đúng version** — Expo 54, không phải 57 (trừ khi upgrade)
> 2. **Ngày 1–4 PHẢI hoàn thành trước** khi thêm bất kỳ feature mới — build trên nền lỗi = rủi ro cao
> 3. **Mỗi ngày app phải chạy được** — không có ngày nào "temporarily broken"
> 4. **Safety algorithm ở Ngày 20 là checkpoint** — nếu algorithm không chạy đúng, cần pivot trước Phase 5
> 5. **Real API ở Ngày 45** — không cần backend từ sớm, UI-first development với mock data là đúng
