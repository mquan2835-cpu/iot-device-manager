/** Mục 3.2 — Đặc tả Use Case đầy đủ: mỗi UC gồm bảng đặc tả + tường thuật luồng + sequence diagram + ảnh UI liên quan. */
const { h1, h2, h3, p, caption, figure, usecaseTable } = require('./build-report-bai1');

const section32Intro = [
  h2('3.2. Đặc tả Use Case'),
  p('Hệ thống gồm 6 Use Case chính phục vụ người dùng cuối (UC01 - UC06) và 1 Use Case nâng cao do chính hệ thống tự kích hoạt (UC07 - bonus). Hình 3.2 trình bày sơ đồ Use Case tổng quan; các mục 3.2.1 - 3.2.7 bên dưới đặc tả chi tiết từng Use Case kèm sequence diagram và ảnh giao diện liên quan (bản mockup thiết kế — xem ghi chú ở mục 3.3 về việc thay bằng ảnh Figma/ảnh chạy thật trước khi nộp bài).'),
  ...figure('diagrams/usecase_1.png', 'Hình 3.2: Sơ đồ Use Case tổng quan hệ thống', 500),
];

// ---------------------------------------------------------------------------
const uc01 = [
  h3('3.2.1. UC01 — Đăng nhập / Đăng ký tài khoản'),
  usecaseTable([
    ['Mã Use Case', 'UC01'],
    ['Tác nhân chính', 'Người dùng'],
    ['Mô tả', 'Người dùng đăng ký tài khoản mới hoặc đăng nhập để truy cập hệ thống.'],
    ['Điều kiện tiên quyết', 'Người dùng có kết nối Internet, truy cập được trang Web.'],
    ['Luồng sự kiện chính', '1. Người dùng mở trang Login.\n2. Nhập email/username và mật khẩu.\n3. Frontend gửi POST /api/auth/login tới Backend.\n4. Backend kiểm tra trong bảng User, so khớp mật khẩu đã hash bằng bcrypt.\n5. Backend trả về JWT token.\n6. Frontend lưu token, chuyển hướng sang Dashboard.'],
    ['Luồng thay thế', '3a. Nếu chưa có tài khoản, chọn "Đăng ký" → POST /api/auth/register → tạo bản ghi mới trong bảng User.\n4a. Sai mật khẩu/email → phản hồi 401, hiển thị thông báo lỗi.'],
    ['Hậu điều kiện', 'Người dùng được cấp token, có phiên đăng nhập hợp lệ.'],
  ]),
  p('Luồng đăng nhập là luồng đơn giản nhất về mặt số bước nhưng là điều kiện tiên quyết cho mọi Use Case còn lại: mọi API phía sau (trừ /api/auth/*) đều được bảo vệ bởi middleware requireAuth, kiểm tra JWT token gửi kèm header Authorization. Hình 3.3 minh hoạ chi tiết luồng trao đổi giữa Frontend, Backend và MySQL.'),
  ...figure('diagrams/seq_3.png', 'Hình 3.3: Sequence Diagram — luồng đăng nhập (UC01)', 460),
  ...figure('ui/ui_login.png', 'Hình 3.4: Giao diện trang Login'),
];

// ---------------------------------------------------------------------------
const uc02 = [
  h3('3.2.2. UC02 — Xem Dashboard tổng quan thời gian thực'),
  usecaseTable([
    ['Mã Use Case', 'UC02'],
    ['Tác nhân chính', 'Người dùng'],
    ['Mô tả', 'Người dùng xem tổng quan trạng thái tất cả thiết bị (đèn, quạt, điều hòa) và chỉ số cảm biến mới nhất trên một màn hình duy nhất.'],
    ['Điều kiện tiên quyết', 'Đã đăng nhập thành công (có token hợp lệ).'],
    ['Luồng sự kiện chính', '1. Người dùng vào trang Dashboard.\n2. Frontend gọi GET /api/devices và GET /api/sensors/latest để lấy trạng thái hiện tại.\n3. Frontend mở kết nối realtime (Socket.io).\n4. Khi có dữ liệu mới từ Hardware (qua MQTT), Backend đẩy (push) xuống Frontend qua sự kiện device:update / sensor:update.\n5. Dashboard cập nhật biểu đồ và trạng thái nút bật/tắt tương ứng, không cần tải lại trang.'],
    ['Luồng thay thế', '3a. Nếu mất kết nối realtime, giao diện hiển thị badge "Mất kết nối"; dữ liệu vẫn đúng ở lần tải trang gần nhất.'],
    ['Hậu điều kiện', 'Người dùng thấy trạng thái mới nhất của toàn bộ hệ thống trên một màn hình, không cuộn trang.'],
  ]),
  p('Khác với các Use Case còn lại (chủ động gọi API theo yêu cầu người dùng), UC02 phụ thuộc vào một luồng nền chạy độc lập: luồng thu thập dữ liệu cảm biến/trạng thái thiết bị realtime, được kích hoạt mỗi khi phần cứng publish dữ liệu lên MQTT — không cần Frontend chủ động hỏi lại (pull) mà Backend tự đẩy (push) xuống. Hình 3.5 mô tả luồng nền này.'),
  ...figure('diagrams/seq_2.png', 'Hình 3.5: Sequence Diagram — luồng đẩy dữ liệu realtime nuôi Dashboard (UC02)', 460),
  ...figure('ui/ui_dashboard.png', 'Hình 3.6: Giao diện trang Dashboard'),
];

