Bạn là Senior Full-stack Engineer, SaaS Product Designer và QA Engineer. Hãy trực tiếp kiểm tra, nâng cấp và hoàn thiện dự án hiện tại thành một ứng dụng production-ready.

# 1. BỐI CẢNH SẢN PHẨM

Tên sản phẩm: S&G Music Commercial SaaS Platform.

Mục đích:

- Kết nối với TikTok LIVE.
- Nhận comment theo cú pháp `!dance RobloxUsername`.
- Xếp người xem vào hàng đợi.
- Gửi dữ liệu sang Roblox để tạo avatar R15.
- Phát dance animation.
- Điều khiển camera Roblox/OBS tập trung vào dancer.
- Quản lý Music Library, Dance Emotes, Stream Overlay, API Keys, Studio Setup, Analytics và Logs.

Ảnh đính kèm là giao diện hiện tại. Hãy dùng ảnh để nhận diện những vấn đề đang tồn tại, nhưng phải kiểm tra toàn bộ source code trước khi quyết định thay đổi.

# 2. NGUYÊN TẮC LÀM VIỆC BẮT BUỘC

1. Trước tiên, hãy đọc toàn bộ cấu trúc dự án và xác định:
   - Framework frontend/backend.
   - Entry points.
   - Routing.
   - State management.
   - API hiện có.
   - Database hoặc cơ chế lưu trữ.
   - TikTok connector.
   - Queue manager.
   - Roblox integration.
   - Authentication.
   - Các biến môi trường.
   - Scripts build, test và start.

2. Không được viết lại toàn bộ dự án khi chưa cần thiết.

3. Không xóa hoặc làm hỏng chức năng đang chạy.

4. Giữ tương thích với API hiện tại. Nếu bắt buộc thay đổi contract, phải cập nhật đồng bộ frontend, backend, tests và tài liệu.

5. Không tạo nút, biểu đồ hoặc số liệu giả chỉ để làm đẹp giao diện.

6. Mọi control phải:
   - Có chức năng thật; hoặc
   - Hiển thị rõ `Coming soon` và bị disable.

7. Không hard-code API key, mật khẩu, token hoặc URL production.

8. Không tự bịa Animation ID, TikTok credential hoặc dữ liệu Roblox.

9. Tất cả request bất đồng bộ phải có:
   - Loading state.
   - Success state.
   - Empty state.
   - Error state.
   - Timeout.
   - Retry hợp lý.

10. Sau mỗi nhóm thay đổi, phải chạy build, lint và test phù hợp. Tự sửa lỗi trước khi báo cáo.

11. Nếu repository đang có thay đổi của người dùng, phải giữ nguyên các thay đổi không liên quan.

# 3. GIAI ĐOẠN AUDIT TRƯỚC KHI SỬA

Trước khi chỉnh code, hãy tạo một kế hoạch ngắn gồm:

- Kiến trúc hiện tại.
- Những chức năng đã hoạt động thật.
- Những chức năng mới chỉ là giao diện hoặc mock.
- Lỗi kỹ thuật đang tồn tại.
- Rủi ro bảo mật.
- Vấn đề UX/UI.
- Các file dự kiến sửa.
- Các dependency cần thêm và lý do.

Sau đó bắt đầu triển khai ngay. Chỉ hỏi tôi khi thiếu một lựa chọn có thể làm thay đổi lớn kiến trúc hoặc cần credential bên ngoài. Với những quyết định UI thông thường, hãy tự chọn phương án tốt nhất.

# 4. ĐỊNH HƯỚNG THIẾT KẾ

Thiết kế lại toàn bộ ứng dụng theo phong cách:

- Modern dark SaaS dashboard.
- Music-tech và livestream control center.
- Cao cấp, sạch, rõ ràng, không giống giao diện AI tạo hàng loạt.
- Không lạm dụng neon, gradient, glow hoặc emoji.
- Sử dụng icon nhất quán từ một icon library.
- Ưu tiên khả năng đọc và tốc độ thao tác khi đang livestream.
- Phù hợp màn hình desktop dùng với OBS, nhưng vẫn responsive trên tablet và mobile.
- Không để khoảng trống lớn vô nghĩa như giao diện hiện tại.

Bảng màu đề xuất:

- App background: `#070A12`.
- Sidebar/surface: `#0D111C`.
- Card surface: `#121827`.
- Border: `#253047`.
- Primary accent: cyan hoặc electric blue.
- Secondary accent: magenta dùng tiết chế.
- Success: green.
- Warning: amber.
- Danger: red.
- Text primary: gần trắng.
- Text secondary: blue-gray.

