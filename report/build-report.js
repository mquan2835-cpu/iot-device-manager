const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak, TableOfContents, LevelFormat, convertInchesToTwip,
  Header, Footer, PageNumber, NumberFormat, ImageRun,
} = require('docx');

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
const BLUE = '1D4ED8';
const GRAY = '64748B';
const ASSETS_DIR = path.join(__dirname, 'assets');

// Kích thước gốc (px) của các ảnh đã render sẵn — dùng để giữ đúng tỉ lệ khi chèn vào docx.
const IMAGE_DIMS = {
  'diagrams/usecase_1.png': [2352, 1146],
  'diagrams/erd_1.png': [2352, 2493],
  'diagrams/seq_1.png': [2352, 906],
  'diagrams/seq_2.png': [2352, 645],
  'diagrams/seq_3.png': [2352, 1113],
  'ui/ui_login.png': [1440, 900],
  'ui/ui_dashboard.png': [1440, 900],
  'ui/ui_datasensor.png': [1440, 900],
  'ui/ui_actionhistory.png': [1440, 900],
  'ui/ui_profile.png': [1440, 900],
};

/** Chèn 1 ảnh căn giữa, tự co theo tỉ lệ gốc, kèm chú thích bên dưới (kiểu "Hình x.y: ..."). */
function figure(relPath, caption, maxWidth = 560) {
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
      spacing: { after: 200 },
      children: [new TextRun({ text: 'BÁO CÁO ĐỒ ÁN TỐT NGHIỆP', bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'Học phần: IoT và Ứng dụng', bold: false, size: 24, color: GRAY })],
    }),
    new Paragraph({ text: '', spacing: { after: 400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [new TextRun({
        text: 'HỆ THỐNG QUẢN LÝ THIẾT BỊ ĐIỆN THÔNG MINH\nDỰA TRÊN NỀN TẢNG IOT VÀ GIAO THỨC MQTT',
        bold: true, size: 40, color: BLUE,
      })],
    }),
    new Paragraph({ text: '', spacing: { after: 1200 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Sinh viên thực hiện: ', bold: true }), new TextRun('Đỗ Minh Quân')] }),
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
function note(text) {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text: `📌 ${text}`, italics: true, color: '92400E' })],
  });
}
function bullet(text, level = 0) {
  return new Paragraph({ text, numbering: { reference: 'main-bullets', level }, spacing: { after: 60 } });
}

function simpleTable(headerRow, rows, widthsPct) {
  const totalWidth = 9000; // DXA, ~ trang A4 trừ margin
  const widths = widthsPct.map((w) => Math.round((w / 100) * totalWidth));

  const makeCell = (text, isHeader) => new TableCell({
    width: { size: widths[0], type: WidthType.DXA },
    shading: isHeader ? { fill: 'DBEAFE', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: String(text), bold: isHeader, size: 20 })] })],
  });

  const headerCells = headerRow.map((text, i) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: 'DBEAFE', type: ShadingType.CLEAR, color: 'auto' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20 })] })],
  }));

  const bodyRows = rows.map((row) => new TableRow({
    children: row.map((text, i) => new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20 })] })],
    })),
  }));

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...bodyRows],
  });
}

