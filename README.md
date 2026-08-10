# 🎭 Roblox TikTok Auto-Dance & Camera Follower (Monorepo)

Hệ thống kết nối thời gian thực giữa **TikTok Live Stream** và **Roblox Studio**.
Tự động quét bình luận từ người xem TikTok Live, tải Avatar Roblox tương ứng, kích hoạt hoạt ảnh nhảy (Dance Animation) và tự động điều khiển camera tập trung vào vũ công.

---

## 📁 Cấu trúc thư mục Monorepo

```text
Auto_dance_Roblox/
├── apps/
│   ├── api/                      # Node.js API Backend (Express + Prisma)
│   │   ├── server.js             # Entrypoint khởi chạy API
│   │   ├── src/backend/
│   │   │   ├── routes.js         # API Endpoints (Roblox, Dashboard)
│   │   │   └── tiktokManager.js  # Lắng nghe bình luận và quà TikTok
│   │   └── test_full.js          # Script chạy bộ kiểm thử API
│   └── web/                      # Giao diện Web Dashboard (React + Vite + TS)
├── roblox/                       # Mã nguồn Roblox Luau (đồng bộ qua Rojo)
│   ├── server/
│   │   └── TikTokDanceManager.server.lua  # Script quản lý sân nhảy chính
│   ├── client/
│   │   ├── SmoothCameraController.client.lua # Script camera xoay theo vũ công
│   │   └── TikTokGiftEffectController.client.lua # Script chạy hiệu ứng hạt & âm thanh quà
│   └── shared/                   # Module chia sẻ (ProceduralDance)
├── prisma/                       # Cấu hình Cơ sở dữ liệu PostgreSQL (schema.prisma)
├── default.project.json          # Cấu hình đồng bộ dự án Rojo
└── rojo.exe                      # Binary Rojo chạy đồng bộ code vào Studio
```

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### Bước 1: Cài đặt dependencies toàn hệ thống
Mở terminal ở thư mục gốc của dự án và cài đặt:
```bash
npm install
```

### Bước 2: Thiết lập biến môi trường
Sao chép tệp cấu hình mẫu và chỉnh sửa thông tin kết nối PostgreSQL cùng các API Keys của bạn:
```bash
cp .env.example .env
```

### Bước 3: Khởi chạy API Backend (Dev Server)
Khởi chạy dịch vụ REST API trên cổng mặc định `3001`:
```bash
npm run dev:api
```

### Bước 4: Khởi chạy Web Dashboard
Khởi chạy giao diện quản trị React ở cổng `5173`:
```bash
npm run dev:web
```

---

## 🔌 Đồng bộ hóa mã nguồn vào Roblox Studio (Rojo)

Dự án đã tích hợp sẵn **Rojo** để đồng bộ trực tiếp các tệp Luau trong thư mục `roblox/` vào Roblox Studio:

1. Chạy dịch vụ Rojo Server trên máy của bạn:
   ```powershell
   .\rojo.exe serve
   ```
2. Mở **Roblox Studio** và mở trải nghiệm game của bạn.
3. Cài đặt plugin Rojo trong Studio, mở panel Rojo và nhấn **Connect**.
4. Cấu trúc thư mục sẽ tự động được ánh xạ:
   - `roblox/server` -> `ServerScriptService.TikTokDanceManager`
   - `roblox/client` -> `StarterPlayer.StarterPlayerScripts`
   - `roblox/shared` -> `ReplicatedStorage`

*Đảm bảo bạn đã bật **Allow HTTP Requests** trong Game Settings -> Security của Roblox Studio để game có thể kết nối đến `http://localhost:3001`.*

---

## 🧪 Giả lập Độc lập (Không cần Live thật)

Bạn có thể dễ dàng kiểm thử hệ thống mà không cần bắt đầu một phiên phát trực tiếp thật trên TikTok:

1. Mở giao diện **Web Dashboard** (`http://localhost:5173`).
2. Vào phần **Live Control** / **Quick Simulator**.
3. Nhập một tên tài khoản Roblox thật và nhấn gửi để giả lập người xem gõ lệnh nhảy.
4. Trình giả lập sẽ tự động chuyển yêu cầu đến backend, cập nhật hàng chờ và ra lệnh cho vũ công trong Roblox Studio spawn và nhảy ngay lập tức!
