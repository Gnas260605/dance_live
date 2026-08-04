# 🎭 Roblox TikTok Auto-Dance & Camera Follower

Hệ thống kết nối giữa **TikTok Live Stream** và **Roblox Studio**.
Tự động quét comment từ người xem TikTok Live, tải Avatar Roblox tương ứng, kích hoạt hoạt ảnh nhảy (Dance Animation) và tự động xoay Camera tập trung vào người vừa comment.

---

## 📁 Cấu trúc dự án

```
Auto_dance_Roblox/
├── package.json                   # Khai báo phụ thuộc Node.js
├── server.js                      # Server TikTok Live Connector & REST API
├── scripts/
│   └── test-comment.js            # Script gửi comment giả lập để kiểm thử
└── src/
    ├── shared/
    │   └── AnimationConfig.lua    # Danh sách Animation ID bài nhảy
    ├── server/
    │   └── TikTokDanceManager.server.lua # Script Server trong Roblox Studio
    └── client/
        └── SmoothCameraController.client.lua # Script Client (Camera Lia & HUD)
```

---

## 🚀 Hướng dẫn cài đặt & Chạy hệ thống

### Bước 1: Khởi chạy Node.js Backend Server

1. Mở Terminal tại thư mục dự án và cài đặt dependencies:
   ```bash
   npm install
   ```

2. Khởi chạy Node.js Server:
   ```bash
   npm start
   ```
   *Server sẽ lắng nghe tại `http://localhost:3000`.*

---

### Bước 2: Bật kết nối với kênh TikTok Live của bạn

Có 2 cách để chọn kênh TikTok Live:

#### Cách 1: Sử dụng API POST `/api/connect`
Gửi request HTTP POST để thay đổi Username kênh đang Live:
```bash
curl -X POST http://localhost:3000/api/connect -H "Content-Type: application/json" -d "{\"tiktokUsername\": \"_marinette_dun\"}"
```

#### Cách 2: Thiết lập biến môi trường khi chạy Server
```bash
TIKTOK_USERNAME=_marinette_dun npm start
```

---

### Bước 3: Thêm Scripts vào Roblox Studio

1. Mở **Roblox Studio** và tạo một Place mới (hoặc mở Place có sẵn).
2. **BẬT HTTP REQUESTS**:
   - Vào `Home` > `Game Settings` > `Security`.
   - Chuyển `Allow HTTP Requests` sang **ON**.
   - Nhấn **Save**.
3. **Thêm Script Server**:
   - Tạo 1 `Script` trong `ServerScriptService`.
   - Đặt tên script là `TikTokDanceManager`.
   - Copy toàn bộ nội dung từ file [TikTokDanceManager.server.lua](file:///d:/Individua_Project/Auto_dance_Roblox/src/server/TikTokDanceManager.server.lua) dán vào.
4. **Thêm Script Client (Camera & UI)**:
   - Tạo 1 `LocalScript` trong `StarterPlayer` > `StarterPlayerScripts`.
   - Đặt tên script là `SmoothCameraController`.
   - Copy toàn bộ nội dung từ file [SmoothCameraController.client.lua](file:///d:/Individua_Project/Auto_dance_Roblox/src/client/SmoothCameraController.client.lua) dán vào.

---

## 🧪 Hướng dẫn Test / Giả lập (Không cần Live thật)

1. Nhấn nút **Play (F5)** trong Roblox Studio để bắt đầu test.
2. Mở một Terminal khác tại dự án và chạy script giả lập comment:
   ```bash
   npm run test-comment
   ```
3. Hoặc bạn có thể gửi một comment bất kỳ với tên Roblox mong muốn qua cURL / Postman:
   ```bash
   curl -X POST http://localhost:3000/api/mock-comment -H "Content-Type: application/json" -d "{\"tiktokUsername\": \"nguoi_xem_1\", \"comment\": \"!dance Builderman\"}"
   ```
4. Quan sát Roblox Studio:
   - Nhãn sân khấu `DanceStage` xuất hiện.
   - Avatar người chơi `Builderman` được load đầy đủ phụ kiện.
   - Hoạt ảnh nhảy được phát.
   - Nametag hiển thị tên TikTok & Roblox.
   - **Camera tự động xoay và khép góc mượt mà** tới người vừa comment!

---

## 💡 Tùy chỉnh nâng cao

- **Thay đổi danh sách bài nhảy**: Bạn có thể thêm bớt Animation IDs chuẩn R15 trong [server.js](file:///d:/Individua_Project/Auto_dance_Roblox/server.js) hoặc [AnimationConfig.lua](file:///d:/Individua_Project/Auto_dance_Roblox/src/shared/AnimationConfig.lua).
- **Tốc độ Camera**: Bạn có thể điều chỉnh biến `ORBIT_SPEED` và `CAMERA_DISTANCE` trong [SmoothCameraController.client.lua](file:///d:/Individua_Project/Auto_dance_Roblox/src/client/SmoothCameraController.client.lua) để thay đổi khoảng cách và tốc độ lia của ống kính.
