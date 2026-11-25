/**
 * Sinh báo cáo CHUẨN RIÊNG cho Bài 1 (Thiết kế hệ thống & Cơ sở dữ liệu) — tài liệu độc lập,
 * cấu trúc và độ chi tiết tham khảo theo báo cáo Bài 1 của bạn Đức (đã được giảng viên chấm "tốt"):
 * có bảng chi tiết từng cột CSDL, đặc tả đầy đủ 7 Use Case (kèm sequence diagram + ảnh UI cho từng UC),
 * sơ đồ kiến trúc hệ thống 5 tầng, và API được trình bày tường thuật kèm ví dụ JSON ngay trong báo cáo.
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType,
  PageBreak, TableOfContents, LevelFormat,
  Header, Footer, PageNumber, ImageRun, VerticalAlign,
} = require('docx');

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
const BLUE = '1D4ED8';
const GRAY = '64748B';
const DARK = '0F172A';
const CODE_BG = 'F1F5F9';
const ASSETS_DIR = path.join(__dirname, 'assets');

const IMAGE_DIMS = {
  'diagrams/usecase_1.png': [2352, 753],
  'diagrams/erd_1.png': [2352, 2571],
  'diagrams/arch_1.png': [2352, 2274],
  'diagrams/seq_1.png': [2352, 1305],
  'diagrams/seq_2.png': [2352, 645],
  'diagrams/seq_3.png': [2352, 1113],
  'diagrams/seq_4.png': [2352, 948],
  'diagrams/seq_5.png': [2352, 537],
  'diagrams/seq_6.png': [2352, 1056],
  'ui/ui_login.png': [1440, 900],
  'ui/ui_dashboard.png': [1440, 900],
  'ui/ui_datasensor.png': [1440, 900],
  'ui/ui_actionhistory.png': [1440, 900],
  'ui/ui_profile.png': [1440, 900],
};

function figure(relPath, caption, maxWidth = 520) {
  const [origW, origH] = IMAGE_DIMS[relPath];
  const width = Math.min(maxWidth, origW);
  const height = Math.round(width * (origH / origW));
  const data = fs.readFileSync(path.join(ASSETS_DIR, relPath));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      children: [new ImageRun({ data, type: 'png', transformation: { width, height } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: caption, italics: true, size: 20, color: GRAY })],
    }),
  ];
}

function titlePage() {
  return [
    new Paragraph({ text: 'TRƯỜNG ĐẠI HỌC ..........................', alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
    new Paragraph({ text: 'KHOA CÔNG NGHỆ THÔNG TIN', alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    new Paragraph({ text: '', spacing: { after: 800 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'BÁO CÁO BÀI TẬP LỚN', bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Học phần: IoT và Ứng dụng', size: 24, color: GRAY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: 'Bài 1: Thiết kế hệ thống và Cơ sở dữ liệu', bold: true, size: 26, color: BLUE })],
    }),
    new Paragraph({ text: '', spacing: { after: 400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [new TextRun({
        text: 'HỆ THỐNG QUẢN LÝ THIẾT BỊ ĐIỆN THÔNG MINH\nDỰA TRÊN NỀN TẢNG IOT VÀ GIAO THỨC MQTT',
        bold: true, size: 36, color: DARK,
      })],
    }),
    new Paragraph({ text: '', spacing: { after: 1000 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Sinh viên thực hiện: ', bold: true }), new TextRun('Đỗ Minh Quân')] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MSSV: ', bold: true }), new TextRun('..........................................')] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Giảng viên hướng dẫn: ', bold: true }), new TextRun('..........................................')] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Lớp: ', bold: true }), new TextRun('..........................................')] }),
    new Paragraph({ text: '', spacing: { after: 1000 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun('TP. Hồ Chí Minh, tháng 9 năm 2026')] }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function h1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { after: 200 } });
}
function h2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 120 } });
}
function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 160, after: 100 } });
}
function p(text) {
  return new Paragraph({ children: [new TextRun(text)], spacing: { after: 140 }, alignment: AlignmentType.JUSTIFIED });
}
function bullet(text, level = 0) {
  return new Paragraph({ text, numbering: { reference: 'main-bullets', level }, spacing: { after: 60 } });
}
function caption(text) {
  return new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text, bold: true, size: 20 })] });
}

/** Khối code/JSON nền xám, font monospace — dùng để chèn ví dụ request/response ngay trong thân báo cáo. */
function codeBlock(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => new Paragraph({
    shading: { fill: CODE_BG, type: ShadingType.CLEAR, color: 'auto' },
    spacing: { before: i === 0 ? 40 : 0, after: i === lines.length - 1 ? 160 : 0, line: 240 },
    children: [new TextRun({ text: line.length ? line : ' ', font: 'Courier New', size: 18, color: '0F172A' })],
  }));
}