// ---------------------------------------------------------------------------
const uc03 = [
  h3('3.2.3. UC03 — Điều khiển thiết bị (Bật/Tắt đèn, quạt, điều hòa)'),
  usecaseTable([
    ['Mã Use Case', 'UC03'],
    ['Tác nhân chính', 'Người dùng; Tác nhân phụ: Thiết bị phần cứng'],
    ['Mô tả', 'Người dùng nhấn nút bật/tắt một thiết bị trên giao diện, hệ thống truyền lệnh xuống phần cứng qua MQTT và hiển thị lại trạng thái thực tế.'],
    ['Điều kiện tiên quyết', 'Đã đăng nhập; thiết bị đã được đăng ký trong bảng Device; ESP đang kết nối MQTT Broker.'],
    ['Luồng sự kiện chính', '1. Người dùng nhấn nút Bật/Tắt trên Dashboard.\n2. Frontend gọi POST /api/devices/{id}/action (body: { "action": "ON" }).\n3. Backend ghi bản ghi mới vào bảng ActionHistory (triggered_by=user, status=pending).\n4. Backend publish message MQTT lên topic home/device/{id}/set.\n5. NodeMCU subscribe topic này, nhận lệnh, bật/tắt LED tương ứng.\n6. NodeMCU publish trạng thái thực tế lên topic home/device/{id}/status.\n7. Backend subscribe topic status, cập nhật Device.current_state và ActionHistory.status=success.\n8. Backend đẩy realtime (device:update) xuống Frontend để cập nhật UI.'],
    ['Luồng thay thế', '5a. Nếu ESP mất kết nối MQTT (offline), Backend không nhận được phản hồi trong ACTION_TIMEOUT_MS (mặc định 5 giây) → đánh dấu ActionHistory.status=timeout, đẩy realtime báo lỗi; Frontend khôi phục công tắc về đúng trạng thái trước khi người dùng bấm (rollback optimistic update) và hiển thị cảnh báo đỏ "Thiết bị không phản hồi".'],
    ['Hậu điều kiện', 'Trạng thái thiết bị và lịch sử hành động được cập nhật đồng bộ giữa DB, Backend và phần cứng thật; công tắc trên giao diện không bao giờ "treo" ở trạng thái sai khi có lỗi.'],
  ]),
  p('Đây là luồng nghiệp vụ trung tâm của toàn hệ thống, thể hiện đầy đủ vòng khép kín giữa 3 lớp: Frontend phát lệnh → Backend ghi nhận & chuyển tiếp qua MQTT → Hardware thực thi & phản hồi trạng thái thật → Backend đồng bộ lại DB và đẩy realtime. Frontend dùng optimistic UI (đổi màu công tắc ngay khi người dùng bấm, không đợi xác nhận) để tạo cảm giác phản hồi tức thời; đồng thời Backend vẫn giữ nguyên tắc "ghi pending trước, xác nhận success sau" ở phía dữ liệu — nhờ vậy khi lệnh bị timeout (nhánh else trong Hình 3.7), Frontend có đủ thông tin để tự động khôi phục công tắc về đúng trạng thái trước đó thay vì hiển thị sai lệch với thực tế phần cứng.'),
  ...figure('diagrams/seq_1.png', 'Hình 3.7: Sequence Diagram — luồng bật/tắt thiết bị (UC03)'),
];