Thiết lập design tokens cho:

- Colors.
- Typography.
- Spacing.
- Radius.
- Shadows.
- Z-index.
- Motion duration.
- Breakpoints.

Không rải mã màu và kích thước tùy ý khắp component.

# 5. APP SHELL MỚI

Chuyển giao diện thành một dashboard có cấu trúc rõ ràng:

## Desktop

- Sidebar trái có thể thu gọn.
- Logo và tên sản phẩm.
- Workspace/plan.
- Các nhóm điều hướng.
- Header trên cùng.
- Trạng thái hệ thống.
- Notification.
- Account menu.
- Main content có chiều rộng và spacing nhất quán.

Navigation:

- Overview
- Live Control
- Dancer Queue
- Music Library
- Dance Emotes
- Stream Overlay
- Roblox Studio
- API & Integrations
- Analytics
- Activity Logs
- Settings

## Mobile/tablet

- Sidebar chuyển thành drawer.
- Các nút chính không bị quá nhỏ.
- Table chuyển thành card hoặc horizontal scroll hợp lý.
- Không vỡ layout ở 375px, 768px, 1024px và màn hình desktop lớn.

# 6. LIVE CONTROL CENTER

Đây là trang quan trọng nhất và phải ưu tiên hoàn thiện.

## A. Live session control

Hiển thị:

- TikTok Unique ID.
- Trạng thái `Disconnected`, `Connecting`, `Live`, `Reconnecting`, `Error`.
- Room ID nếu có.
- Thời gian đã kết nối.
- Số comment nhận được.
- Lần nhận sự kiện cuối cùng.
- Nút Connect.
- Nút Disconnect.
- Nút Reconnect.
- Nút Refresh status.

Yêu cầu:

- Validate Unique ID.
- Không cho Connect lặp khi đang kết nối.
- Confirm trước khi Disconnect khi đang Live.
- Hiển thị lỗi có nội dung rõ ràng.
- Không dùng `alert()` mặc định của trình duyệt.
- Dùng toast và inline error.

## B. Active dancer

Hiển thị:

- Roblox avatar thumbnail nếu dữ liệu có sẵn.
- Roblox username.
- TikTok display name/username.
- Dance animation hiện tại.
- Thời gian còn lại.
- Progress bar.
- Trạng thái spawn/avatar/animation/camera.
- Nút Skip.
- Nút Replay.
- Nút Stop.
- Nút Focus Camera.

Khi chưa có dancer, hiển thị empty state có hướng dẫn gửi:

`!dance RobloxUsername`

## C. Dancer queue

Hiển thị danh sách theo FIFO:

- Vị trí.
- TikTok user.
- Roblox username.
- Trạng thái.
- Thời gian chờ.
- Nguồn: TikTok hoặc Test.
- Action: promote, retry, remove.

Thêm:

- Pause/resume queue.
- Clear queue có confirm.
- Queue capacity.
- Drag-and-drop chỉ triển khai nếu backend hỗ trợ reorder thật.
- Không được cập nhật queue theo cách gây nhấp nháy toàn bộ giao diện.

## D. Quick test

Thay các nút test chung chung bằng một panel rõ ràng:

- TikTok username giả lập.
- Roblox username.
- Loại test.
- Test normal comment.
- Test VIP.
- Test invalid username.
- Test queue overflow.
- Test connector error.

Test Mode phải được đánh dấu rõ để tránh nhầm với dữ liệu Live thật.

# 7. MUSIC LIBRARY

Hoàn thiện trang Music Library:

- Search.
- Filter.
- Sort.
- Pagination hoặc virtualization.
- Upload audio nếu backend hỗ trợ.
- Track title.
- Artist.
- Duration.
- File size.
- Status.
- Preview/play/pause.
- Volume.
- Assign dance.
- Edit metadata.
- Delete có confirm.

Không tự tạo upload giả. Nếu API upload chưa tồn tại, hãy xây API tương ứng hoặc disable chức năng và ghi rõ lý do.

# 8. DANCE EMOTES

- Danh sách dance animations.
- Animation name.
- Roblox Animation ID.
- Rig type R15/R6.
- Duration.
- Loop.
- Enabled/disabled.
- Preview metadata.
- Add/edit/delete.
- Validate Animation ID.
- Random selection weight.
- Default fallback animation.
- Không tự bịa ID.

Mặc định ưu tiên R15 nhưng cấu trúc phải có khả năng mở rộng R6.

# 9. STREAM OVERLAY & BRANDING