function simpleTable(headerRow, rows, widthsPct) {
  const totalWidth = 9000;
  const widths = widthsPct.map((w) => Math.round((w / 100) * totalWidth));
  const headerCells = headerRow.map((text, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR, color: 'auto' },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })],
  }));
  const bodyRows = rows.map((row) => new TableRow({
    children: row.map((text, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20 })] })],
    })),
  }));
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...bodyRows],
  });
}

/** Bảng chi tiết cột CSDL kiểu Đức: Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả chi tiết */
function columnTable(rows) {
  return simpleTable(['Tên cột', 'Kiểu dữ liệu', 'Ràng buộc', 'Mô tả chi tiết'], rows, [16, 20, 24, 40]);
}

/** Bảng đặc tả Use Case đầy đủ (2 cột: Thuộc tính | Nội dung). */
function usecaseTable(rows) {
  const totalWidth = 9000;
  const widths = [Math.round(0.22 * totalWidth), Math.round(0.78 * totalWidth)];
  const bodyRows = rows.map(([attr, content]) => {
    // Nội dung có thể chứa nhiều dòng (luồng sự kiện đánh số) — tách theo \n thành nhiều Paragraph
    // vì TextRun không tự ngắt dòng theo ký tự '\n' literal.
    const lines = String(content).split('\n');
    const contentParagraphs = lines.map((line, i) => new Paragraph({
      spacing: { after: i === lines.length - 1 ? 0 : 60 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: line, size: 20 })],
    }));
    return new TableRow({
      children: [
        new TableCell({
          width: { size: widths[0], type: WidthType.DXA },
          shading: { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: attr, bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: widths[1], type: WidthType.DXA },
          children: contentParagraphs,
        }),
      ],
    });
  });
  return new Table({ width: { size: totalWidth, type: WidthType.DXA }, columnWidths: widths, rows: bodyRows });
}

