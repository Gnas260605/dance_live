# Nhật ký Tiến độ Dự án Auto Dance Roblox TikTok Live

Tệp này ghi nhận tiến trình phát triển dự án, các lỗi đã được sửa đổi và kế hoạch nâng cấp tiếp theo của dự án sau mỗi phiên làm việc.

---

## 📅 Trạng thái Hiện tại (10/08/2026)

### ✅ Các đầu việc đã hoàn thành
1. **Sửa lỗi nhận diện sai nhân vật (extractRobloxUsername):**
   - Thay thế thuật toán Regex cũ bằng thuật toán phân tích chuỗi (Token-based) thông minh hơn trong [tiktokManager.js](file:///d:/Individua_Project/Auto_dance_Roblox/apps/api/src/backend/tiktokManager.js).
   - Đã kiểm tra và giải quyết triệt để lỗi khi người dùng nhập câu tự nhiên chứa nhiều từ khóa (ví dụ: *"nick roblox minh la hieu_123"*, *"tên roblox builderman"*, *"acc rbx..."*). Bộ lọc mới sẽ lọc sạch từ tiếng Việt thông dụng và chỉ lấy ra đúng Username Roblox của người bình luận.
   - Thêm bộ lọc chống nhận diện nhầm các từ khóa lệnh làm tên nhân vật.

2. **Nâng cấp đồ họa và hiệu ứng sân khấu (Map/VFX/Lighting):**
   - Chỉnh sửa [TikTokDanceManager.server.lua](file:///d:/Individua_Project/Auto_dance_Roblox/roblox/server/TikTokDanceManager.server.lua) để tự động đưa thời gian game về ban đêm (`Lighting.ClockTime = 20`) giúp hiệu ứng ánh sáng rực rỡ hơn.
   - Tự động tạo và tối ưu hóa các hiệu ứng đồ họa hậu kỳ trong game: **BloomEffect** (làm ánh sáng Neon tỏa ánh hào quang) và **ColorCorrectionEffect** (tăng độ tương phản và bão hòa màu sắc sân khấu).
   - Tích hợp hệ thống sàn nhảy Neon dạng lưới 4x4 tự động chạy hiệu ứng sóng màu cầu vồng động (HSV Spectrum Cycling) chéo nhau cực kỳ bắt mắt.
   - Thiết lập cơ chế tự động tạm ngừng đổi màu sàn nhảy khi có hiệu ứng Tween Lighting từ quà tặng TikTok và khôi phục lại khi kết thúc hiệu ứng.
   - **Thêm Spectators (Khán giả):** Spawns tự động 5 hình nhân khán giả (audience models) đứng trước sân khấu cầm thanh phát sáng (Glow Stick) Neon vẫy cổ vũ theo nhịp động lực học.

---

## 🛠️ Hướng dẫn cấu hình Map trong Roblox Studio (Thủ công cho đẹp hơn nữa)

Để map đạt chất lượng đồ họa tốt nhất trên luồng livestream, bạn nên cấu hình thủ công các thông số sau trong **Roblox Studio**:

1. **Thêm hiệu ứng Post-Processing:**
   - Trong Explorer, click chuột phải vào **Lighting** -> **Insert Object** -> Thêm **BloomEffect**, **ColorCorrectionEffect**, và **SunRaysEffect**.
   - Cấu hình thuộc tính của `BloomEffect`:
     - `Intensity = 1.8`
     - `Size = 24`
     - `Threshold = 0.3`
   - Cấu hình thuộc tính của `ColorCorrectionEffect`:
     - `Contrast = 0.15`
     - `Saturation = 0.25`

2. **Sử dụng vật liệu Neon:**
   - Khi thiết kế sân khấu hoặc loa đài, hãy đổi Material của các khối trang trí thành `Neon` và đặt Color là các màu sáng rực (Hồng, Xanh Cyan, Vàng chanh) để chúng tự động phát sáng qua camera.

---

## 🚀 Kế hoạch phát triển tiếp theo (Next Steps)
- [ ] **Tương tác Pháo hoa / Cột lửa rìa sân khấu:** Viết thêm Script kích hoạt hiệu ứng hạt lửa phun trào từ 4 góc sàn nhảy khi nhận được các món quà lớn (ví dụ: Fireworks, Dragon).
- [ ] **Bảng xếp hạng (Leaderboard HUD):** Hiển thị bảng vinh danh những người tặng quà nhiều nhất (Top Gifters) ngay góc màn hình game Roblox.
- [ ] **Hệ thống Camera động nâng cao:** Chuyển đổi mượt mà giữa các góc máy: Wide Shot (toàn cảnh), Close-up (cận cảnh nhân vật chính), và Orbital (xoay vòng quanh sân khấu) để luồng stream không bị nhàm chán.