Tạo trang cấu hình overlay:

- Channel logo.
- Primary/secondary colors.
- Font.
- Nametag style.
- Queue widget.
- Now dancing widget.
- Alert style.
- Safe area.
- Preview tỷ lệ 16:9.
- Copy Browser Source URL nếu backend đã hỗ trợ.
- Nút reset và save.

Preview phải sử dụng đúng cấu hình thật, không phải một hình tĩnh không liên kết state.

# 10. ROBLOX STUDIO & API SETUP

Tạo trang hướng dẫn setup theo từng bước:

1. Bật Allow HTTP Requests.
2. Nhập public HTTPS API URL.
3. Cấu hình API/session token.
4. Cài Server Scripts.
5. Cài Client Camera Script.
6. Tạo RemoteEvents.
7. Cấu hình operator user ID.
8. Test connection.
9. Kiểm tra lần heartbeat cuối.

Hiển thị:

- Backend health.
- Roblox heartbeat.
- Last poll.
- Current server/job ID nếu có.
- API latency.
- Copy buttons.
- Ẩn/mask secret mặc định.
- Regenerate/revoke key phải có confirm.

Không sử dụng `localhost` làm URL production.

# 11. ANALYTICS & LOGS

Analytics chỉ dùng dữ liệu thật:

- Total comments.
- Valid dance requests.
- Invalid usernames.
- Completed dances.
- Failed avatar loads.
- Average wait time.
- Queue peak.
- Connector reconnect count.
- Events theo thời gian.

Nếu chưa có dữ liệu, dùng empty state; không tạo số liệu demo trừ khi người dùng bật Demo Mode.

Logs cần:

- Timestamp.
- Severity.
- Source.
- Event type.
- Message.
- Correlation/event ID.
- Search.
- Filter.
- Auto-refresh toggle.
- Clear/export nếu backend hỗ trợ.
- Không hiển thị secret hoặc token trong log.

# 12. AUTHENTICATION VÀ PHÂN QUYỀN

Kiểm tra authentication hiện tại.

Nếu mới chỉ có nút đăng nhập giả, hãy triển khai authentication tối thiểu phù hợp với stack hiện tại:

- Login.
- Logout.
- Session persistence.
- Protected routes.
- Unauthorized handling.
- Account menu.
- Role foundation: Owner, Operator, Viewer.
- Không lưu token nhạy cảm trong nơi không an toàn nếu có lựa chọn tốt hơn.

Nếu việc triển khai auth cần database/provider chưa có, hãy tạo interface và dev mode hợp lý, ghi rõ phần cần cấu hình; không giả vờ production-ready.

# 13. BACKEND PRODUCTION HARDENING

Rà soát và nâng cấp:

- Environment validation khi server khởi động.
- Centralized error handling.
- Structured logging.
- Request ID/correlation ID.
- Input validation.
- Rate limiting.
- CORS allowlist.
- Security headers.
- Body-size limit.
- API authentication.
- Graceful shutdown.
- Health endpoint.
- Readiness endpoint.
- TikTok reconnect với exponential backoff.
- Queue chống trùng.
- Cooldown.
- Queue capacity.
- Event expiration.
- Acknowledge complete/fail.
- Idempotency theo `eventId`.
- Không để một comment lỗi làm crash server.

Cú pháp mặc định:

`!dance RobloxUsername`

Queue mặc định:

- FIFO.
- 10 giây mỗi dancer.
- Tối đa 20 người.
- Cooldown 60 giây mỗi TikTok user.
- Không cho cùng Roblox username xuất hiện trùng trong queue.
- Expire sau 5 phút.

# 14. STATE VÀ REAL-TIME UPDATE

Ưu tiên WebSocket hoặc Server-Sent Events từ backend đến dashboard nếu phù hợp với stack.

Roblox vẫn có thể polling backend qua HTTPS.

Dashboard phải cập nhật:

- Connector status.
- Active dancer.
- Queue.
- Logs.
- Metrics.

Nếu real-time connection bị mất:

- Hiển thị trạng thái degraded.
- Tự reconnect với backoff.
- Không nhân đôi listener.
- Không làm mất dữ liệu đang hiển thị.
- Có polling fallback nếu phù hợp.

# 15. UX VÀ ACCESSIBILITY

Bắt buộc:

- Semantic HTML.
- Keyboard navigation.
- Visible focus state.
- Form label đúng.
- ARIA cho dialog và control cần thiết.
- Contrast hợp lý.
- Tooltip cho icon-only button.
- Escape đóng modal.
- Không khóa focus sai.
- Respect `prefers-reduced-motion`.
- Skeleton loading hợp lý.
- Empty state có hướng dẫn hành động.
- Error message nói rõ nguyên nhân và cách xử lý.