// ---------------------------------------------------------------------------
const uc04 = [
  h3('3.2.4. UC04 — Xem dữ liệu cảm biến (Data Sensor)'),
  usecaseTable([
    ['Mã Use Case', 'UC04'],
    ['Tác nhân chính', 'Người dùng'],
    ['Mô tả', 'Người dùng xem lịch sử dữ liệu cảm biến (nhiệt độ, độ ẩm...) dưới dạng bảng/biểu đồ theo khoảng thời gian.'],
    ['Điều kiện tiên quyết', 'Đã đăng nhập; đã có dữ liệu cảm biến được lưu trong bảng DataSensor.'],
    ['Luồng sự kiện chính', '1. Người dùng vào trang Data Sensor.\n2. Chọn thiết bị/cảm biến và khoảng thời gian cần xem.\n3. Frontend gọi GET /api/sensors?sensor_id=&from=&to=.\n4. Backend truy vấn bảng DataSensor (join Sensor), trả về danh sách bản ghi.\n5. Frontend vẽ biểu đồ đường (line chart) theo thời gian và bảng dữ liệu chi tiết.'],
    ['Luồng thay thế', '4a. Không có dữ liệu trong khoảng thời gian chọn → hiển thị "Không có dữ liệu".'],
    ['Hậu điều kiện', 'Người dùng nắm được xu hướng dữ liệu cảm biến theo thời gian.'],
  ]),
  p('Khác với luồng ở UC02 (Backend chủ động đẩy dữ liệu mới xuống ngay khi có), UC04 là luồng người dùng chủ động truy vấn lại (pull) dữ liệu lịch sử đã lưu, có thể lọc theo cảm biến và khoảng thời gian tuỳ ý — phục vụ mục đích phân tích xu hướng thay vì chỉ xem giá trị tức thời.'),
  ...figure('diagrams/seq_4.png', 'Hình 3.8: Sequence Diagram — luồng tra cứu dữ liệu cảm biến (UC04)'),
  ...figure('ui/ui_datasensor.png', 'Hình 3.9: Giao diện trang Data Sensor'),
];

// ---------------------------------------------------------------------------
const uc05 = [
  h3('3.2.5. UC05 — Xem lịch sử hành động (Action History)'),
  usecaseTable([
    ['Mã Use Case', 'UC05'],
    ['Tác nhân chính', 'Người dùng'],
    ['Mô tả', 'Người dùng tra cứu lại toàn bộ các lệnh bật/tắt đã thực hiện, ai/cái gì thực hiện, thời gian, kết quả.'],
    ['Điều kiện tiên quyết', 'Đã đăng nhập; đã có ít nhất một hành động điều khiển được thực hiện (UC03 hoặc UC07).'],
    ['Luồng sự kiện chính', '1. Người dùng vào trang Action History.\n2. Frontend gọi GET /api/actions?device_id=&from=&to=.\n3. Backend truy vấn bảng ActionHistory (join Device, User).\n4. Frontend hiển thị bảng: thời gian, thiết bị, hành động, người thực hiện, nguồn (triggered_by), kết quả.\n5. Người dùng có thể lọc theo thiết bị hoặc khoảng thời gian.'],
    ['Luồng thay thế', '2a. Lọc theo thiết bị cụ thể (VD: chỉ xem lịch sử của "Quạt").'],
    ['Hậu điều kiện', 'Người dùng có bằng chứng kiểm toán (audit trail) về mọi thao tác điều khiển thiết bị trong nhà, kể cả thao tác do chính hệ thống tự động thực hiện (UC07).'],
  ]),
  p('Cột triggered_by (được bổ sung khi thiết kế UC07 ở mục 3.2.7) là điểm khác biệt quan trọng của bảng lịch sử này so với một bảng log thông thường: nó cho phép phân biệt rạch ròi hành động nào do người dùng chủ động bấm nút, hành động nào do hệ thống tự động sinh ra để xử lý sự cố — phục vụ cả mục đích kiểm toán lẫn gỡ lỗi khi cần xác minh "vì sao thiết bị này lại bật".'),
  ...figure('diagrams/seq_5.png', 'Hình 3.10: Sequence Diagram — luồng tra cứu lịch sử hành động (UC05)', 460),
  ...figure('ui/ui_actionhistory.png', 'Hình 3.11: Giao diện trang Action History'),
];

// ---------------------------------------------------------------------------
const uc06 = [
  h3('3.2.6. UC06 — Quản lý hồ sơ cá nhân & danh sách thiết bị (Profile)'),
  usecaseTable([
    ['Mã Use Case', 'UC06'],
    ['Tác nhân chính', 'Người dùng'],
    ['Mô tả', 'Người dùng xem/cập nhật thông tin cá nhân, đổi mật khẩu, xem danh sách thiết bị đã đăng ký và các đường link đồ án (GitHub, Figma, API Docs, Báo cáo PDF).'],
    ['Điều kiện tiên quyết', 'Đã đăng nhập.'],
    ['Luồng sự kiện chính', '1. Người dùng vào trang Profile.\n2. Frontend gọi GET /api/users/me và GET /api/devices.\n3. Hiển thị thông tin tài khoản, danh sách thiết bị (tên, loại, trạng thái).\n4. Người dùng có thể sửa tên hiển thị, đổi mật khẩu qua PUT /api/users/me.\n5. Trang hiển thị cố định các link: GitHub repo, Figma design, API Docs, File báo cáo PDF.'],
    ['Luồng thay thế', '4a. Đổi mật khẩu sai mật khẩu cũ → phản hồi 400, báo lỗi.'],
    ['Hậu điều kiện', 'Thông tin tài khoản được cập nhật; người chấm điểm/giảng viên có đủ link để kiểm tra đồ án.'],
  ]),
  p('UC06 là Use Case thuần CRUD, không có tương tác MQTT/phần cứng nên không cần sequence diagram riêng — luồng chỉ gồm gọi API, đọc/ghi bảng User và đọc bảng Device, tương tự cấu trúc chung của UC01 nhưng đơn giản hơn.'),
  ...figure('ui/ui_profile.png', 'Hình 3.12: Giao diện trang Profile'),
];

