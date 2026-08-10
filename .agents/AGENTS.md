# AI Agent Guidelines & Repository Conventions

Tệp này cung cấp chỉ dẫn và quy tắc bắt buộc cho các trợ lý AI (bao gồm Google Gemini, Claude, Cursor) khi đọc, sửa đổi hoặc cấu trúc lại mã nguồn của dự án này.

---

## 📌 1. Nguyên Tắc Cốt Lõi (Core Principles)

- **Không tạo file nguyên khối (Monolith Prevention):** Tránh kéo dài các tệp chính quá 300 dòng. Khi thêm tính năng mới, hãy tách thành các Module/Helper riêng biệt.
- **Bảo toàn Cấu trúc:** Luôn tôn trọng cấu trúc Monorepo (`apps/api`, `apps/web`, `roblox`). Tránh viết mã ngoài các khu vực này.
- **Kiểm thử trước:** Khi thay đổi các hàm xử lý bình luận hoặc API, luôn tạo hoặc chạy unit test tương ứng trước khi kết luận hoàn thành.

---

## 📁 2. Bản đồ Cấu trúc & Đường dẫn chính

- **Backend (Node.js/Prisma):** [apps/api](file:///d:/Individua_Project/Auto_dance_Roblox/apps/api)
  - REST API Routes: [apps/api/src/backend/routes.js](file:///d:/Individua_Project/Auto_dance_Roblox/apps/api/src/backend/routes.js) (Đang cần được phân rã).
  - Quản lý TikTok Live: [apps/api/src/backend/tiktokManager.js](file:///d:/Individua_Project/Auto_dance_Roblox/apps/api/src/backend/tiktokManager.js).
- **Roblox Luau scripts:** [roblox](file:///d:/Individua_Project/Auto_dance_Roblox/roblox)
  - Roblox Server Script: [roblox/server/TikTokDanceManager.server.lua](file:///d:/Individua_Project/Auto_dance_Roblox/roblox/server/TikTokDanceManager.server.lua) (Cần phân rã thành các Module).
  - Roblox Client: [roblox/client/SmoothCameraController.client.lua](file:///d:/Individua_Project/Auto_dance_Roblox/roblox/client/SmoothCameraController.client.lua).
- **Cơ sở dữ liệu:** [prisma/schema.prisma](file:///d:/Individua_Project/Auto_dance_Roblox/prisma/schema.prisma) (Dùng PostgreSQL làm mặc định).

---

## 🛠️ 3. Quy định Kỹ thuật (Technical Guidelines)

### 3.1 Quy tắc Luau (Roblox Studio Scripts)
- Sử dụng **Rojo** làm cầu nối đồng bộ mặc định.
- Mã nguồn Luau cần tuân thủ cấu trúc dự án `default.project.json`.
- Sử dụng **StyLua** để tự động định dạng mã nguồn (format).
- Sử dụng **Selene** để phân tích cú pháp tĩnh và bắt lỗi cú pháp biến cục bộ (`global` / `local`).
- Luôn kiểm thử logic Luau thông qua framework **TestEZ** bằng cách tạo các tệp `.spec.lua` tại thư mục kiểm thử tương ứng.

### 3.2 Quy tắc Backend (API Server)
- **Port kết nối mặc định:** Sử dụng cổng `3001` cho máy chủ cục bộ (Local development).
- **Database:** Chỉ cấu hình chuỗi kết nối PostgreSQL. Không sử dụng SQLite để tránh lệch pha giữa Dev và Prod.
- **Event Idempotency:** Mọi sự kiện game gửi cho Roblox phải chứa một `eventId` duy nhất và lưu trạng thái `QUEUED` / `DELIVERED` / `ACKED` để tránh gửi lặp khi Roblox lỗi mạng (Rate limit backoff).

---

## 🧪 4. Lệnh kiểm thử nhanh (Verification Commands)

- **Chạy máy chủ backend chế độ Dev:**
  ```bash
  npm run dev:api
  ```
- **Chạy kiểm thử API:**
  ```bash
  node apps/api/test_full.js
  ```