Toàn bộ nội dung giao diện phải dùng một ngôn ngữ nhất quán. Tạo cấu trúc i18n hoặc dictionary để hỗ trợ tiếng Việt và tiếng Anh; mặc định tiếng Việt nếu code hiện tại đang dùng tiếng Việt.

# 16. CHẤT LƯỢNG CODE

- Component nhỏ, có trách nhiệm rõ ràng.
- Không tạo component khổng lồ.
- Tách API client, types, schemas, hooks và UI.
- Tránh duplicate logic.
- Không dùng `any` tùy tiện nếu là TypeScript.
- Không bỏ lỗi lint bằng disable rule nếu có thể sửa đúng.
- Không để console log debug trong production.
- Lazy-load route nặng nếu framework hỗ trợ.
- Error boundary cho khu vực quan trọng.
- Tối ưu re-render.
- Cleanup timer, subscription và socket listener.
- Không thêm dependency khi native solution đã đủ tốt.

# 17. TESTING

Bổ sung hoặc cập nhật:

- Unit test cho parser `!dance`.
- Unit test cho queue FIFO.
- Duplicate prevention.
- Cooldown.
- Queue expiration.
- API validation.
- Component states.
- Connect/disconnect flow.
- Active dancer.
- Skip và clear queue.
- WebSocket/SSE reconnect nếu có.
- Mock TikTok events.
- Mock Roblox polling.

Chạy:

- Install.
- Lint.
- Typecheck.
- Unit tests.
- Production build.
- Smoke test.

Nếu công cụ test chưa có, hãy thiết lập bộ test tối thiểu phù hợp với stack.

# 18. ACCEPTANCE CRITERIA

Chỉ được coi là hoàn thành khi:

1. Ứng dụng build production thành công.
2. Không có lỗi nghiêm trọng trong console.
3. Navigation hoạt động.
4. Responsive không vỡ ở các breakpoint chính.
5. Connect/disconnect có state rõ ràng.
6. Test comment tạo đúng queue item.
7. Queue item không bị xử lý lặp.
8. Active dancer cập nhật đúng.
9. Skip/complete chuyển sang người kế tiếp.
10. Error và empty states đầy đủ.
11. Không có secret hard-code.
12. Dashboard không hiển thị số liệu giả.
13. API có validation và error handling.
14. Các chức năng cũ còn hoạt động.
15. README có hướng dẫn chạy local và production.
16. `.env.example` liệt kê biến cần thiết nhưng không chứa secret.
17. Có báo cáo rõ phần nào hoàn thành, phần nào còn phụ thuộc TikTok/Roblox hoặc credential bên ngoài.

# 19. CÁCH TRIỂN KHAI

Thực hiện theo thứ tự:

Phase 1:

- Audit repository.
- Chạy dự án hiện tại.
- Ghi nhận baseline.
- Chốt kiến trúc và design system.

Phase 2:

- Refactor app shell.
- Xây reusable UI components.
- Responsive navigation.
- Theme và accessibility.

Phase 3:

- Hoàn thiện Live Control Center.
- Queue.
- Active dancer.
- Test mode.
- Real-time state.

Phase 4:

- Music, Dance, Overlay, Roblox Setup, Analytics, Logs và Settings.

Phase 5:

- Backend hardening.
- Authentication.
- Validation.
- Security.
- Tests.

Phase 6:

- Chạy toàn bộ verification.
- Sửa lỗi.
- Kiểm tra giao diện thực tế bằng browser ở nhiều kích thước.
- Chụp screenshot kết quả nếu môi trường hỗ trợ.

Không dừng lại sau khi chỉ tạo kế hoạch. Sau audit, hãy trực tiếp sửa code trong repository.

# 20. BÁO CÁO CUỐI

Sau khi hoàn tất, báo cáo ngắn gọn:

- Kiến trúc đã dùng.
- Các chức năng đã hoàn thiện.
- Danh sách file chính đã sửa/tạo.
- Lệnh chạy dự án.
- Kết quả lint, test và build.
- Các biến môi trường cần cấu hình.
- Những phần chưa thể kiểm thử vì thiếu TikTok Live, Roblox Place hoặc credential.
- Các rủi ro còn lại.
- Các bước deploy production.

Không báo “hoàn thành” nếu chưa chạy kiểm tra thực tế.