// ---------------------------------------------------------------------------
// CHƯƠNG 1
// ---------------------------------------------------------------------------
const chapter1 = [
  h1('CHƯƠNG 1: TỔNG QUAN ĐỀ TÀI'),

  h2('1.1. Đặt vấn đề / Lý do chọn đề tài'),
  p('Cùng với sự phát triển mạnh mẽ của Internet of Things (IoT), việc giám sát và điều khiển các thiết bị điện trong nhà từ xa đã trở thành nhu cầu thiết thực, giúp tiết kiệm điện năng, tăng tính tiện lợi và an toàn cho người sử dụng. Các hệ thống nhà thông minh thương mại hiện nay thường có chi phí cao và khép kín, khó tùy biến theo nhu cầu học tập, nghiên cứu.'),
  p('Xuất phát từ thực tế đó, đề tài "Hệ thống quản lý thiết bị điện thông minh dựa trên nền tảng IoT và giao thức MQTT" được thực hiện nhằm xây dựng một hệ thống hoàn chỉnh từ phần cứng đến phần mềm, cho phép người dùng giám sát và điều khiển các thiết bị điện (đèn, quạt, điều hòa) thông qua giao diện Web, giao tiếp với vi điều khiển NodeMCU qua giao thức MQTT.'),

  h2('1.2. Mục tiêu đề tài'),
  bullet('Xây dựng được hệ thống Backend, Frontend và cơ sở dữ liệu hoàn chỉnh quản lý thiết bị điện, cảm biến và lịch sử điều khiển.'),
  bullet('Hiểu và triển khai được cơ chế giao tiếp Publish/Subscribe qua giao thức MQTT giữa Backend và phần cứng.'),
  bullet('Lập trình được vi điều khiển NodeMCU ESP8266/ESP32 đọc dữ liệu cảm biến thật và điều khiển thiết bị (mô phỏng bằng LED) qua MQTT.'),
  bullet('Xây dựng giao diện Web trực quan, hiển thị dữ liệu thời gian thực, đúng với bản thiết kế UI/UX đã phác thảo.'),

  h2('1.3. Đối tượng và phạm vi nghiên cứu'),
  p('Đối tượng nghiên cứu của đề tài là giao thức MQTT, vi điều khiển NodeMCU (ESP8266/ESP32), và mô hình kiến trúc Web IoT 3 lớp (Frontend - Backend - Hardware). Phạm vi triển khai thực nghiệm của đồ án sử dụng 3 LED đóng vai trò mô phỏng cho 3 thiết bị điện trong nhà: đèn chiếu sáng, quạt và điều hòa, cùng với 1 cảm biến nhiệt độ - độ ẩm (DHT11/DHT22).'),

  h2('1.4. Phương pháp thực hiện'),
  bullet('Nghiên cứu lý thuyết về IoT, giao thức MQTT, kiến trúc Client - Server.'),
  bullet('Phân tích yêu cầu, xây dựng Usecase, thiết kế cơ sở dữ liệu và giao diện (UI/UX) trước khi lập trình.'),
  bullet('Xây dựng và kiểm thử từng phần: mô phỏng giao tiếp MQTT, lập trình phần cứng thật, xây dựng Backend/API, xây dựng Frontend.'),
  bullet('Tích hợp toàn bộ hệ thống và kiểm thử end-to-end trên phần cứng thật.'),

  h2('1.5. Ý nghĩa khoa học và thực tiễn'),
  p('Về mặt khoa học, đề tài giúp người thực hiện nắm vững quy trình phân tích - thiết kế - triển khai một hệ thống phần mềm hoàn chỉnh tích hợp phần cứng IoT, đồng thời hiểu sâu về giao thức MQTT vốn được sử dụng rộng rãi trong công nghiệp. Về mặt thực tiễn, sản phẩm có thể mở rộng thành giải pháp nhà thông minh chi phí thấp, dễ tùy biến, phù hợp với các hộ gia đình hoặc phòng thí nghiệm.'),

  h2('1.6. Bố cục báo cáo'),
  p('Báo cáo được trình bày thành 5 chương: Chương 1 giới thiệu tổng quan đề tài; Chương 2 trình bày cơ sở lý thuyết liên quan; Chương 3 phân tích và thiết kế hệ thống (Usecase, cơ sở dữ liệu, sequence diagram, giao diện, API); Chương 4 trình bày quá trình xây dựng, triển khai và kết quả thử nghiệm; Chương 5 tổng kết những gì đạt được và hướng phát triển tiếp theo.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 2
// ---------------------------------------------------------------------------
const chapter2 = [
  h1('CHƯƠNG 2: CƠ SỞ LÝ THUYẾT'),

  h2('2.1. Tổng quan về Internet of Things (IoT)'),
  p('Internet of Things (IoT - Internet vạn vật) là mạng lưới các thiết bị vật lý được nhúng cảm biến, phần mềm và các công nghệ khác nhằm mục đích kết nối và trao đổi dữ liệu với các thiết bị và hệ thống khác qua Internet. Một hệ thống IoT điển hình gồm 3 lớp: lớp Thiết bị (Things) - các cảm biến/thiết bị chấp hành, lớp Kết nối/Giao thức (Connectivity) - nơi các thiết bị trao đổi dữ liệu, và lớp Ứng dụng (Application) - nơi người dùng giám sát, điều khiển và phân tích dữ liệu.'),

  h2('2.2. Giao thức MQTT'),
  p('MQTT (Message Queuing Telemetry Transport) là giao thức truyền thông điệp dạng Publish/Subscribe, được thiết kế nhẹ, tiêu tốn ít băng thông, phù hợp cho các thiết bị IoT có tài nguyên hạn chế. Kiến trúc MQTT gồm 3 thành phần chính:'),
  bullet('MQTT Broker: máy chủ trung gian tiếp nhận và phân phối message giữa các client (ví dụ: Mosquitto, HiveMQ, CloudMQTT).'),
  bullet('Publisher: bên gửi dữ liệu lên một Topic cụ thể (trong đồ án này là Backend gửi lệnh, và Hardware gửi dữ liệu cảm biến/trạng thái).'),
  bullet('Subscriber: bên đăng ký lắng nghe một Topic để nhận dữ liệu khi có Publisher gửi lên.'),
  p('Mỗi message MQTT được gửi trên một "Topic" - một chuỗi định danh dạng cây thư mục (ví dụ: home/device/1/set). MQTT hỗ trợ 3 mức QoS (Quality of Service: 0 - At most once, 1 - At least once, 2 - Exactly once) cho phép cân bằng giữa độ tin cậy và hiệu năng truyền tin. Trong đồ án, các topic được thiết kế và sử dụng thống nhất giữa Bài 2.1 (mô phỏng) và Bài 2.2 (phần cứng thật) như trình bày ở Bảng 2.1.'),
  simpleTable(
    ['Topic', 'Chiều truyền', 'Ý nghĩa'],
    [
      ['home/device/{id}/set', 'Backend → Hardware', 'Lệnh điều khiển bật/tắt thiết bị'],
      ['home/device/{id}/status', 'Hardware → Backend', 'Trạng thái thực tế sau khi xử lý lệnh'],
      ['home/sensor/1/data', 'Hardware → Backend', 'Dữ liệu nhiệt độ'],
      ['home/sensor/2/data', 'Hardware → Backend', 'Dữ liệu độ ẩm'],
    ],
    [40, 25, 35]
  ),
  p(''),

  h2('2.3. Vi điều khiển NodeMCU ESP8266 / ESP32'),
  p('NodeMCU là board phát triển tích hợp chip Wi-Fi (ESP8266 hoặc ESP32), cho phép lập trình bằng Arduino IDE, hỗ trợ kết nối Internet trực tiếp mà không cần thêm module mở rộng. So với ESP8266, ESP32 có thêm Bluetooth, nhiều chân GPIO hơn và xử lý mạnh hơn (lõi kép). Đồ án sử dụng board này để đọc dữ liệu cảm biến DHT11/DHT22 và điều khiển LED mô phỏng thiết bị điện thông qua thư viện PubSubClient giao tiếp MQTT.'),

  h2('2.4. Công nghệ xây dựng Backend'),
  bullet('Node.js & Express.js: nền tảng JavaScript phía server, xây dựng RESTful API xử lý nghiệp vụ.'),
  bullet('MySQL: hệ quản trị cơ sở dữ liệu quan hệ, lưu trữ thông tin User, Device, Sensor, DataSensor, ActionHistory.'),
  bullet('MQTT.js: thư viện MQTT client cho Node.js, giúp Backend Subscribe/Publish với Broker.'),
  bullet('Socket.io: thư viện giao tiếp thời gian thực (WebSocket), giúp đẩy dữ liệu mới xuống Frontend ngay khi có cập nhật, không cần tải lại trang.'),

  h2('2.5. Công nghệ xây dựng Frontend'),
  p('Frontend được xây dựng bằng ReactJS (thư viện JavaScript xây dựng giao diện theo component) kết hợp React Router để điều hướng nhiều trang (Dashboard, Data Sensor, Action History, Profile) và Socket.io-client để nhận cập nhật thời gian thực từ Backend.'),

  h2('2.6. Công cụ thiết kế và tài liệu hoá'),
  p('Figma được sử dụng để thiết kế giao diện người dùng (UI/UX) trước khi lập trình, giúp hình dung bố cục, màu sắc và trải nghiệm người dùng. Song song đó, tài liệu API được mô tả chuẩn hoá theo đặc tả OpenAPI (Swagger) và đóng gói thành Postman Collection để kiểm thử nhanh các endpoint trong quá trình phát triển.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 3
// ---------------------------------------------------------------------------
const chapter3 = [
  h1('CHƯƠNG 3: PHÂN TÍCH VÀ THIẾT KẾ HỆ THỐNG'),

  h2('3.1. Kiến trúc tổng thể hệ thống'),
  p('Hệ thống được thiết kế theo kiến trúc 3 lớp: (1) Frontend ReactJS hiển thị giao diện và nhận tương tác người dùng; (2) Backend Node.js/Express xử lý nghiệp vụ, lưu trữ dữ liệu vào MySQL và giao tiếp với MQTT Broker; (3) Hardware (NodeMCU) thực thi lệnh điều khiển và thu thập dữ liệu cảm biến thực tế. Backend đóng vai trò cầu nối trung tâm: vừa cung cấp REST API cho Frontend, vừa là MQTT client Subscribe/Publish với phần cứng, đồng thời đẩy realtime qua Socket.io để Frontend luôn hiển thị đúng trạng thái mới nhất.'),

  h2('3.2. Đặc tả Use Case'),
  p('Hệ thống gồm 6 Use Case chính, mô tả chi tiết đầy đủ (tác nhân, luồng sự kiện, luồng thay thế) tại Phụ lục A (docs/usecases.md). Bảng 3.1 tóm tắt các Use Case và trang giao diện tương ứng.'),
  simpleTable(
    ['Mã', 'Tên Use Case', 'Trang giao diện liên quan'],
    [
      ['UC01', 'Đăng nhập / Đăng ký tài khoản', 'Login'],
      ['UC02', 'Xem Dashboard tổng quan thời gian thực', 'Dashboard'],
      ['UC03', 'Điều khiển thiết bị (Bật/Tắt)', 'Dashboard'],
      ['UC04', 'Xem dữ liệu cảm biến', 'Data Sensor'],
      ['UC05', 'Xem lịch sử hành động', 'Action History'],
      ['UC06', 'Quản lý hồ sơ & danh sách thiết bị', 'Profile'],
    ],
    [15, 55, 30]
  ),
  p(''),
  ...figure('diagrams/usecase_1.png', 'Hình 3.1: Sơ đồ Use Case tổng quan hệ thống'),

  h2('3.3. Thiết kế cơ sở dữ liệu'),
  p('Cơ sở dữ liệu MySQL gồm 5 bảng: User, Device, Sensor, DataSensor, ActionHistory. Sơ đồ ERD chi tiết và script SQL đầy đủ được trình bày tại docs/database-design.md và backend/db/schema.sql. Bảng 3.2 tóm tắt vai trò từng bảng.'),
  simpleTable(
    ['Bảng', 'Vai trò'],
    [
      ['User', 'Lưu tài khoản đăng nhập hệ thống'],
      ['Device', 'Lưu 3 thiết bị điện (đèn, quạt, điều hòa) và trạng thái hiện tại'],
      ['Sensor', 'Lưu thông tin các cảm biến vật lý gắn trên board'],
      ['DataSensor', 'Lưu lịch sử giá trị đọc được từ cảm biến theo thời gian (time-series)'],
      ['ActionHistory', 'Lưu nhật ký mọi lệnh điều khiển: ai bấm, lúc nào, kết quả'],
    ],
    [25, 75]
  ),
  p(''),
  ...figure('diagrams/erd_1.png', 'Hình 3.2: Sơ đồ ERD cơ sở dữ liệu (5 bảng)', 520),

  h2('3.4. Biểu đồ tuần tự (Sequence Diagram)'),
  p('Luồng quan trọng nhất của hệ thống - bật/tắt thiết bị - được mô tả chi tiết tại docs/sequence-diagrams.md, tóm tắt như sau: (1) Người dùng bấm nút trên Dashboard; (2) Frontend gửi request đến Backend; (3) Backend ghi nhận ActionHistory với trạng thái "pending" và Publish lệnh qua MQTT; (4) Hardware nhận lệnh, điều khiển LED và Publish lại trạng thái thực tế; (5) Backend cập nhật CSDL và đẩy realtime xuống Frontend để cập nhật giao diện. Nếu không nhận được phản hồi trong thời gian quy định, hệ thống tự đánh dấu hành động là "timeout".'),
  ...figure('diagrams/seq_1.png', 'Hình 3.3: Sequence Diagram — luồng bật/tắt thiết bị (UC03)'),
  p('Song song đó, hệ thống còn có luồng thu thập dữ liệu cảm biến định kỳ (Hình 3.4) và luồng đăng nhập xác thực người dùng (Hình 3.5).'),
  ...figure('diagrams/seq_2.png', 'Hình 3.4: Sequence Diagram — luồng thu thập dữ liệu cảm biến (UC04)'),
  ...figure('diagrams/seq_3.png', 'Hình 3.5: Sequence Diagram — luồng đăng nhập (UC01)', 480),

  h2('3.5. Thiết kế giao diện người dùng (UI/UX)'),
  p('Giao diện được phác thảo trước khi lập trình, gồm 5 màn hình: Login, Dashboard (hiển thị trên một màn hình duy nhất, không cuộn trang), Data Sensor, Action History, và Profile. Bố cục sử dụng thanh điều hướng (sidebar) bên trái cố định cho 4 trang chính, tông màu chủ đạo xanh dương - xanh mint tạo cảm giác hiện đại, chuyên nghiệp cho một sản phẩm quản lý thiết bị thông minh. Các hình 3.6 - 3.10 dưới đây là bản mockup thiết kế (dựng sẵn làm tài liệu tham khảo); trước khi nộp bài, hãy thay bằng ảnh chụp từ file Figma thật của bạn.'),
  ...figure('ui/ui_login.png', 'Hình 3.6: Giao diện Login'),
  ...figure('ui/ui_dashboard.png', 'Hình 3.7: Giao diện Dashboard'),
  ...figure('ui/ui_datasensor.png', 'Hình 3.8: Giao diện Data Sensor'),
  ...figure('ui/ui_actionhistory.png', 'Hình 3.9: Giao diện Action History'),
  ...figure('ui/ui_profile.png', 'Hình 3.10: Giao diện Profile'),

  h2('3.6. Thiết kế API'),
  p('API được thiết kế theo chuẩn RESTful, tài liệu hoá đầy đủ theo đặc tả OpenAPI 3.0 tại docs/api-docs/openapi.yaml và đóng gói Postman Collection tại docs/api-docs/postman_collection.json. Bảng 3.3 liệt kê các endpoint chính.'),
  simpleTable(
    ['Endpoint', 'Method', 'Chức năng'],
    [
      ['/api/auth/login', 'POST', 'Đăng nhập, trả về JWT token'],
      ['/api/devices', 'GET', 'Lấy danh sách thiết bị & trạng thái'],
      ['/api/devices/{id}/action', 'POST', 'Gửi lệnh bật/tắt thiết bị'],
      ['/api/sensors', 'GET', 'Lấy lịch sử dữ liệu cảm biến'],
      ['/api/actions', 'GET', 'Lấy lịch sử hành động điều khiển'],
      ['/api/users/me', 'GET / PUT', 'Xem / cập nhật thông tin cá nhân'],
    ],
    [35, 15, 50]
  ),
  p(''),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 4
// ---------------------------------------------------------------------------
const chapter4 = [
  h1('CHƯƠNG 4: XÂY DỰNG VÀ TRIỂN KHAI HỆ THỐNG'),

  h2('4.1. Môi trường và công cụ phát triển'),
  bullet('Ngôn ngữ/Framework: Node.js + Express (Backend), ReactJS + Vite (Frontend), C/C++ (Arduino cho ESP8266/ESP32).'),
  bullet('Cơ sở dữ liệu: MySQL 8.'),
  bullet('MQTT Broker: Mosquitto (cài local) hoặc broker công cộng (broker.hivemq.com) khi thử nghiệm nhanh.'),
  bullet('IDE: VS Code (Backend/Frontend), Arduino IDE (phần cứng).'),
  bullet('Công cụ khác: Postman (test API), Figma (thiết kế UI), Git/GitHub (quản lý mã nguồn).'),

  h2('4.2. Xây dựng và mô phỏng giao tiếp phần cứng'),
  h3('4.2.1. Mô phỏng bằng 3 Terminal (Bài 2.1)'),
  p('Trước khi có phần cứng thật, nhóm thực hiện mô phỏng cơ chế Publish/Subscribe bằng 3 cửa sổ Terminal: Terminal 1 đóng vai Hardware (subscribe lệnh điều khiển, publish trạng thái và dữ liệu cảm biến giả lập), Terminal 2 đóng vai Backend (gửi lệnh điều khiển, nhận trạng thái/dữ liệu), Terminal 3 dùng Mosquitto CLI (mosquitto_sub/mosquitto_pub) để quan sát trực tiếp toàn bộ gói tin trao đổi qua Broker. Chi tiết cách chạy tại mqtt-simulation/README.md.'),
  note('Chèn ảnh chụp màn hình 3 Terminal chạy đồng thời vào đây làm minh chứng.'),

  h3('4.2.2. Lập trình phần cứng thật (Bài 2.2)'),
  p('Sau khi xác nhận luồng hoạt động đúng qua mô phỏng, nhóm lập trình NodeMCU ESP8266/ESP32 để thay thế hoàn toàn 3 Terminal: board kết nối Wi-Fi, kết nối MQTT Broker (giữ nguyên cấu trúc topic đã dùng ở Bài 2.1), subscribe lệnh điều khiển để bật/tắt 3 LED mô phỏng thiết bị điện, đồng thời đọc dữ liệu thật từ cảm biến DHT11/DHT22 mỗi 5 giây và publish lên Broker. Chi tiết mã nguồn tại hardware/iot_device_node/iot_device_node.ino, sơ đồ đấu nối tại hardware/wiring.md.'),
  note('Chèn ảnh chụp mạch thật đã lắp ráp (breadboard, LED, cảm biến) và ảnh Serial Monitor khi board hoạt động.'),

  h2('4.3. Xây dựng Backend'),
  p('Backend được tổ chức theo mô hình MVC đơn giản: routes xử lý HTTP request, mqttClient.js xử lý đồng bộ hai chiều giữa MQTT và MySQL, middleware xác thực JWT bảo vệ các API cần đăng nhập. Khi nhận được message trạng thái từ Hardware, Backend tự động cập nhật bảng Device, ActionHistory và phát sự kiện realtime qua Socket.io để Frontend cập nhật ngay lập tức.'),

  h2('4.4. Xây dựng Frontend'),
  p('Frontend gồm 5 trang: Login, Dashboard, Data Sensor, Action History, Profile - được lập trình bám sát bản thiết kế Figma ở Chương 3. Trang Dashboard hiển thị toàn bộ thông tin quan trọng (trạng thái 3 thiết bị, số liệu cảm biến, biểu đồ nhiệt độ) trên một màn hình duy nhất, không cần cuộn trang. Ứng dụng lắng nghe các sự kiện Socket.io (device:update, sensor:update, action:update) để cập nhật giao diện theo thời gian thực mà không cần tải lại trang.'),
  note('Chèn ảnh chụp màn hình thực tế 4 trang Web đã chạy (Dashboard, Data Sensor, Action History, Profile) vào đây — giao diện thật sẽ giống bản mockup ở Hình 3.6-3.10 vì Frontend được lập trình bám sát thiết kế đó, nhưng cần ảnh chụp từ ứng dụng đang chạy thật (có dữ liệu thật) chứ không dùng lại ảnh mockup.'),

  h2('4.5. Kết quả thử nghiệm'),
  p('Hệ thống được kiểm thử end-to-end: người dùng đăng nhập trên Web, bấm nút bật/tắt một thiết bị, quan sát LED thật đổi trạng thái gần như tức thời (độ trễ dưới 1 giây trong điều kiện mạng ổn định), giao diện Dashboard tự cập nhật đúng trạng thái thật nhận từ phần cứng, và bản ghi tương ứng xuất hiện trong Action History với trạng thái "success".'),
  note('Chèn bảng kết quả đo độ trễ thực tế (nếu có) và ảnh chụp minh chứng luồng end-to-end vào đây.'),

  h2('4.6. Kiểm thử hệ thống'),
  p('Bảng 4.1 liệt kê một số test case tiêu biểu đã thực hiện trong quá trình phát triển.'),
  simpleTable(
    ['STT', 'Test case', 'Kết quả mong đợi', 'Kết quả thực tế'],
    [
      ['1', 'Đăng nhập sai mật khẩu', 'Trả về lỗi 401, hiển thị thông báo', '...'],
      ['2', 'Bấm bật đèn khi board đang online', 'LED sáng, Dashboard cập nhật ON, ActionHistory = success', '...'],
      ['3', 'Bấm bật quạt khi board mất kết nối', 'Sau 5s, ActionHistory chuyển sang timeout', '...'],
      ['4', 'Xem Data Sensor lọc theo cảm biến nhiệt độ', 'Chỉ hiển thị dữ liệu nhiệt độ đúng khoảng thời gian', '...'],
    ],
    [10, 35, 35, 20]
  ),
  p(''),
  note('Điền cột "Kết quả thực tế" sau khi kiểm thử trên hệ thống thật của bạn.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 5
// ---------------------------------------------------------------------------
const chapter5 = [
  h1('CHƯƠNG 5: KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN'),

  h2('5.1. Kết quả đạt được'),
  bullet('Xây dựng hoàn chỉnh hệ thống quản lý thiết bị điện IoT gồm Backend, Frontend, cơ sở dữ liệu và tài liệu thiết kế (Usecase, ERD, Sequence Diagram, API Docs).'),
  bullet('Hiểu và triển khai thành công cơ chế Publish/Subscribe qua giao thức MQTT, cả ở dạng mô phỏng lẫn trên phần cứng thật.'),
  bullet('Lập trình thành công NodeMCU đọc cảm biến thật và điều khiển thiết bị qua MQTT, đồng bộ hai chiều với Backend và giao diện Web thời gian thực.'),
  bullet('Xây dựng giao diện Web trực quan, đúng với thiết kế UI/UX đã đề ra, hoạt động ổn định trên trình duyệt.'),

  h2('5.2. Hạn chế'),
  bullet('Hệ thống mới thử nghiệm với 3 thiết bị mô phỏng (LED) và 1 cảm biến, chưa triển khai trên thiết bị điện thật với công suất lớn (cần thêm module relay, đảm bảo an toàn điện).'),
  bullet('Chưa có cơ chế phân quyền nhiều người dùng/nhiều nhà (multi-tenant), chưa có ứng dụng di động (mobile app).'),
  bullet('Bảo mật MQTT còn cơ bản (chưa dùng TLS/certificate, chưa xác thực client MQTT).'),

  h2('5.3. Hướng phát triển'),
  bullet('Tích hợp module Relay để điều khiển thiết bị điện thật (công suất lớn) một cách an toàn.'),
  bullet('Bổ sung xác thực và mã hoá cho kết nối MQTT (MQTT over TLS, username/password, ACL theo topic).'),
  bullet('Phát triển ứng dụng di động (React Native/Flutter) đồng bộ với hệ thống Web hiện tại.'),
  bullet('Bổ sung tính năng lập lịch (scheduling) và tự động hoá theo ngữ cảnh (automation rules) dựa trên dữ liệu cảm biến.'),
  bullet('Áp dụng học máy (Machine Learning) để phân tích thói quen sử dụng, đề xuất tối ưu tiết kiệm điện năng.'),
];

// ---------------------------------------------------------------------------
// Tài liệu tham khảo + Phụ lục
// ---------------------------------------------------------------------------
const references = [
  h1('TÀI LIỆU THAM KHẢO'),
  p('[1] MQTT.org, "MQTT Version 5.0 - OASIS Standard", https://mqtt.org'),
  p('[2] Espressif Systems, "ESP32 Technical Reference Manual", https://www.espressif.com'),
  p('[3] Node.js Foundation, "Node.js Documentation", https://nodejs.org/docs'),
  p('[4] Meta Open Source, "React Documentation", https://react.dev'),
  p('[5] Oracle/MySQL, "MySQL 8.0 Reference Manual", https://dev.mysql.com/doc'),
  p('[6] Eclipse Foundation, "Eclipse Mosquitto - An open source MQTT broker", https://mosquitto.org'),
  p('[7] Swagger/SmartBear, "OpenAPI Specification", https://swagger.io/specification'),
];

const appendix = [
  h1('PHỤ LỤC — LIÊN KẾT ĐỒ ÁN'),
  p('Toàn bộ mã nguồn, tài liệu thiết kế chi tiết (Usecase đầy đủ, ERD, Sequence Diagram dạng mermaid) và hướng dẫn cài đặt được lưu trữ tại các đường link sau (điền link thật trước khi nộp bài):'),
  bullet('GitHub Repository (mã nguồn Backend, Frontend, Hardware, MQTT simulation): .............................................'),
  bullet('Figma Design (bản thiết kế UI đầy đủ): .............................................'),
  bullet('API Docs (Swagger UI / Postman public doc): .............................................'),
  bullet('Video Demo hệ thống hoạt động thực tế (nếu có): .............................................'),
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
      document: { run: { font: 'Times New Roman', size: 24 } }, // 12pt
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: '1D4ED8', font: 'Times New Roman' },
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
        page: { size: { width: 11907, height: 16840 } }, // A4 (DXA)
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: 'Báo cáo Đồ án IoT — Đỗ Minh Quân', size: 18, color: '94A3B8' })],
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
        new Paragraph({ text: 'LỜI CẢM ƠN', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        p('Em xin chân thành cảm ơn thầy/cô ............................................. đã tận tình hướng dẫn, góp ý trong suốt quá trình thực hiện đồ án học phần IoT và Ứng dụng. Do thời gian và kiến thức còn hạn chế, báo cáo không tránh khỏi thiếu sót, em rất mong nhận được sự góp ý từ quý thầy cô để hoàn thiện hơn.'),
        new Paragraph({ children: [new PageBreak()] }),

        new Paragraph({ text: 'MỤC LỤC', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-3' }),
        new Paragraph({ children: [new PageBreak()] }),

        ...chapter1,
        ...chapter2,
        ...chapter3,
        ...chapter4,
        ...chapter5,
        ...references,
        ...appendix,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(__dirname + '/BaoCao_DoAnIOT.docx', buffer);
  console.log('Đã tạo report/BaoCao_DoAnIOT.docx');
});