// ---------------------------------------------------------------------------
const uc07 = [
  h3('3.2.7. UC07 — Cảnh báo & tự động xử lý khi cảm biến vượt ngưỡng (bonus)'),
  usecaseTable([
    ['Mã Use Case', 'UC07'],
    ['Tác nhân chính', 'Hệ thống (Backend); Tác nhân phụ: Người dùng, Thiết bị phần cứng'],
    ['Mô tả', 'Backend tự động phát hiện khi nhiệt độ vượt ngưỡng an toàn (mặc định 32°C), phát cảnh báo thời gian thực xuống giao diện và tự động bật thiết bị "Điều hòa" để xử lý mà không cần người dùng thao tác.'],
    ['Điều kiện tiên quyết', 'Ngưỡng cảnh báo đã được cấu hình trong Backend (TEMP_ALERT_THRESHOLD trong .env); Frontend đang mở kết nối Socket.io.'],
    ['Luồng sự kiện chính', '1. Backend nhận message home/sensor/1/data (nhiệt độ) từ MQTT.\n2. Backend lưu giá trị vào bảng DataSensor như bình thường.\n3. Backend so sánh giá trị với ngưỡng cấu hình; nếu vượt ngưỡng và thiết bị "Điều hòa" đang OFF → chuyển sang bước 4.\n4. Backend tự tạo bản ghi ActionHistory với triggered_by=\'system\', status=\'pending\'.\n5. Backend publish lệnh ON xuống home/device/3/set (không cần người dùng bấm nút).\n6. Hardware bật LED "Điều hòa", publish lại trạng thái thật.\n7. Backend cập nhật ActionHistory.status=success, Device.current_state=ON.\n8. Backend emit sự kiện Socket.io alert:threshold kèm device:update để Frontend hiển thị cảnh báo đỏ và cập nhật nút Điều hòa sang ON.'],
    ['Luồng thay thế', '3a. Nếu thiết bị "Điều hòa" đã đang ON sẵn → chỉ phát cảnh báo (bước 8), không tạo lệnh điều khiển mới.\n6a. Nếu Hardware không phản hồi → hành động tự động này cũng tuân theo cơ chế timeout như UC03.'],
    ['Hậu điều kiện', 'Người dùng được cảnh báo kịp thời và hệ thống tự xử lý sự cố nhiệt độ cao mà không cần chờ thao tác thủ công; bản ghi ActionHistory phân biệt rõ hành động do người dùng hay do hệ thống tự kích hoạt.'],
  ]),
  p('UC07 là điểm mở rộng nâng cao thể hiện Backend không chỉ đóng vai trò "ống dẫn" chuyển tiếp lệnh giữa Frontend và Hardware, mà còn có khả năng tự ra quyết định dựa trên dữ liệu thời gian thực — một đặc trưng quan trọng của hệ thống IoT thực tế (edge intelligence ở mức đơn giản). Về mặt thiết kế CSDL, đây chính là lý do bảng ActionHistory cần cột triggered_by (mục 3.1, Bảng 3.5): nếu không có cột này, không thể phân biệt được một dòng ActionHistory là do người dùng chủ động hay do hệ thống tự sinh ra.'),
  ...figure('diagrams/seq_6.png', 'Hình 3.13: Sequence Diagram — luồng cảnh báo & tự động xử lý khi vượt ngưỡng (UC07)'),
  p('Vì luồng này hiển thị trực tiếp trên trang Dashboard (banner cảnh báo đỏ, xem lại Hình 3.6), báo cáo không lặp lại ảnh giao diện — xem chi tiết cách xử lý trong frontend/src/pages/Dashboard.jsx (lắng nghe sự kiện alert:threshold).'),
];

module.exports = {
  section32: [...section32Intro, ...uc01, ...uc02, ...uc03, ...uc04, ...uc05, ...uc06, ...uc07],
};
