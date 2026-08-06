# Endpoint Inventory (Phase 0)

Bản lưu trữ danh sách các API endpoints hiện tại của dự án Dance Live trước khi tiến hành rebuild kiến trúc monorepo.

---

## 1. Authentication Endpoints

Tất cả các route này được cấu hình với rate limit (`authLimiter`) để chống brute-force.

* **POST `/api/auth/register`**
  * **Chức năng**: Đăng ký tài khoản creator mới.
  * **Payload**: `{ name, email, password }`
  * **Response**: `{ success: true, token, user: { id, name, email, apiKey, planTier } }`

* **POST `/api/auth/login`**
  * **Chức năng**: Đăng nhập tài khoản.
  * **Payload**: `{ email, password }`
  * **Response**: `{ success: true, token, user: { id, name, email, apiKey, planTier } }`

* **GET `/api/auth/me`**
  * **Chức năng**: Lấy thông tin user đăng nhập hiện tại từ JWT Token.
  * **Headers**: `Authorization: Bearer <token>`
  * **Response**: `{ success: true, user: { id, name, email, apiKey, planTier } }`

---

## 2. Roblox Bridge Endpoints (Được Roblox Client/Server Lua gọi)

* **GET `/api/v1/streamer/:apiKey/current-player`**
  * **Chức năng**: Roblox Server poll thông tin của Dancer đang active, bài nhạc, điệu nhảy hiện tại, trạng thái xác thực điệu nhảy và thông số hiển thị overlay.
  * **Response**: `{ success: true, player: { id, robloxUsername, ... }, queueLength, currentMusicId, selectedDanceId, ... }`

* **GET `/api/current-player`**
  * **Chức năng**: Alias/Fallback cho endpoint `/current-player` ở trên sử dụng API key trong query params.
  * **Params**: `?apiKey=demo-api-key-sg-music`

* **GET `/api/v1/streamer/:apiKey/game-events`**
  * **Chức năng**: Roblox Server poll các game events (quà tặng hiệu ứng sân khấu) chưa được phân phát (`QUEUED`).
  * **Response**: `{ success: true, events: [...], count, timestamp }`

* **POST `/api/v1/streamer/:apiKey/game-events/:eventId/ack`**
  * **Chức năng**: Roblox Server gửi phản hồi xác nhận (ACK) đã thực thi xong sự kiện để xóa sự kiện khỏi hàng đợi.
  * **Payload**: `{ success, error }`
  * **Response**: `{ success: true, eventId, status }`

* **POST `/api/v1/streamer/:apiKey/heartbeat`**
  * **Chức năng**: Roblox gửi tín hiệu duy trì kết nối (heartbeat) để dashboard biết Roblox server đang hoạt động.
  * **Payload**: `{ placeId, jobId, scriptVer }`
  * **Response**: `{ success: true, isOnline: true }`

* **POST `/api/v1/streamer/:apiKey/dance-status`**
  * **Chức năng**: Roblox Client báo cáo lại trạng thái nhảy của Dancer (đã bắt đầu nhảy hay chưa).
  * **Payload**: `{ playerId, robloxUsername, danceId, danceStyle, success, mode, message }`
  * **Response**: `{ success: true, verification }`

---

## 3. Dashboard API Endpoints (Được Web UI gọi)

* **GET `/api/v1/dashboard/status`**
  * **Chức năng**: Trả về toàn bộ trạng thái hiện tại của workspace: TikTok live state, hàng chờ playerQueue, Roblox heartbeat, logs và chuẩn đoán.
  * **Response**: `{ success: true, user: {...}, tenantStatus: {...} }`

* **POST `/api/v1/dashboard/connect-tiktok`**
  * **Chức năng**: Bắt đầu kết nối tới TikTok Live chat stream.
  * **Payload**: `{ tiktokUsername }`
  * **Response**: `{ success: true, tiktokUsername, isConnected, message }`

* **POST `/api/v1/dashboard/disconnect-tiktok`**
  * **Chức năng**: Ngắt kết nối tới TikTok Live.
  * **Response**: `{ success: true, isConnected: false, message }`

