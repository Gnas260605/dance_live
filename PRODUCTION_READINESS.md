# Hướng dẫn Chuẩn bị & Triển khai Dự án Lên Production (Production Readiness Checklist)

Tài liệu này cung cấp hướng dẫn chi tiết từng bước để đưa hệ thống **Auto Dance Roblox TikTok Live** từ môi trường phát triển (Development) lên vận hành thương mại thực tế (Production) an toàn, ổn định và tự động.

---

## 1. Cấu hình Cơ sở Dữ liệu & Di cư Schema (Database Migration)

Hiện tại dự án sử dụng **Prisma** với cơ sở dữ liệu PostgreSQL. Để vận hành thương mại:

1. **Khởi tạo Database Production:**
   - Sử dụng các nhà cung cấp như **Supabase**, **Neon.tech**, hoặc **AWS RDS PostgreSQL** để đảm bảo khả năng mở rộng và sao lưu tự động.
2. **Chạy Migration:**
   - Trong quá trình triển khai CI/CD hoặc chạy trên server VPS/PaaS, chạy lệnh sau để thiết lập cấu trúc bảng thay vì dùng `prisma db push` (chỉ dùng cho dev):
     ```bash
     npx prisma migrate deploy
     ```
   - Chạy lệnh generate client để đồng bộ hóa mã nguồn Node.js:
     ```bash
     npx prisma generate
     ```

---

## 2. Thiết lập Biến Môi trường (Environment Variables)

Hãy cấu hình các biến môi trường sau trên dịch vụ PaaS (ví dụ: Render, Railway, Fly.io, Heroku) hoặc tệp `.env` bảo mật trên VPS:

