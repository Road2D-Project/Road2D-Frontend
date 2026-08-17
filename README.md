# 🏍️ R2D Mobile App (Ride to Discover)

R2D Mobile là một ứng dụng di động được xây dựng bằng **React Native** và **Expo**, dành riêng cho cộng đồng đam mê xê dịch, phượt thủ và những người yêu thích khám phá các cung đường ngoạn mục bằng xe máy.

Ứng dụng giúp bạn quản lý lịch trình, khám phá các cung đường mới, theo dõi đồng đội trên bản đồ theo thời gian thực (Live Tracking) và lưu giữ lại những khoảnh khắc tuyệt vời của mỗi chuyến đi.

---

## ✨ Tính năng nổi bật

### 1. 🏠 Màn hình chính (Home) hiện đại & linh hoạt
- **Active Trip Card:** Thẻ thông tin chuyến đi đang diễn ra (VD: *Hà Giang Loop 2024*) nổi bật ở ngay đầu trang với ảnh bìa phong cảnh hùng vĩ, kết hợp cùng hiệu ứng phủ mờ tối màu và tiến độ quãng đường.
- **Danh sách sắp tới:** Các chuyến đi sắp diễn ra (Đà Lạt Sương khói, Tây Bắc, Tà Xùa,...) được thiết kế dưới dạng thẻ trực quan có kèm thời tiết, quãng đường và avatar của đồng đội.
- **Custom FAB Menu:** Nút Floating Action Button (+) có hiệu ứng animation mượt mà. Khi ấn vào, menu nổi lên với các thao tác nhanh: **Tạo chuyến đi mới**, **Nhập mã mời**, và **Quét mã QR**.

### 2. 🗺️ Khám phá cung đường (Explore)
- Tính năng tìm kiếm các cung đường nổi tiếng với đầy đủ thông tin: độ dài, đánh giá (rating), số người đã trải nghiệm.
- Hỗ trợ bản đồ và hướng dẫn định vị.

### 3. 📍 Live Tracking & Bản đồ
- Tích hợp `react-native-maps` để theo dõi vị trí thực tế của bạn và các thành viên trong nhóm trên suốt chuyến đi.
- Hỗ trợ tìm trạm đổ xăng, trạm dừng chân gần nhất.

### 4. 👥 Quản lý đồng đội (Team Roster)
- Quản lý danh sách thành viên trong chuyến đi.
- Dễ dàng mời bạn bè thông qua mã QR hoặc mã mời (Invite Code).

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

Dự án được xây dựng dựa trên các công nghệ và thư viện hiện đại nhất:
- **Core:** [React Native](https://reactnative.dev/) (0.81.5) & [Expo](https://expo.dev/) (v54.0.0)
- **Ngôn ngữ:** TypeScript
- **Điều hướng (Routing):** `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs`
- **Giao diện & UI:**
  - `@expo/vector-icons` (Feather, Ionicons, MaterialCommunityIcons)
  - Layout & Animation với `Animated` core và `react-native-reanimated`
- **Bản đồ:** `react-native-maps`

---

## 📂 Cấu trúc thư mục (Project Structure)

```text
mobile-preview/
├── assets/                  # Fonts, icons, hình ảnh tĩnh (logoapp.png)
├── src/                     # Toàn bộ mã nguồn chính của ứng dụng
│   ├── assets/              # Tài nguyên ảnh tĩnh dùng trong code
│   ├── navigation/          # Cấu hình luồng điều hướng (AppNavigator, TabNavigator)
│   ├── screens/             # Các màn hình chính
│   │   ├── auth/            # Màn hình đăng nhập/đăng ký (LoginScreen)
│   │   ├── home/            # Màn hình chính (HomeScreen, AllUpcomingTrips, ExploreMap)
│   │   ├── map/             # Các màn hình bản đồ (LiveTrackingScreen)
│   │   └── trip/            # Các màn hình tạo & chi tiết chuyến đi (CreateTrip, TeamRoster)
│   └── theme/               # Định nghĩa màu sắc (colors.ts), typography dùng chung
├── App.tsx                  # Điểm khởi chạy của ứng dụng (Entry point)
├── app.json                 # Cấu hình Expo project
├── package.json             # Danh sách thư viện và scripts
└── README.md                # Tài liệu dự án (bạn đang đọc)
```

---

## 🚀 Hướng dẫn cài đặt và chạy dự án

### Yêu cầu môi trường
- Đã cài đặt **Node.js** (Khuyên dùng v18+).
- Đã cài đặt ứng dụng **Expo Go** trên điện thoại iOS/Android.

### Các bước khởi chạy
1. **Clone hoặc tải mã nguồn về máy.**
2. **Cài đặt các gói thư viện (Dependencies):**
   Mở terminal tại thư mục gốc của dự án và chạy lệnh:
   ```bash
   npm install
   ```
3. **Khởi động server Expo:**
   Chạy lệnh sau để bật server:
   ```bash
   npx expo start
   ```
   *(hoặc `npm start`)*
4. **Trải nghiệm ứng dụng:**
   - Màn hình terminal sẽ hiện ra một mã QR.
   - **Với iOS:** Mở ứng dụng Camera gốc, quét mã QR và chọn mở bằng Expo Go.
   - **Với Android:** Mở ứng dụng Expo Go và chọn tính năng "Scan QR Code" để quét.
   - Hoặc ấn phím `a` trên terminal để chạy máy ảo Android (Android Emulator), ấn `i` để chạy iOS Simulator (yêu cầu máy Mac).

---

## 🎨 Điểm nhấn về UI/UX (Đã nâng cấp)
- **Ảnh bìa chân thực:** Sử dụng hình ảnh chất lượng cao từ Unsplash làm nền cho các thẻ chuyến đi, phủ một lớp `overlay rgba` giúp nổi bật văn bản trắng và icon.
- **Animation Menu:** Nút FAB được tinh chỉnh để khi bật/tắt, các tuỳ chọn (Quét QR, Nhập mã, Chuyến đi mới) sẽ trượt lên tuần tự một cách mượt mà (staggered animation), không cần dùng Modal trắng thô cứng.

---

*Made with ❤️ cho cộng đồng phượt thủ Việt Nam.*
