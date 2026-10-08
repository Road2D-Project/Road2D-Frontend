# 🗺️ R2D — FrontEnd Tracking

> Phạm vi: **Đăng nhập/Đăng ký · Tạo Trip · Giả lập đi Trip thật**
> Dựa trên hiện trạng code (quét ngày 04/10/2026). Chỉ liệt kê việc **còn phải làm**.
>
> **Đã xong (không đưa vào bảng):** bỏ expo-router · thay icons8 bằng vector-icons · cài axios + `EXPO_PUBLIC_API_URL` · fix import `TextInput` · UI kit (`Button`, `Input`, `Chip`, `BottomSheet`, `Skeleton`, `Avatar`, `Card`…) · `ErrorBoundary`/`LoadingScreen`/`EmptyState`/`useAsync` · `types/navigation.ts` · `tokenStorage` (SecureStore) · `authService` (login thật + phone/OTP mock) · UI Login (landing → SĐT → OTP → tạo mật khẩu) · UI CreateTrip 4 bước (mock) · UI LiveTracking (Goong map + bottom sheet, data tĩnh).

| Genre | Detailed Description | Note | Deadline | Priority Level | Hoàn thành |
|---|---|---|---|---|---|
| Core | Cài Zustand và dựng store `auth` / `trip` / `simulation` (hiện `src/store/slices` đang rỗng); thêm types domain `Trip`, `Route`, `Stopover`, `TripEvent`, `User` | Types hiện chỉ có navigation; `MemberStatus`/`Waypoint` đang nằm trong file mock | 07/10/2026 | 🔴 Critical | ☑ |
| Core | Bổ sung `tripService`/`routeService` (mock có delay) và nâng interceptor axios: 401 → refresh token → retry/logout | Interceptor hiện chỉ gắn token, chưa xử lý lỗi | 09/10/2026 | 🟠 High | ☑ |
| Core | Chuyển các `navigation: any` / `useNavigation<any>` sang type từ `types/navigation.ts`, thêm params (`tripId`, `routeId`) vào `RootStackParamList` | Còn ở ~8 screen | 10/10/2026 | 🟡 Medium | ☑ |
| Auth | Auth guard trong `AppNavigator`: tách `AuthStack`/`MainStack`, hydrate token khi mở app (auto-login), logout reset store | Hiện `initialRouteName="Login"` luôn, token chưa được đọc lại | 12/10/2026 | 🔴 Critical | ☑ |
| Auth | Hoàn thiện luồng quên mật khẩu (hiện chỉ `Alert` "đang phát triển") và đăng nhập Google (nút đang disable) | Tái sử dụng màn OTP | 15/10/2026 | 🟠 High | ☐ |
| Auth | Chuẩn hoá form: OTP 6 ô, validate SĐT/mật khẩu mạnh, khoá sau nhiều lần sai; thêm màn ProfileSetup (avatar, loại xe, SĐT khẩn cấp) sau đăng ký | Tách `LoginScreen` 730 dòng thành các màn nhỏ | 17/10/2026 | 🟡 Medium | ☐ |
| Trip-Create | Nối wizard `CreateTripScreen` với store/service thay cho `MOCK_ROUTES`/`MOCK_FRIENDS`/`MOCK_INVITE_CODE`; submit tạo trip thật và đi tiếp `TeamRoster` | Hiện bước 3 chỉ `setStep(3)` | 20/10/2026 | 🔴 Critical | ☑ |
| Trip-Create | Form thật: date-time picker, validate (react-hook-form + zod), pre-fill route từ `TripDetails`, nhận route vẽ từ `CreateRoute` | Cài `@react-native-community/datetimepicker`; ngày đang hardcode | 22/10/2026 | 🟠 High | ☐ |
| Trip-Create | Điểm dừng + vai trò thành viên (Leader/Sweeper/Rider) và vẽ route bằng `MapView`/polyline thật cho `CreateRoute` | Đã cài `@mapbox/polyline` nhưng chưa dùng | 24/10/2026 | 🟡 Medium | ☐ |
| Trip-Lobby | `TeamRoster` làm thật: QR (`react-native-qrcode-svg`), mã/link mời, deep link `road2d://join`, luồng tham gia bằng mã/QR, nút "Bắt đầu chuyến đi" | QR hiện chỉ là `Alert`; scheme trong `app.json` cần đổi | 26/10/2026 | 🟠 High | ☑ |
| Simulation | Viết `geoUtils` (haversine, bearing, project điểm lên polyline, point-in-polygon) và `SimulationEngine` chạy dọc polyline với tốc độ/heading, x1–x50 | Chưa có `expo-location`; tách khỏi UI để test được | 29/10/2026 | 🔴 Critical | ☑ |
| Simulation | Nối `LiveTrackingScreen` với engine: vị trí/tiến độ/ETA realtime thay cho `MOCK_TRIP`; truyền marker vào WebView qua `postMessage` thay vì dựng lại HTML | HTML hiện build 1 lần từ data tĩnh; panel Play/Pause/tốc độ | 01/11/2026 | 🔴 Critical | ☑ |
| Simulation | Bot thành viên chạy theo đoàn, sinh sự kiện: tới trạm, lệch tuyến, đoàn tách xa, mất sóng — cập nhật trạng thái trong list | Tái dùng `MemberStatus`/`STATUS_COLORS` | 03/11/2026 | 🟠 High | ☐ |
| Safety | SOS thật (giữ 3s, đếm ngược huỷ, gửi vị trí cho đoàn) và cảnh báo vùng mất sóng; nút "Đã tới Trạm" cập nhật tiến độ | Hiện SOS chỉ là `Alert` 4 nút | 05/11/2026 | 🟠 High | ☐ |
| Simulation | Kết thúc chuyến → màn Trip Summary (km, thời gian, timeline sự kiện), lưu lịch sử vào Profile; lưu/khôi phục phiên khi kill app | Cần status `ACTIVE`/`COMPLETED` trong store | 07/11/2026 | 🟡 Medium | ☐ |
| Testing | Unit test `geoUtils` + `SimulationEngine`; chạy thử full flow Đăng ký → Tạo trip → Giả lập tới đích trên Android/iOS | Chưa có framework test (cài Jest) | 08/11/2026 | 🟠 High | ☐ |
