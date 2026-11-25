/** Lắp ráp toàn bộ báo cáo Bài 1 độc lập: title page, TOC, Chương 1-3, Kết luận, Tài liệu tham khảo, Phụ lục. */
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, TableOfContents, LevelFormat, Header, Footer, PageNumber,
} = require('docx');

const base = require('./build-report-bai1');
const { section32 } = require('./build-report-bai1-usecases');
const {
  h1, h2, h3, p, bullet, caption, codeBlock, simpleTable, titlePage, BLUE, GRAY,
} = base;
const { chapter1, chapter2, chapter3Intro } = base;

// ---------------------------------------------------------------------------
// Danh mục hình vẽ + Danh mục từ viết tắt (trang đầu báo cáo)
// ---------------------------------------------------------------------------
const FIGURES = [
  ['Hình 2.1', 'Kiến trúc tổng thể hệ thống theo mô hình IoT 5 tầng'],
  ['Hình 3.1', 'Sơ đồ ERD cơ sở dữ liệu'],
  ['Hình 3.2', 'Sơ đồ Use Case tổng quan hệ thống'],
  ['Hình 3.3', 'Sequence Diagram — luồng đăng nhập (UC01)'],
  ['Hình 3.4', 'Giao diện trang Login'],
  ['Hình 3.5', 'Sequence Diagram — luồng đẩy dữ liệu realtime nuôi Dashboard (UC02)'],
  ['Hình 3.6', 'Giao diện trang Dashboard'],
  ['Hình 3.7', 'Sequence Diagram — luồng bật/tắt thiết bị (UC03)'],
  ['Hình 3.8', 'Sequence Diagram — luồng tra cứu dữ liệu cảm biến (UC04)'],
  ['Hình 3.9', 'Giao diện trang Data Sensor'],
  ['Hình 3.10', 'Sequence Diagram — luồng tra cứu lịch sử hành động (UC05)'],
  ['Hình 3.11', 'Giao diện trang Action History'],
  ['Hình 3.12', 'Giao diện trang Profile'],
  ['Hình 3.13', 'Sequence Diagram — luồng cảnh báo & tự động xử lý khi vượt ngưỡng (UC07)'],
];