### 2.1 Backend (`apps/api`)
| Tên Biến | Mô tả | Giá trị Production đề xuất |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | `postgresql://user:password@host:port/db?sslmode=require` |
| `JWT_SECRET` | Khóa bí mật ký mã Token người dùng | Một chuỗi ngẫu nhiên dài (> 32 ký tự) sinh qua `crypto.randomBytes(32)` |
| `PORT` | Cổng chạy dịch vụ Webcast API | Cổng PaaS tự động cung cấp (thường là `3000` hoặc `3001`) |
| `NODE_ENV` | Môi trường chạy | `production` |
| `EULERSTREAM_API_KEY` | EulerStream API Key để ký chữ ký Live | **BẮT BUỘC** (Lấy miễn phí tại [EulerStream](https://www.eulerstream.com)). Nếu không có, TikTok Live sẽ tự động ngắt kết nối sau 3–5 phút. |

### 2.2 Frontend (`apps/web`)
| Tên Biến | Mô tả | Giá trị Production đề xuất |
|---|---|---|
| `VITE_API_BASE` | Đường dẫn gọi API Backend | Địa chỉ HTTPS của API Server (Ví dụ: `https://api.dance-live.yourdomain.com`) |

---

## 3. Triển khai Ứng dụng Web (Frontend & Backend Deployment)

### 3.1 Backend (Node.js API)
- **Dịch vụ PaaS đề xuất:** Render (Web Service), Railway, Fly.io.
- **Tiến trình khởi động:**
  - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
  - Start Command: `node apps/api/server.js`
- **Tối ưu hóa bảo mật:**
  - Máy chủ đã tích hợp sẵn thư viện **Helmet** để chặn các lỗ hổng HTTP headers.
  - Tích hợp **express-rate-limit** hạn chế spam yêu cầu tấn công DDoS vào endpoint lấy vị trí.

### 3.2 Frontend (React + Vite Dashboard)
- **Dịch vụ tĩnh đề xuất:** Vercel, Netlify.
- **Cấu hình:**
  - Build Command: `npm run build:web`
  - Output Directory: `apps/web/dist`
  - Cấu hình Single Page Application (SPA) routing (chuyển hướng tất cả yêu cầu về `index.html` nếu trang bị tải lại). Đối với Vercel, tạo tệp `vercel.json`:
    ```json
    {
      "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
    }
    ```

---

## 4. Thiết lập Trực tiếp trên Roblox Studio

Để kịch bản Lua [TikTokDanceManager.server.lua](file:///d:/Individua_Project/Auto_dance_Roblox/roblox/server/TikTokDanceManager.server.lua) giao tiếp được với server của bạn:

1. **Bật quyền kết nối mạng (HTTP requests):**
   - Mở game của bạn bằng **Roblox Studio**.
   - Vào tab **Home** -> **Game Settings** -> **Security**.
   - Bật **Allow HTTP Requests** thành **Enabled**.
   - Bật **Enable Studio Access to API Services** (để chạy thử trong Studio).
   - Nhấn **Save**.

2. **Cấu hình Attributes trong Script `TikTokDanceManager`:**
   - Tìm script `TikTokDanceManager` trong Explorer (thường nằm dưới `ServerScriptService`).
   - Ở bảng **Properties** dưới cùng, tìm phần **Attributes**:
     - Đặt `USE_LOCAL` thành `false`.
     - Nhập `API_KEY`: API Key được tạo từ bảng quản trị Dashboard của Creator (khớp với trường `apiKey` trong bảng `User` để định vị đúng phòng live).
     - Nhập `DOMAIN_URL`: Nhập URL máy chủ Backend của bạn (Ví dụ: `https://api.dance-live.yourdomain.com`).

3. **Publish Game:**
   - Nhấn **File** -> **Publish to Roblox** để cập nhật thay đổi lên máy chủ đám mây của Roblox.

---

## 5. Quy trình Kiểm thử Pre-live trước khi Phát Sóng (Livestream Checklist)

Trước mỗi buổi Livestream, Creator nên chạy kiểm tra nhanh qua **Pre-live Checklist** có sẵn trên giao diện Live Control Dashboard:

1. **Kiểm tra trạng thái Roblox Heartbeat:**
   - Bật Roblox game lên (vào chế độ chơi thật hoặc chạy Play test).
   - Kiểm tra xem chấm trạng thái Roblox trên Dashboard có chuyển sang màu xanh lá (**Online**) không.
2. **Gửi bình luận thử nghiệm (Mock Comment):**
   - Sử dụng ô **Quick Simulator** trên Dashboard: Nhập một tên TikTok giả lập và tên Roblox có thật của bạn.
   - Nhấn gửi và kiểm tra xem nhân vật của bạn có được spawn lên sàn và nhảy đúng nhạc không.
3. **Gửi quà thử nghiệm (Mock Gift):**
   - Chọn quà `Rose` hoặc `Galaxy` trong Simulator và nhấn gửi.
   - Quan sát xem hiệu ứng mưa hoa hồng / pháo hoa / đổi màu đèn có kích hoạt đồng loạt trong game không.

---

## 6. Bảo trì & Dọn dẹp Tài nguyên Đám mây (Maintenance & Cleanup)

Hệ thống ghi log streamsession hoạt động liên tục có thể làm đầy ổ cứng/Cơ sở dữ liệu. Đề xuất:

- **Dọn dẹp lịch sử định kỳ:**
  - Thiết lập một Cron Job tự động xóa các bản ghi `GameEvent` đã kết thúc (status = `'ACKED'` hoặc hết hạn `'expiresAt' < NOW`) cũ hơn 24 giờ.
  - Sử dụng lệnh SQL:
    ```sql
    DELETE FROM "GameEvent" WHERE "status" = 'ACKED' OR "expiresAt" < NOW() - INTERVAL '1 day';
    ```
- **Tối ưu hóa kích thước hàng đợi:**
  - Giới hạn kích thước danh sách hàng chờ người chơi nhảy (`maxQueueSize = 50`) trong phần Settings của người dùng để tránh đầy RAM máy chủ API.