// ---------------------------------------------------------------------------
// CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN
// ---------------------------------------------------------------------------
const chapter1 = [
  h1('CHƯƠNG 1: GIỚI THIỆU TỔNG QUAN'),

  h2('1.1. Đặt vấn đề'),
  p('Nhu cầu giám sát và điều khiển thiết bị điện trong nhà từ xa ngày càng phổ biến nhờ sự phát triển của Internet of Things (IoT). Thay vì phải trực tiếp bật/tắt công tắc, người dùng có thể theo dõi và điều khiển đèn, quạt, điều hòa... thông qua một ứng dụng Web ở bất kỳ đâu có kết nối Internet. Để làm được điều này, hệ thống cần giải quyết 2 bài toán cốt lõi: (1) giao tiếp hai chiều thời gian thực, có độ trễ thấp giữa phần mềm và phần cứng; (2) lưu trữ và truy vấn được lịch sử trạng thái, lịch sử thao tác một cách có cấu trúc để phục vụ giám sát, kiểm toán.'),
  p('Bài 1 của đồ án tập trung giải quyết bước nền tảng nhất: phân tích yêu cầu (Use Case), thiết kế cơ sở dữ liệu quan hệ, và thiết kế API — làm cơ sở để triển khai giao tiếp MQTT (Bài 2), xây dựng ứng dụng Web (Bài 3) ở các bài tiếp theo.'),

  h2('1.2. Mục tiêu đề tài'),
  bullet('Xác định đầy đủ các tác nhân (actor) và Use Case của hệ thống quản lý thiết bị điện thông minh.'),
  bullet('Thiết kế cơ sở dữ liệu quan hệ (MySQL) chuẩn hoá, đủ để lưu người dùng, thiết bị, cảm biến, dữ liệu cảm biến theo thời gian và lịch sử hành động điều khiển.'),
  bullet('Thiết kế giao diện người dùng (UI/UX) trực quan cho 4 trang chính: Dashboard, Data Sensor, Action History, Profile.'),
  bullet('Thiết kế bộ API RESTful rõ ràng, có ví dụ request/response cụ thể, làm hợp đồng giao tiếp giữa Frontend và Backend.'),
  bullet('Thiết kế sơ đồ tuần tự (sequence diagram) cho từng luồng nghiệp vụ quan trọng, mô tả chính xác thứ tự trao đổi dữ liệu giữa Frontend, Backend, MySQL, MQTT Broker và phần cứng.'),

  h2('1.3. Phạm vi đề tài'),
  p('Phạm vi thực nghiệm của đồ án mô phỏng 3 thiết bị điện trong nhà (đèn, quạt, điều hòa) bằng 3 LED gắn trên board NodeMCU ESP8266/ESP32, cùng 1 cảm biến DHT11 đo nhiệt độ và độ ẩm. Ngoài các Use Case cơ bản (đăng nhập, xem Dashboard, điều khiển thiết bị, xem dữ liệu cảm biến, xem lịch sử hành động, quản lý hồ sơ), báo cáo bổ sung một Use Case nâng cao (UC07 — trình bày ở Chương 3) thể hiện khả năng hệ thống tự động phát hiện và xử lý sự cố (nhiệt độ vượt ngưỡng) mà không cần người dùng thao tác, làm rõ vai trò của Backend không chỉ là trung gian chuyển tiếp mà còn có logic nghiệp vụ riêng.'),

  h2('1.4. Phương pháp thực hiện'),
  bullet('Phân tích yêu cầu nghiệp vụ, xác định actor và đặc tả Use Case theo mẫu chuẩn (mã, tác nhân, mô tả, điều kiện tiên quyết, luồng chính, luồng thay thế, hậu điều kiện).'),
  bullet('Thiết kế cơ sở dữ liệu mức khái niệm (ERD) trước, sau đó cụ thể hoá thành schema SQL và bảng chi tiết từng cột.'),
  bullet('Thiết kế sequence diagram cho từng Use Case có tương tác nhiều thành phần, đảm bảo khớp với schema CSDL và API đã thiết kế.'),
  bullet('Thiết kế API theo chuẩn RESTful, đặc tả kèm ví dụ JSON thực tế dựa trên đúng cấu trúc dữ liệu đã định nghĩa ở bước trên.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG
// ---------------------------------------------------------------------------
const chapter2 = [
  h1('CHƯƠNG 2: CƠ SỞ LÝ THUYẾT VÀ CÔNG NGHỆ SỬ DỤNG'),

  h2('2.1. Tổng quan về Internet of Things (IoT)'),
  p('Internet of Things (IoT — Internet vạn vật) là mạng lưới các thiết bị vật lý được nhúng cảm biến, phần mềm và các công nghệ kết nối khác, cho phép thu thập và trao đổi dữ liệu qua Internet. Một hệ thống IoT hoàn chỉnh thường được mô hình hoá theo nhiều tầng (layer), mỗi tầng đảm nhiệm một vai trò riêng biệt — trình bày cụ thể ở mục 2.3.'),

  h2('2.2. Giao thức MQTT'),
  p('MQTT (Message Queuing Telemetry Transport) là giao thức truyền thông điệp dạng Publish/Subscribe, thiết kế nhẹ, tiêu tốn ít băng thông, phù hợp thiết bị IoT tài nguyên hạn chế. Kiến trúc MQTT gồm 3 thành phần: MQTT Broker (máy chủ trung gian phân phối message — đồ án dùng HiveMQ public broker), Publisher (bên gửi dữ liệu lên một Topic) và Subscriber (bên đăng ký lắng nghe Topic). Bảng 2.1 liệt kê toàn bộ Topic được thiết kế và sử dụng thống nhất trong toàn đồ án.'),
  simpleTable(
    ['Topic', 'Chiều truyền', 'Ý nghĩa'],
    [
      ['home/device/{id}/set', 'Backend → Hardware', 'Lệnh điều khiển bật/tắt thiết bị (id: 1=đèn, 2=quạt, 3=điều hòa)'],
      ['home/device/{id}/status', 'Hardware → Backend', 'Trạng thái thực tế của thiết bị sau khi xử lý lệnh'],
      ['home/sensor/1/data', 'Hardware → Backend', 'Dữ liệu nhiệt độ (°C), payload dạng { value, type, unit }'],
      ['home/sensor/2/data', 'Hardware → Backend', 'Dữ liệu độ ẩm (%), payload dạng { value, type, unit }'],
    ],
    [30, 25, 45]
  ),
  p(''),

  h2('2.3. Kiến trúc tổng thể hệ thống (mô hình 5 tầng)'),
  p('Hệ thống được tổ chức theo mô hình kiến trúc IoT 5 tầng: Perception (cảm biến & thiết bị) — Network (truyền dẫn) — Middleware/Processing (xử lý trung gian) — Application (ứng dụng) — Business (người dùng cuối). Hình 2.1 minh hoạ chi tiết cách áp dụng mô hình này vào đồ án.'),
  ...figure('diagrams/arch_1.png', 'Hình 2.1: Kiến trúc tổng thể hệ thống theo mô hình IoT 5 tầng', 480),
  p('Backend (Node.js/Express) đóng vai trò trung tâm ở Tầng 3: vừa là MQTT client (subscribe dữ liệu cảm biến/trạng thái, publish lệnh điều khiển), vừa chứa logic xử lý nghiệp vụ (rule engine đơn giản cho UC07 — so sánh giá trị cảm biến với ngưỡng cấu hình). Backend expose 2 kênh giao tiếp ở Tầng 4: REST API (yêu cầu/phản hồi) và Socket.io (đẩy dữ liệu một chiều thời gian thực), được Frontend ở Tầng 5 tiêu thụ đồng thời.'),

  h2('2.4. Vi điều khiển NodeMCU ESP8266 / ESP32'),
  p('NodeMCU là board phát triển tích hợp chip Wi-Fi (ESP8266 hoặc ESP32), lập trình bằng Arduino IDE, kết nối Internet trực tiếp không cần module mở rộng. Đồ án dùng board này để đọc cảm biến DHT11 (nhiệt độ, độ ẩm) và điều khiển 3 LED mô phỏng thiết bị điện, giao tiếp MQTT qua thư viện PubSubClient.'),

  h2('2.5. Công nghệ xây dựng Backend'),
  bullet('Node.js & Express.js: nền tảng JavaScript phía server, xây dựng RESTful API xử lý nghiệp vụ.'),
  bullet('MySQL 8: hệ quản trị CSDL quan hệ, lưu User, Device, Sensor, DataSensor, ActionHistory.'),
  bullet('MQTT.js: thư viện MQTT client cho Node.js, giúp Backend Subscribe/Publish với Broker.'),
  bullet('Socket.io: giao tiếp thời gian thực (WebSocket), đẩy dữ liệu mới xuống Frontend ngay khi có cập nhật.'),
  bullet('JWT (jsonwebtoken) + bcryptjs: xác thực người dùng bằng token, mật khẩu được băm trước khi lưu CSDL.'),

  h2('2.6. Công nghệ xây dựng Frontend'),
  p('Frontend xây dựng bằng ReactJS (Vite) theo hướng component, kết hợp React Router điều hướng 4 trang chính (Dashboard, Data Sensor, Action History, Profile) và Socket.io-client để nhận cập nhật thời gian thực từ Backend mà không cần tải lại trang.'),

  h2('2.7. Công cụ thiết kế và tài liệu hoá'),
  p('Giao diện người dùng (UI/UX) được phác thảo trước khi lập trình để hình dung bố cục, màu sắc, trải nghiệm người dùng (Chương 3, mục 3.2 trình bày kèm từng Use Case). Sơ đồ (Use Case, ERD, Sequence Diagram, kiến trúc) được vẽ bằng cú pháp Mermaid, dễ đọc, dễ chỉnh sửa và đồng bộ trực tiếp với mã nguồn tài liệu trong repository.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG
// ---------------------------------------------------------------------------
const chapter3Intro = [
  h1('CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG'),
  h2('3.1. Xây dựng cơ sở dữ liệu'),
  p('Cơ sở dữ liệu MySQL gồm 5 bảng: User, Device, Sensor, DataSensor, ActionHistory. Bảng dưới đây tóm tắt vai trò từng bảng trước khi đi vào chi tiết.'),
  caption('Danh sách các bảng CSDL và chức năng'),
  simpleTable(
    ['Bảng', 'Chức năng'],
    [
      ['User', 'Lưu thông tin tài khoản đăng nhập hệ thống'],
      ['Device', 'Quản lý 3 thiết bị điện: Đèn, Quạt, Điều hòa'],
      ['Sensor', 'Quản lý các cảm biến vật lý gắn trên board (nhiệt độ, độ ẩm)'],
      ['DataSensor', 'Lưu các giá trị đo được từ cảm biến theo thời gian (time-series)'],
      ['ActionHistory', 'Lưu lịch sử bật/tắt thiết bị, phân biệt do người dùng hay hệ thống tự kích hoạt'],
    ],
    [25, 75]
  ),
  p(''),
  p('Hình 3.1 trình bày sơ đồ ERD thể hiện quan hệ giữa các bảng; các bảng 3.1 - 3.5 bên dưới trình bày chi tiết từng cột của từng bảng (kiểu dữ liệu, ràng buộc, mô tả) làm cơ sở để hiện thực script SQL.'),
  ...figure('diagrams/erd_1.png', 'Hình 3.1: Sơ đồ ERD cơ sở dữ liệu', 480),

  caption('Bảng 3.1: Chi tiết bảng User'),
  columnTable([
    ['id', 'INT', 'PRIMARY KEY, AUTO_INCREMENT', 'Định danh duy nhất cho mỗi tài khoản'],
    ['full_name', 'VARCHAR(100)', 'NOT NULL', 'Họ tên hiển thị của người dùng, dùng ở trang Profile và Sidebar'],
    ['email', 'VARCHAR(150)', 'NOT NULL, UNIQUE', 'Dùng làm tên đăng nhập (login identifier), không trùng lặp'],
    ['password_hash', 'VARCHAR(255)', 'NOT NULL', 'Mật khẩu đã băm bằng bcryptjs (không lưu plaintext)'],
    ["role", "ENUM('admin','user')", "NOT NULL, DEFAULT 'user'", 'Phân quyền: admin quản lý thiết bị, user xem/điều khiển'],
    ['created_at', 'DATETIME', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP', 'Thời điểm tạo tài khoản'],
  ]),
  p(''),

  caption('Bảng 3.2: Chi tiết bảng Device'),
  columnTable([
    ['id', 'INT', 'PRIMARY KEY, AUTO_INCREMENT', 'Định danh thiết bị, dùng tạo topic MQTT (VD: id=1 → home/device/1/set)'],
    ['name', 'VARCHAR(100)', 'NOT NULL', 'Tên hiển thị (VD: "Đèn phòng khách")'],
    ["device_type", "ENUM('light','fan','air_conditioner')", 'NOT NULL', 'Loại thiết bị, ứng với 1 trong 3 LED mô phỏng trên board'],
    ['location', 'VARCHAR(100)', 'NULL', 'Vị trí lắp đặt (VD: "Phòng khách")'],
    ['mqtt_topic_control', 'VARCHAR(150)', 'NOT NULL', 'Topic Backend publish lệnh điều khiển xuống Hardware'],
    ['mqtt_topic_status', 'VARCHAR(150)', 'NOT NULL', 'Topic Hardware publish trạng thái thật lên Backend'],
    ["current_state", "ENUM('ON','OFF')", "NOT NULL, DEFAULT 'OFF'", 'Trạng thái hiện tại, đồng bộ theo trạng thái thật từ Hardware'],
    ['user_id', 'INT', 'NOT NULL, FOREIGN KEY → User(id)', 'Chủ sở hữu / người quản lý thiết bị'],
    ['created_at', 'DATETIME', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP', 'Thời điểm khởi tạo bản ghi thiết bị'],
    ['updated_at', 'DATETIME', 'NOT NULL, ON UPDATE CURRENT_TIMESTAMP', 'Thời điểm trạng thái được cập nhật gần nhất'],
  ]),
  p(''),

  caption('Bảng 3.3: Chi tiết bảng Sensor'),
  columnTable([
    ['id', 'INT', 'PRIMARY KEY, AUTO_INCREMENT', 'Định danh cảm biến, dùng tạo topic MQTT (VD: id=1 → home/sensor/1/data)'],
    ['name', 'VARCHAR(100)', 'NOT NULL', 'Tên hiển thị (VD: "Cảm biến nhiệt độ")'],
    ["sensor_type", "ENUM('temperature','humidity','light_intensity')", 'NOT NULL', 'Loại đại lượng đo được'],
    ['unit', 'VARCHAR(20)', 'NOT NULL', 'Đơn vị đo (°C, %, lux)'],
    ['mqtt_topic', 'VARCHAR(150)', 'NOT NULL', 'Topic Hardware publish giá trị đo lên Backend'],
    ['location', 'VARCHAR(100)', 'NULL', 'Vị trí lắp đặt cảm biến'],
    ['created_at', 'DATETIME', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP', 'Thời điểm khởi tạo bản ghi cảm biến'],
  ]),
  p(''),

  caption('Bảng 3.4: Chi tiết bảng DataSensor'),
  columnTable([
    ['id', 'BIGINT', 'PRIMARY KEY, AUTO_INCREMENT', 'Định danh bản ghi đo (BIGINT vì bảng tăng rất nhanh theo thời gian)'],
    ['sensor_id', 'INT', 'NOT NULL, FOREIGN KEY → Sensor(id)', 'Bản ghi này thuộc cảm biến nào'],
    ['value', 'FLOAT', 'NOT NULL', 'Giá trị đo được tại thời điểm recorded_at'],
    ['recorded_at', 'DATETIME', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP', 'Thời điểm ghi nhận; có index (sensor_id, recorded_at) để truy vấn biểu đồ nhanh'],
  ]),
  p(''),

  caption('Bảng 3.5: Chi tiết bảng ActionHistory'),
  columnTable([
    ['id', 'BIGINT', 'PRIMARY KEY, AUTO_INCREMENT', 'Định danh bản ghi hành động'],
    ['device_id', 'INT', 'NOT NULL, FOREIGN KEY → Device(id)', 'Thiết bị bị tác động'],
    ['user_id', 'INT', 'NOT NULL, FOREIGN KEY → User(id)', 'Người thực hiện (với triggered_by=system: user sở hữu thiết bị)'],
    ["action", "ENUM('ON','OFF')", 'NOT NULL', 'Lệnh được gửi đi'],
    ["triggered_by", "ENUM('user','system')", "NOT NULL, DEFAULT 'user'", "user = người dùng bấm nút (UC03); system = Backend tự sinh lệnh khi vượt ngưỡng (UC07)"],
    ["status", "ENUM('pending','success','failed','timeout')", "NOT NULL, DEFAULT 'pending'", 'Trạng thái xử lý lệnh'],
    ['triggered_at', 'DATETIME', 'NOT NULL, DEFAULT CURRENT_TIMESTAMP', 'Thời điểm lệnh được publish xuống MQTT'],
    ['responded_at', 'DATETIME', 'NULL', 'Thời điểm Hardware phản hồi trạng thái thật (null nếu đang pending)'],
  ]),
  p(''),
  p('Script SQL đầy đủ (CREATE TABLE + dữ liệu mẫu) được lưu tại backend/db/schema.sql, nội dung khớp hoàn toàn với các bảng chi tiết ở trên.'),
];

module.exports = { chapter1, chapter2, chapter3Intro, h1, h2, h3, p, bullet, caption, codeBlock, simpleTable, columnTable, usecaseTable, figure, titlePage, IMAGE_DIMS, ASSETS_DIR, BLUE, GRAY, DARK };