const figuresListPage = [
  new Paragraph({ text: 'DANH MỤC CÁC HÌNH VẼ', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
  simpleTable(['Hình', 'Tên hình'], FIGURES, [15, 85]),
  new Paragraph({ children: [new PageBreak()] }),
];

const ABBREVIATIONS = [
  ['IoT', 'Internet of Things — Internet vạn vật'],
  ['MQTT', 'Message Queuing Telemetry Transport — giao thức Publish/Subscribe cho IoT'],
  ['API', 'Application Programming Interface — giao diện lập trình ứng dụng'],
  ['REST / RESTful', 'Representational State Transfer — kiểu kiến trúc API theo tài nguyên qua HTTP'],
  ['JWT', 'JSON Web Token — token xác thực người dùng'],
  ['UI / UX', 'User Interface / User Experience — giao diện và trải nghiệm người dùng'],
  ['CSDL', 'Cơ sở dữ liệu'],
  ['ERD', 'Entity-Relationship Diagram — sơ đồ thực thể - quan hệ'],
  ['UC', 'Use Case — trường hợp sử dụng'],
  ['ESP8266 / ESP32', 'Dòng vi điều khiển tích hợp Wi-Fi của Espressif Systems'],
  ['DHT11', 'Cảm biến kỹ thuật số đo nhiệt độ và độ ẩm'],
  ['LED', 'Light Emitting Diode — đèn mô phỏng thiết bị điện trong đồ án'],
  ['JSON', 'JavaScript Object Notation — định dạng trao đổi dữ liệu'],
  ['HTTP', 'HyperText Transfer Protocol — giao thức truyền tải siêu văn bản'],
  ['WS', 'WebSocket — giao thức kết nối hai chiều thời gian thực (nền tảng của Socket.io)'],
];

const abbreviationsPage = [
  new Paragraph({ text: 'DANH MỤC CÁC TỪ VIẾT TẮT', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
  simpleTable(['Viết tắt', 'Ý nghĩa'], ABBREVIATIONS, [22, 78]),
  new Paragraph({ children: [new PageBreak()] }),
];

// ---------------------------------------------------------------------------
// 3.3 Thiết kế API (RESTful) — tường thuật kèm ví dụ JSON
// ---------------------------------------------------------------------------
const section33 = [
  h2('3.3. Thiết kế API'),
  p('API được thiết kế theo chuẩn RESTful, xác thực bằng JWT (trừ 2 endpoint đăng nhập/đăng ký). Mọi request cần xác thực phải gửi kèm header Authorization: Bearer {token}. Đặc tả đầy đủ theo chuẩn OpenAPI 3.0 được lưu tại docs/api-docs/openapi.yaml và đóng gói Postman Collection tại docs/api-docs/postman_collection.json; dưới đây trình bày tường thuật từng nhóm endpoint kèm ví dụ request/response thực tế.'),

  h3('3.3.1. Xác thực — POST /api/auth/login'),
  p('Người dùng gửi email và password; Backend so khớp với password_hash đã băm bằng bcrypt trong bảng User, nếu đúng trả về JWT token và thông tin cơ bản của tài khoản.'),
  caption('Request'),
  ...codeBlock(JSON.stringify({ email: 'quan@example.com', password: '123456' }, null, 2)),
  caption('Response 200 OK'),
  ...codeBlock(JSON.stringify({
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: { id: 1, full_name: 'Đỗ Minh Quân', email: 'quan@example.com', role: 'admin' },
  }, null, 2)),
  caption('Response 401 Unauthorized (sai email hoặc mật khẩu)'),
  ...codeBlock(JSON.stringify({ message: 'Sai email hoặc mật khẩu' }, null, 2)),

  h3('3.3.2. Thiết bị — GET /api/devices'),
  p('Trả về danh sách toàn bộ thiết bị kèm trạng thái hiện tại, phục vụ UC02 (Dashboard) và UC06 (Profile).'),
  caption('Response 200 OK'),
  ...codeBlock(JSON.stringify([
    { id: 1, name: 'Đèn phòng khách', device_type: 'light', location: 'Phòng khách', current_state: 'ON' },
    { id: 2, name: 'Quạt phòng khách', device_type: 'fan', location: 'Phòng khách', current_state: 'OFF' },
    { id: 3, name: 'Điều hòa phòng ngủ', device_type: 'air_conditioner', location: 'Phòng ngủ', current_state: 'OFF' },
  ], null, 2)),

  h3('3.3.3. Điều khiển thiết bị — POST /api/devices/{id}/action'),
  p('Endpoint trung tâm của UC03. Backend không trả về trạng thái mới ngay (vì chưa chắc phần cứng đã xử lý xong) mà trả về 202 Accepted kèm action_id — trạng thái thật sẽ được đẩy xuống sau qua Socket.io khi Backend nhận được phản hồi từ Hardware trên topic home/device/{id}/status.'),
  caption('Request — PUT /api/devices/1/action'),
  ...codeBlock(JSON.stringify({ action: 'ON' }, null, 2)),
  caption('Response 202 Accepted'),
  ...codeBlock(JSON.stringify({ action_id: 57, status: 'pending' }, null, 2)),
  caption('Response 400 Bad Request (action không hợp lệ)'),
  ...codeBlock(JSON.stringify({ message: 'action phải là "ON" hoặc "OFF"' }, null, 2)),

  h3('3.3.4. Dữ liệu cảm biến — GET /api/sensors'),
  p('Phục vụ UC04, hỗ trợ lọc theo sensor_id và khoảng thời gian from/to (định dạng ISO 8601), trả tối đa 500 bản ghi gần nhất theo thời gian giảm dần.'),
  caption('Request'),
  ...codeBlock('GET /api/sensors?sensor_id=1&from=2026-09-13T00:00:00Z&to=2026-09-13T23:59:59Z'),
  caption('Response 200 OK'),
  ...codeBlock(JSON.stringify([
    { id: 1042, sensor_id: 1, sensor_type: 'temperature', value: 29.5, unit: '°C', recorded_at: '2026-09-13T08:12:05Z' },
    { id: 1041, sensor_id: 1, sensor_type: 'temperature', value: 29.3, unit: '°C', recorded_at: '2026-09-13T08:07:05Z' },
  ], null, 2)),
  p('Endpoint GET /api/sensors/latest (không tham số) trả về giá trị mới nhất của mỗi cảm biến, dùng riêng cho Dashboard (UC02) để hiển thị 2 ô "Nhiệt độ" / "Độ ẩm" mà không cần tải cả lịch sử.'),

  h3('3.3.5. Lịch sử hành động — GET /api/actions'),
  p('Phục vụ UC05, hỗ trợ lọc theo device_id và khoảng thời gian, trả về kèm join tên thiết bị, tên người thực hiện và cột triggered_by để phân biệt nguồn gốc lệnh (UC03 vs UC07).'),
  caption('Response 200 OK'),
  ...codeBlock(JSON.stringify([
    { id: 88, device_id: 3, device_name: 'Điều hòa phòng ngủ', user_id: 1, user_name: 'Đỗ Minh Quân', action: 'ON', triggered_by: 'system', status: 'success', triggered_at: '2026-09-13T14:02:11Z', responded_at: '2026-09-13T14:02:12Z' },
    { id: 87, device_id: 1, device_name: 'Đèn phòng khách', user_id: 1, user_name: 'Đỗ Minh Quân', action: 'ON', triggered_by: 'user', status: 'success', triggered_at: '2026-09-13T13:50:02Z', responded_at: '2026-09-13T13:50:02Z' },
  ], null, 2)),

  h3('3.3.6. Hồ sơ cá nhân — GET / PUT /api/users/me'),
  p('Phục vụ UC06. GET trả về thông tin tài khoản hiện tại (không kèm password_hash); PUT cho phép đổi tên hiển thị và/hoặc đổi mật khẩu (yêu cầu xác nhận mật khẩu cũ đúng trước khi cập nhật).'),
  caption('Request — PUT /api/users/me'),
  ...codeBlock(JSON.stringify({ full_name: 'Đỗ Minh Quân', old_password: '123456', new_password: 'MatKhauMoi789' }, null, 2)),
  caption('Response 200 OK'),
  ...codeBlock(JSON.stringify({ message: 'Cập nhật thành công' }, null, 2)),

  h3('3.3.7. Kênh Realtime — Socket.io (WebSocket)'),
  p('Ngoài REST API, Backend mở một kênh Socket.io để đẩy dữ liệu một chiều xuống Frontend ngay khi có sự kiện mới, không cần Frontend chủ động hỏi lại. Bảng 3.6 liệt kê các sự kiện realtime được sử dụng trong hệ thống.'),
  simpleTable(
    ['Sự kiện', 'Use Case liên quan', 'Payload ví dụ'],
    [
      ['device:update', 'UC02, UC03', '{ device_id: 1, state: "ON" }'],
      ['sensor:update', 'UC02', '{ sensor_id: 1, type: "temperature", value: 29.5, unit: "°C" }'],
      ['action:update', 'UC03, UC05', '{ action_id: 57, device_id: 1, status: "timeout" }'],
      ['alert:threshold', 'UC07', '{ sensor_id: 1, value: 33.5, threshold: 32, device_id: 3, auto_action: true, message: "..." }'],
    ],
    [22, 20, 58]
  ),
  p(''),

  h2('3.4. Tổng kết thiết kế giao diện (UI/UX)'),
  p('Giao diện được phác thảo trước khi lập trình (ảnh minh hoạ đã trình bày kèm từng Use Case ở mục 3.2), gồm 4 trang chính dùng chung một sidebar điều hướng cố định bên trái (Dashboard, Data Sensor, Action History, Profile) và 1 trang Login độc lập. Tông màu chủ đạo xanh dương - xanh mint trên nền sáng tạo cảm giác hiện đại, chuyên nghiệp, phù hợp một sản phẩm quản lý thiết bị thông minh; trang Dashboard được thiết kế hiển thị toàn bộ thông tin quan trọng nhất (trạng thái 3 thiết bị, 2 chỉ số cảm biến, biểu đồ nhiệt độ, 3 hành động gần nhất) trên đúng một màn hình, không cuộn trang, để người dùng nắm bắt tình trạng ngôi nhà tức thời.'),
  p('Các ảnh giao diện chèn trong báo cáo này là bản mockup dựng sẵn làm tài liệu tham khảo thiết kế. Trước khi nộp bài, cần thay bằng: (1) ảnh chụp từ file Figma thật nếu dựng lại thiết kế trong Figma; và ở Bài 3/Bài 4, (2) ảnh chụp màn hình ứng dụng Web đang chạy thật với dữ liệu thật.'),
];

// ---------------------------------------------------------------------------
// KẾT LUẬN
// ---------------------------------------------------------------------------
const conclusion = [
  h1('KẾT LUẬN'),
  p('Bài 1 đã hoàn thành đầy đủ các mục tiêu phân tích và thiết kế đặt ra: xác định 7 Use Case (6 Use Case cơ bản cho người dùng cuối và 1 Use Case nâng cao thể hiện khả năng tự động hoá của hệ thống), thiết kế cơ sở dữ liệu MySQL chuẩn hoá gồm 5 bảng với ràng buộc khoá ngoại rõ ràng, thiết kế giao diện UI/UX cho 5 màn hình, và thiết kế bộ API RESTful đầy đủ kèm ví dụ thực tế cho từng endpoint cũng như kênh giao tiếp realtime qua Socket.io.'),
  p('Điểm nổi bật trong thiết kế là việc bổ sung Use Case UC07 (cảnh báo & tự động xử lý khi cảm biến vượt ngưỡng), thể hiện tư duy thiết kế hệ thống không chỉ dừng ở mức "điều khiển thủ công theo yêu cầu" mà còn hướng tới khả năng phản ứng tự động dựa trên dữ liệu thời gian thực — một đặc trưng cốt lõi phân biệt hệ thống IoT thông minh với hệ thống điều khiển từ xa thông thường. Về mặt cơ sở dữ liệu, cột triggered_by trong bảng ActionHistory là minh chứng cụ thể cho việc thiết kế schema đã được suy nghĩ để hỗ trợ đúng yêu cầu nghiệp vụ này ngay từ đầu, thay vì phải chỉnh sửa về sau.'),
  p('Toàn bộ tài liệu thiết kế ở Bài 1 (Use Case, ERD, Sequence Diagram, API) là nền tảng trực tiếp cho việc lập trình giao tiếp MQTT ở Bài 2 và xây dựng ứng dụng Web hoàn chỉnh ở Bài 3: cấu trúc topic MQTT đã thiết kế ở mục 2.2 được dùng nguyên vẹn khi lập trình cả bản mô phỏng 3 Terminal lẫn phần cứng thật; schema CSDL và API ở Chương 3 được hiện thực trực tiếp thành mã nguồn Backend/Frontend mà không cần thay đổi cấu trúc.'),
];

const references = [
  h1('TÀI LIỆU THAM KHẢO'),
  p('[1] MQTT.org, "MQTT Version 5.0 - OASIS Standard", https://mqtt.org'),
  p('[2] Espressif Systems, "ESP32 Technical Reference Manual", https://www.espressif.com'),
  p('[3] Node.js Foundation, "Node.js Documentation", https://nodejs.org/docs'),
  p('[4] Meta Open Source, "React Documentation", https://react.dev'),
  p('[5] Oracle/MySQL, "MySQL 8.0 Reference Manual", https://dev.mysql.com/doc'),
  p('[6] Eclipse Foundation, "Eclipse Mosquitto - An open source MQTT broker", https://mosquitto.org'),
  p('[7] Swagger/SmartBear, "OpenAPI Specification", https://swagger.io/specification'),
  p('[8] Socket.io, "Socket.IO Documentation", https://socket.io/docs'),
];

const appendix = [
  h1('PHỤ LỤC — LIÊN KẾT ĐỒ ÁN'),
  p('Toàn bộ mã nguồn và tài liệu thiết kế chi tiết dạng mermaid (Usecase đầy đủ tại docs/usecases.md, ERD & bảng chi tiết tại docs/database-design.md, Sequence Diagram tại docs/sequence-diagrams.md, kiến trúc hệ thống tại docs/architecture.md) được lưu trữ tại các đường link sau (điền link thật trước khi nộp bài, đồng bộ với trang Profile của Frontend):'),
  bullet('GitHub Repository (mã nguồn Backend, Frontend, Hardware, MQTT simulation): .............................................'),
  bullet('Figma Design (bản thiết kế UI đầy đủ): .............................................'),
  bullet('API Docs (Swagger UI / Postman public doc): .............................................'),
];

// ---------------------------------------------------------------------------
// Assemble document
// ---------------------------------------------------------------------------
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'main-bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 260 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 260 } } } },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Times New Roman', size: 24 } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: BLUE, font: 'Times New Roman' },
        paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, color: '0F172A', font: 'Times New Roman' },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, italics: true, color: '0F172A', font: 'Times New Roman' },
        paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    {
      properties: {
        page: { size: { width: 11907, height: 16840 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'Báo cáo Bài 1 IoT — Đỗ Minh Quân', size: 18, color: '94A3B8' })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })],
          })],
        }),
      },
      children: [
        ...titlePage(),
        new Paragraph({ text: 'MỤC LỤC', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-3' }),
        new Paragraph({ children: [new PageBreak()] }),

        ...figuresListPage,
        ...abbreviationsPage,

        ...chapter1,
        ...chapter2,
        ...chapter3Intro,
        ...section32,
        ...section33,
        ...conclusion,
        ...references,
        ...appendix,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(__dirname + '/BaoCao_Bai1_ThietKeHeThong_DoMinhQuan.docx', buffer);
  console.log('Đã tạo report/BaoCao_Bai1_ThietKeHeThong_DoMinhQuan.docx');
});