* **GET `/api/v1/dashboard/event-mappings`**
  * **Chức năng**: Lấy danh sách mapping cấu hình quà TikTok sang hiệu ứng Roblox.
  * **Response**: `{ success: true, eventMappings: [...] }`

* **POST `/api/v1/dashboard/event-mappings`**
  * **Chức năng**: Thêm mapping mới.
  * **Payload**: Event mapping object.

* **PUT `/api/v1/dashboard/event-mappings/:id`**
  * **Chức năng**: Cập nhật thông tin mapping.
  
* **DELETE `/api/v1/dashboard/event-mappings/:id`**
  * **Chức năng**: Xóa mapping.

* **POST `/api/v1/dashboard/event-mappings/:id/test`**
  * **Chức năng**: Giả lập sự kiện quà để test tính đúng đắn của mapping.

* **GET `/api/v1/dashboard/actions`** / **POST** / **PUT** / **DELETE**
  * **Chức năng**: Thư viện hành động của Roblox (Mưa hoa, đèn sân khấu, v.v.).

* **GET `/api/v1/dashboard/events`**
  * **Chức năng**: Lịch sử sự kiện game và hàng đợi gameEventQueue.

* **POST `/api/v1/dashboard/events/:eventId/retry`**
  * **Chức năng**: Gửi lại/Replay một sự kiện đã xảy ra trong quá khứ.

* **POST `/api/v1/dashboard/preflight`**
  * **Chức năng**: Chạy chẩn đoán trước livestream (API, TikTok Connection, Heartbeat, Sound engine...).

* **POST `/api/v1/dashboard/emergency-stop`**
  * **Chức năng**: Dừng khẩn cấp, xóa sạch hàng đợi nhảy và các sự kiện game đang chờ.

* **POST `/api/v1/dashboard/music`**
  * **Chức năng**: Thay đổi nhạc đang phát tức thì.
  * **Payload**: `{ name, musicId }`

* **GET `/api/v1/dashboard/music-library`** / **POST** / **DELETE**
  * **Chức năng**: Thư viện nhạc cá nhân của streamer.

* **GET `/api/v1/dashboard/dance`** / **POST** / **DELETE**
  * **Chức năng**: Điệu nhảy cá nhân và điệu nhảy hệ thống.

* **POST `/api/v1/dashboard/dance/auto-fetch-roblox`**
  * **Chức năng**: Tự động cào danh sách animation của tài khoản Roblox hoặc chi tiết của một Animation ID từ Roblox API.
  * **Payload**: `{ input, setActive }`

* **POST `/api/v1/dashboard/overlay`**
  * **Chức năng**: Cấu hình tiêu đề và màu sắc chủ đạo của stream overlay.
  * **Payload**: `{ overlayTitle, overlayColor }`

* **POST `/api/v1/dashboard/settings`**
  * **Chức năng**: Cấu hình cài đặt nâng cao như thời gian nhảy tối đa của một dancer.
  * **Payload**: `{ danceDuration }`

* **POST `/api/v1/dashboard/mock-comment`**
  * **Chức năng**: Giả lập comment chat từ TikTok.
  * **Payload**: `{ tiktokUsername, comment, isVIP }`

* **POST `/api/v1/dashboard/mock-gift`**
  * **Chức năng**: Giả lập tặng quà TikTok.
  * **Payload**: `{ tiktokUsername, giftName, giftId, repeatCount, diamondCount }`

* **POST `/api/v1/dashboard/clear-queue`**
  * **Chức năng**: Xóa sạch hàng đợi Dancer.

* **POST `/api/v1/dashboard/skip-dancer`**
  * **Chức năng**: Bỏ qua Dancer hiện tại, chuyển sang Dancer tiếp theo trong hàng chờ.

---

## 4. Health & System Check Endpoints (New in Phase 0)

* **GET `/api/v1/health/live`**
  * **Chức năng**: Cho Render/Load balancer biết ứng dụng Express Node.js có đang sống.
  * **Response**: `{ status: "UP", timestamp }`

* **GET `/api/v1/health/ready`**
  * **Chức năng**: Cho biết ứng dụng có thể nhận request thật chưa (kết nối database thành công).
  * **Response**: `{ status: "UP", timestamp, checks: { database: "CONNECTED" } }`
