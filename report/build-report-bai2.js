/**
 * Sinh báo cáo RIÊNG cho Bài 2 — Lập trình giao tiếp MQTT:
 *   Bài 2.1: mô phỏng hệ thống bằng 3 Terminal (mqtt-simulation/)
 *   Bài 2.2: lập trình phần cứng thật ESP32-C3 Super Mini (firmware hỗ trợ cả ESP8266/ESP32) (hardware/)
 *
 * Dùng chung bộ helper định dạng với báo cáo Bài 1 (build-report-bai1.js) để hai báo cáo đồng bộ phong cách.
 * Các đoạn mã nguồn trong báo cáo được TRÍCH TRỰC TIẾP từ file nguồn lúc build, nên luôn khớp với code thật.
 *
 * Chạy: node build-report-bai2.js
 */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak, TableOfContents, LevelFormat, Header, Footer, PageNumber,
} = require('docx');
const {
  h1, h2, h3, p, bullet, caption, codeBlock, simpleTable, figure, IMAGE_DIMS, ASSETS_DIR, BLUE, GRAY, DARK,
} = require('./build-report-bai1');

const ROOT = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Helper riêng cho Bài 2
// ---------------------------------------------------------------------------

/** Đọc kích thước ảnh PNG từ header (IHDR) để figure() giữ đúng tỉ lệ. */
function registerPng(relPath) {
  const buf = fs.readFileSync(path.join(ASSETS_DIR, relPath));
  IMAGE_DIMS[relPath] = [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  return relPath;
}
const IMG = {};
['b2_pubsub', 'b2_three_terminals', 'b2_topic_tree', 'b2_seq_sim', 'b2_hw_block', 'b2_wiring',
  'b2_fw_setup', 'b2_fw_loop', 'b2_callback_flow', 'b2_wiring_c3'].forEach((n) => { IMG[n] = registerPng(`diagrams/bai2/${n}.png`); });

/** Trích một khối mã từ file nguồn: từ dòng chứa `startMarker` tới dòng đóng `endLine` đầu tiên. */
function extract(relFile, startMarker, endLine = '}') {
  const lines = fs.readFileSync(path.join(ROOT, relFile), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.includes(startMarker));
  if (start < 0) throw new Error(`Không tìm thấy "${startMarker}" trong ${relFile}`);
  let end = start;
  while (end < lines.length && lines[end] !== endLine) end++;
  return lines.slice(start, end + 1).join('\n');
}

/** Ô khung vàng nét đứt đánh dấu chỗ sinh viên PHẢI chèn ảnh chụp thật của chính mình. */
function evidenceBox(title, details) {
  const border = { style: BorderStyle.DASHED, size: 8, color: 'D97706' };
  return [
    new Table({
      width: { size: 9000, type: WidthType.DXA },
      columnWidths: [9000],
      rows: [new TableRow({
        children: [new TableCell({
          width: { size: 9000, type: WidthType.DXA },
          shading: { fill: 'FEF3C7', type: ShadingType.CLEAR, color: 'auto' },
          borders: { top: border, bottom: border, left: border, right: border },
          margins: { top: 160, bottom: 160, left: 200, right: 200 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: `[CHÈN ẢNH CHỤP THẬT] ${title}`, bold: true, color: 'B45309', size: 22 })] }),
            new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: details, italics: true, color: '92400E', size: 20 })] }),
          ],
        })],
      })],
    }),
    new Paragraph({ text: '', spacing: { after: 160 } }),
  ];
}

/** Nhãn đứng ngay trên khối log — giữ liền trang với khối log bên dưới. */
function logCap(text) {
  return new Paragraph({ keepNext: true, spacing: { before: 60, after: 60 }, children: [new TextRun({ text, bold: true, size: 20 })] });
}

function titlePage() {
  const c = (text, opts = {}, after = 0) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after }, children: [new TextRun({ text, ...opts })] });
  return [
    c('TRƯỜNG ĐẠI HỌC ..........................', {}, 40),
    c('KHOA CÔNG NGHỆ THÔNG TIN', {}, 400),
    new Paragraph({ text: '', spacing: { after: 800 } }),
    c('BÁO CÁO BÀI TẬP LỚN', { bold: true, size: 32 }, 100),
    c('Học phần: IoT và Ứng dụng', { size: 24, color: GRAY }, 60),
    c('Bài 2: Lập trình giao tiếp MQTT', { bold: true, size: 26, color: BLUE }, 60),
    c('(2.1 Mô phỏng bằng 3 Terminal — 2.2 Lập trình phần cứng ESP32-C3)', { size: 22, color: GRAY }, 400),
    new Paragraph({ text: '', spacing: { after: 400 } }),
    c('HỆ THỐNG QUẢN LÝ THIẾT BỊ ĐIỆN THÔNG MINH', { bold: true, size: 36, color: DARK }, 0),
    c('DỰA TRÊN NỀN TẢNG IOT VÀ GIAO THỨC MQTT', { bold: true, size: 36, color: DARK }, 800),
    new Paragraph({ text: '', spacing: { after: 800 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Sinh viên thực hiện: ', bold: true }), new TextRun('Đỗ Minh Quân')] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MSSV: ', bold: true }), new TextRun('..........................................')] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Giảng viên hướng dẫn: ', bold: true }), new TextRun('..........................................')] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Lớp: ', bold: true }), new TextRun('..........................................')] }),
    new Paragraph({ text: '', spacing: { after: 1000 } }),
    c('Tháng 10 năm 2026'),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ---------------------------------------------------------------------------
// Danh mục hình & từ viết tắt
// ---------------------------------------------------------------------------
const FIGURES = [
  ['Hình 2.1', 'Mô hình Publish/Subscribe qua MQTT Broker trong đồ án'],
  ['Hình 3.1', 'Kiến trúc mô phỏng hệ thống bằng 3 Terminal'],
  ['Hình 3.2', 'Cây topic MQTT của hệ thống'],
  ['Hình 3.3', 'Sequence Diagram — luồng gói tin giữa 3 Terminal (kịch bản 1 và 2)'],
  ['Hình 4.1', 'Sơ đồ khối phần cứng'],
  ['Hình 4.2', 'Sơ đồ nguyên lý đấu nối ESP32-C3 Super Mini — 3 LED — DHT11'],
  ['Hình 4.3', 'Lưu đồ hàm setup()'],
  ['Hình 4.4', 'Lưu đồ hàm loop()'],
  ['Hình 4.5', 'Lưu đồ hàm xử lý lệnh onMqttMessage()'],
];
const ABBREVIATIONS = [
  ['IoT', 'Internet of Things — Internet vạn vật'],
  ['MQTT', 'Message Queuing Telemetry Transport — giao thức Publish/Subscribe nhẹ cho IoT'],
  ['Pub/Sub', 'Publish/Subscribe — mô hình xuất bản/đăng ký nhận tin'],
  ['QoS', 'Quality of Service — mức đảm bảo chuyển phát bản tin của MQTT (0, 1, 2)'],
  ['LWT', 'Last Will and Testament — bản tin "di chúc" Broker tự gửi khi client mất kết nối bất thường'],
  ['TCP/IP', 'Transmission Control Protocol / Internet Protocol — tầng vận chuyển của MQTT'],
  ['JSON', 'JavaScript Object Notation — định dạng payload của các bản tin'],
  ['GPIO', 'General Purpose Input/Output — chân vào/ra đa dụng của vi điều khiển'],
  ['MCU', 'Microcontroller Unit — vi điều khiển'],
  ['ESP32-C3 / ESP32 / ESP8266', 'Các dòng vi điều khiển tích hợp Wi-Fi của Espressif Systems'],
  ['USB CDC', 'USB Communications Device Class — cổng Serial ảo qua USB trực tiếp của ESP32-C3'],
  ['DHT11', 'Cảm biến kỹ thuật số đo nhiệt độ và độ ẩm, giao tiếp 1 dây'],
  ['LED', 'Light Emitting Diode — đèn mô phỏng thiết bị điện trong đồ án'],
  ['SSID', 'Service Set Identifier — tên mạng Wi-Fi'],
  ['CLI', 'Command Line Interface — giao diện dòng lệnh (Terminal)'],
  ['IDE', 'Integrated Development Environment — môi trường lập trình (Arduino IDE)'],
];
const figuresListPage = [
  new Paragraph({ text: 'DANH MỤC CÁC HÌNH VẼ', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
  simpleTable(['Hình', 'Tên hình'], FIGURES, [15, 85]),
  new Paragraph({ children: [new PageBreak()] }),
];
const abbreviationsPage = [
  new Paragraph({ text: 'DANH MỤC CÁC TỪ VIẾT TẮT', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
  simpleTable(['Viết tắt', 'Ý nghĩa'], ABBREVIATIONS, [22, 78]),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 1 — GIỚI THIỆU
// ---------------------------------------------------------------------------
const chapter1 = [
  h1('CHƯƠNG 1. GIỚI THIỆU'),
  h2('1.1. Mục tiêu của Bài 2'),
  p('Ở Bài 1, hệ thống quản lý thiết bị điện thông minh đã được phân tích và thiết kế đầy đủ: 7 Use Case, cơ sở dữ liệu 5 bảng, bộ API RESTful và đặc biệt là cấu trúc topic MQTT cùng các Sequence Diagram mô tả cách Backend và phần cứng trao đổi bản tin. Bài 2 hiện thực hoá phần "xương sống" giao tiếp đó — lớp truyền thông MQTT giữa phần mềm và phần cứng — theo hai bước nối tiếp nhau.'),
  p('Bài 2.1 mô phỏng toàn bộ hệ thống bằng 3 cửa sổ Terminal, chưa cần đến bất kỳ linh kiện nào: Terminal 1 đóng vai board vi điều khiển (3 LED và cảm biến DHT11), Terminal 2 đóng vai Backend gửi lệnh và chờ phản hồi, Terminal 3 đóng vai người quan sát Broker để thấy tận mắt mọi gói tin đi qua. Mục tiêu là hiểu và kiểm chứng cơ chế Publish/Subscribe, cấu trúc topic, định dạng payload và các nhánh xử lý (thành công, mất kết nối, vượt ngưỡng nhiệt độ) trước khi đụng tới phần cứng.'),
  p('Bài 2.2 thay Terminal 1 bằng phần cứng thật: lập trình board ESP32-C3 Super Mini (firmware đồng thời biên dịch được cho NodeMCU ESP8266 và ESP32 DevKit) kết nối Wi-Fi, kết nối MQTT Broker, nhận lệnh để bật/tắt 3 LED thật và đọc cảm biến DHT11 thật rồi gửi dữ liệu lên Broker. Vì board dùng đúng bộ topic và payload đã kiểm chứng ở Bài 2.1, Terminal 2 (và sau này là Backend thật ở Bài 3) không phải thay đổi gì khi chuyển từ mô phỏng sang phần cứng.'),
  h2('1.2. Sản phẩm của Bài 2'),
  caption('Bảng 1.1: Các sản phẩm bàn giao của Bài 2'),
  simpleTable(['Hạng mục', 'Vị trí trong mã nguồn', 'Mô tả'], [
    ['2.1 — Terminal 1', 'mqtt-simulation/terminal1_hardware_simulator.js', 'Giả lập board vi điều khiển: nhận lệnh, giả lập digitalWrite, phản hồi trạng thái, phát dữ liệu cảm biến; có lệnh offline/online/temp để tái hiện tình huống lỗi'],
    ['2.1 — Terminal 2', 'mqtt-simulation/terminal2_backend_simulator.js', 'Giả lập Backend: gửi lệnh, đếm timeout 5 giây, xử lý phản hồi, tự bật Điều hòa khi nhiệt độ vượt 32°C'],
    ['2.1 — Terminal 3', 'mqtt-simulation/terminal3_monitor.js (hoặc mosquitto_sub)', 'Quan sát mọi bản tin trên topic home/#'],
    ['2.1 — Hướng dẫn', 'mqtt-simulation/README.md', 'Cài Broker, cách chạy 3 Terminal, 3 kịch bản cần chụp ảnh'],
    ['2.2 — Firmware', 'hardware/iot_device_node/iot_device_node.ino', 'Chương trình Arduino cho ESP32-C3 (và ESP8266/ESP32)'],
    ['2.2 — Đấu nối', 'hardware/wiring.md', 'Danh sách linh kiện, bảng chân, sơ đồ đấu nối, các bước nạp code'],
  ], [18, 36, 46]),
  p(''),
  h2('1.3. Môi trường và công cụ'),
  caption('Bảng 1.2: Phần mềm, thư viện sử dụng'),
  simpleTable(['Thành phần', 'Phiên bản / lựa chọn', 'Vai trò'], [
    ['Node.js', '18 trở lên', 'Chạy 3 chương trình mô phỏng'],
    ['Thư viện mqtt (npm)', '5.x', 'MQTT client cho Node.js (dùng ở cả 3 Terminal)'],
    ['MQTT Broker', 'Eclipse Mosquitto 2.x (chạy trên máy) hoặc broker công cộng broker.hivemq.com', 'Trung gian nhận và chuyển tiếp bản tin'],
    ['Arduino IDE', '2.x', 'Biên dịch và nạp firmware'],
    ['Board package', 'esp32 by Espressif Systems (bản 3.x, hỗ trợ ESP32-C3); esp8266 nếu dùng NodeMCU', 'Hỗ trợ biên dịch cho vi điều khiển'],
    ['PubSubClient', 'Nick O\'Leary, 2.8', 'MQTT client trên vi điều khiển'],
    ['DHT sensor library + Adafruit Unified Sensor', 'Adafruit', 'Đọc cảm biến DHT11/DHT22'],
    ['ArduinoJson', '6.x hoặc 7.x', 'Đóng gói / phân tích payload JSON'],
  ], [28, 36, 36]),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 2 — CƠ SỞ LÝ THUYẾT
// ---------------------------------------------------------------------------
const chapter2 = [
  h1('CHƯƠNG 2. CƠ SỞ LÝ THUYẾT'),
  h2('2.1. Giao thức MQTT'),
  p('MQTT (Message Queuing Telemetry Transport) là giao thức truyền bản tin theo mô hình Publish/Subscribe, chạy trên nền TCP/IP (cổng mặc định 1883, hoặc 8883 khi có mã hoá TLS). MQTT được thiết kế cho thiết bị tài nguyên hạn chế và mạng không ổn định: phần header cố định chỉ 2 byte, một kết nối TCP được giữ mở lâu dài để cả hai chiều cùng gửi bản tin, và client không cần biết địa chỉ của nhau. Đây là lý do MQTT phù hợp với vi điều khiển hơn HTTP — board không phải liên tục mở kết nối mới để hỏi "có lệnh nào cho tôi không", mà chỉ cần đăng ký một lần rồi chờ Broker đẩy lệnh xuống.'),
  h2('2.2. Mô hình Publish/Subscribe và MQTT Broker'),
  p('Trong mô hình Publish/Subscribe, bên gửi (publisher) không gửi trực tiếp cho bên nhận mà gửi bản tin kèm một "địa chỉ" gọi là topic tới Broker. Bên nhận (subscriber) đăng ký với Broker những topic mình quan tâm; mỗi khi có bản tin trên topic khớp, Broker chuyển tiếp bản sao tới mọi subscriber đó. Nhờ vậy publisher và subscriber tách rời hoàn toàn: có thể thêm một subscriber mới (ví dụ Terminal 3 quan sát) mà không phải sửa một dòng nào ở Backend hay phần cứng. Một client có thể vừa là publisher vừa là subscriber — trong đồ án, cả board ESP32-C3 lẫn Backend đều đóng hai vai.'),
  ...figure(IMG.b2_pubsub, 'Hình 2.1: Mô hình Publish/Subscribe qua MQTT Broker trong đồ án', 520),
  h2('2.3. Topic và ký tự đại diện'),
  p('Topic là chuỗi UTF-8 phân cấp bằng dấu "/", ví dụ home/device/1/set. Khi subscribe, client được dùng hai ký tự đại diện: "+" khớp đúng một cấp (home/device/+/status khớp trạng thái của mọi thiết bị) và "#" khớp mọi cấp còn lại, chỉ được đặt ở cuối (home/# khớp toàn bộ bản tin của hệ thống). Khi publish thì không được dùng ký tự đại diện — mỗi bản tin luôn có một topic cụ thể. Đồ án dùng "+" để Backend và board chỉ cần subscribe một lần cho cả 3 thiết bị, và dùng "#" ở Terminal 3 để quan sát toàn bộ lưu lượng.'),
  h2('2.4. Các gói tin MQTT cơ bản'),
  caption('Bảng 2.1: Các gói tin điều khiển MQTT được dùng trong đồ án'),
  simpleTable(['Gói tin', 'Chiều', 'Ý nghĩa', 'Xuất hiện trong đồ án'], [
    ['CONNECT / CONNACK', 'Client → Broker / Broker → Client', 'Mở phiên làm việc (kèm Client ID, keep-alive) và xác nhận', 'mqtt.connect() ở Node.js, mqttClient.connect(clientId) ở firmware'],
    ['SUBSCRIBE / SUBACK', 'Client → Broker / Broker → Client', 'Đăng ký nhận bản tin theo topic filter', 'Board: home/device/+/set; Backend: home/device/+/status, home/sensor/+/data'],
    ['PUBLISH', 'Hai chiều', 'Gửi một bản tin (topic + payload)', 'Lệnh …/set, phản hồi …/status, dữ liệu …/data'],
    ['PINGREQ / PINGRESP', 'Client → Broker / Broker → Client', 'Duy trì kết nối khi không có dữ liệu (keep-alive)', 'Tự động bên trong thư viện mqtt và PubSubClient (mqttClient.loop())'],
    ['DISCONNECT', 'Client → Broker', 'Đóng phiên một cách chủ động', 'Lệnh offline ở Terminal 1'],
  ], [20, 20, 28, 32]),
  p(''),
  h2('2.5. QoS, Retained message, Keep-alive và Last Will'),
  p('MQTT có ba mức QoS: QoS 0 (gửi tối đa một lần, không xác nhận — có thể mất tin), QoS 1 (ít nhất một lần, có PUBACK — có thể trùng tin) và QoS 2 (đúng một lần, bắt tay 4 bước — chậm nhất). Cờ retained yêu cầu Broker lưu lại bản tin cuối cùng của một topic để gửi ngay cho subscriber mới. Keep-alive là chu kỳ client phải gửi ít nhất một gói tin (hoặc PINGREQ) để Broker biết client còn sống. Last Will and Testament (LWT) là bản tin client đăng ký sẵn lúc CONNECT, Broker sẽ tự publish thay client nếu client mất kết nối bất thường.'),
  p('Đồ án chọn QoS 0 cho mọi bản tin, vì thư viện PubSubClient trên vi điều khiển chỉ publish được ở QoS 0. Độ tin cậy được đảm bảo ở tầng ứng dụng thay vì tầng giao thức: mỗi lệnh .../set luôn phải được phần cứng trả lời bằng một bản tin .../status chứa trạng thái THẬT sau khi xử lý, và Backend đếm giờ ACTION_TIMEOUT_MS (5 giây); quá hạn mà chưa có phản hồi thì lệnh bị đánh dấu timeout. Cách này còn mạnh hơn QoS 1: PUBACK của QoS 1 chỉ chứng minh Broker đã nhận bản tin, còn bản tin .../status chứng minh LED đã thực sự đổi trạng thái. Hạn chế của lựa chọn này là lệnh gửi trong lúc board mất kết nối sẽ bị Broker bỏ đi — đúng như kịch bản 2 ở Chương 3 cho thấy — và được xử lý bằng nhánh timeout đã thiết kế ở Bài 1.'),
  h2('2.6. Vi điều khiển ESP32-C3 Super Mini'),
  p('Board sử dụng trong đồ án là ESP32-C3 Super Mini — bo mạch rất nhỏ gọn dựa trên chip ESP32-C3 của Espressif: một lõi RISC-V 32-bit tốc độ tới 160 MHz, khoảng 400 KB SRAM, tích hợp Wi-Fi 2.4 GHz chuẩn 802.11 b/g/n và Bluetooth 5 (LE), lập trình bằng Arduino IDE thông qua gói board esp32 của Espressif. Các chân GPIO hoạt động ở mức logic 3.3V, không chịu được 5V.'),
  p('So với NodeMCU ESP8266, ESP32-C3 Super Mini có ba điểm cần lưu ý khi lập trình. Thứ nhất, board không có chip chuyển đổi USB-UART riêng mà dùng bộ USB tích hợp trong chip, nên phải bật tuỳ chọn "USB CDC On Boot" trong Arduino IDE thì lệnh Serial.print mới hiện lên Serial Monitor. Thứ hai, các chân GPIO2, GPIO8, GPIO9 quyết định chế độ khởi động (GPIO8 nối sẵn LED trên board, GPIO9 nối nút BOOT), nên đồ án dùng 4 chân an toàn nằm cùng một hàng là GPIO5, GPIO6, GPIO7 cho 3 LED và GPIO10 cho cảm biến. Thứ ba, anten trên nhiều board Super Mini thiết kế chưa tốt khiến board không kết nối được Wi-Fi khi phát ở công suất tối đa; firmware giảm công suất phát xuống 8.5 dBm để khắc phục.'),
  p('Firmware dùng chỉ thị tiền xử lý (#if defined(CONFIG_IDF_TARGET_ESP32C3), #elif defined(ESP32), #else) để tự chọn bảng chân phù hợp, nên cùng một mã nguồn biên dịch được cho ESP32-C3, ESP32 DevKit và NodeMCU ESP8266. Với NodeMCU ESP8266, các chân D3 (GPIO0), D4 (GPIO2), D8 (GPIO15) cũng là chân khởi động nên được tránh, và đồ án dùng D1, D2, D5, D7.'),
  h2('2.7. Cảm biến DHT11'),
  p('DHT11 là cảm biến số đo nhiệt độ trong khoảng 0–50°C (sai số khoảng ±2°C) và độ ẩm tương đối 20–90% (sai số khoảng ±5%), giao tiếp qua một dây dữ liệu duy nhất với giao thức riêng do thư viện DHT của Adafruit xử lý. Cảm biến chỉ nên được đọc tối đa khoảng 1 lần mỗi giây; firmware đọc mỗi 5 giây nên nằm an toàn trong giới hạn này. Khi đọc lỗi (lỏng dây, thiếu điện trở kéo lên), thư viện trả về NaN — firmware kiểm tra isnan() và bỏ qua lần đọc đó thay vì gửi giá trị rác lên Backend.'),
  h2('2.8. LED và điện trở hạn dòng'),
  p('Mỗi LED được mắc nối tiếp một điện trở 220Ω để giới hạn dòng. Với LED đỏ/vàng/xanh lá có điện áp thuận khoảng 2V, dòng qua LED khi chân GPIO ở mức cao 3.3V là I = (3.3 − 2.0) / 220 ≈ 6 mA — đủ sáng rõ và nằm dưới mức dòng khuyến nghị cho một chân GPIO của ESP8266. Với LED xanh dương hoặc trắng (điện áp thuận khoảng 3V), dòng chỉ còn khoảng 1–2 mA nên LED sẽ khá mờ; khi đó có thể giảm điện trở xuống 100Ω hoặc ưu tiên dùng LED đỏ/vàng/xanh lá.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 3 — BÀI 2.1 MÔ PHỎNG 3 TERMINAL
// ---------------------------------------------------------------------------
const LOG_SC1_T2 = `14:32:05 [BACKEND] INSERT ActionHistory #1 (device_id=1, action=ON, triggered_by=user, status=pending)
14:32:05 [BACKEND] Publish home/device/1/set -> {"action":"ON"} — bắt đầu đếm 5000 ms chờ phản hồi
14:32:06 [BACKEND] Nhận home/device/1/status -> {"device_id":1,"state":"ON"} sau 205 ms
14:32:06 [BACKEND]    -> UPDATE ActionHistory #1 SET status='success'; UPDATE Device #1 SET current_state='ON'`;
const LOG_SC1_T1 = `14:32:05 [HARDWARE] Nhận lệnh home/device/1/set -> {"action":"ON"} => digitalWrite(GPIO5, HIGH) — LED Đèn ON
14:32:06 [HARDWARE] Publish home/device/1/status -> {"device_id":1,"state":"ON"}`;
const LOG_SC1_T3 = `14:32:05  Backend  → Hardware  home/device/1/set      {"action":"ON"}
14:32:06  Hardware → Backend   home/device/1/status   {"device_id":1,"state":"ON"}`;
const LOG_SC2_T2 = `14:32:10 [BACKEND] INSERT ActionHistory #3 (device_id=3, action=ON, triggered_by=user, status=pending)
14:32:10 [BACKEND] Publish home/device/3/set -> {"action":"ON"} — bắt đầu đếm 5000 ms chờ phản hồi
14:32:15 [BACKEND] TIMEOUT: thiết bị #3 (Điều hòa) không phản hồi sau 5000 ms
14:32:15 [BACKEND]    -> UPDATE ActionHistory #3 SET status='timeout'
14:32:15 [BACKEND]    -> emit action:update {status:'timeout'} => Frontend khôi phục công tắc về trạng thái cũ + báo lỗi đỏ
14:32:15 [BACKEND] Đồng bộ trạng thái thiết bị #3 (Điều hòa) = OFF (UPDATE Device SET current_state)`;
const LOG_SC2_T3 = `14:32:10  Backend  → Hardware  home/device/3/set      {"action":"ON"}
             (5 giây không có bản tin home/device/3/status nào)
14:32:15  Hardware → Backend   home/device/3/status   {"device_id":3,"state":"OFF"}   <- board online lại, đồng bộ`;
const LOG_SC3_T2 = `14:32:18 [BACKEND] Nhận home/sensor/1/data -> 33.5°C (INSERT DataSensor)
14:32:18 [BACKEND] CẢNH BÁO: 33.5°C > ngưỡng 32°C — TỰ ĐỘNG bật Điều hòa (auto_action=true)
14:32:18 [BACKEND] INSERT ActionHistory #4 (device_id=3, action=ON, triggered_by=system, status=pending)
14:32:18 [BACKEND] Publish home/device/3/set -> {"action":"ON"} — bắt đầu đếm 5000 ms chờ phản hồi
14:32:18 [BACKEND] Nhận home/device/3/status -> {"device_id":3,"state":"ON"} sau 204 ms
14:32:18 [BACKEND]    -> UPDATE ActionHistory #4 SET status='success'; UPDATE Device #3 SET current_state='ON'
14:32:20 [BACKEND] Nhận home/sensor/1/data -> 34.2°C (INSERT DataSensor)
14:32:20 [BACKEND] CẢNH BÁO: 34.2°C > ngưỡng 32°C — Điều hòa đã ON sẵn, chỉ cảnh báo (auto_action=false)`;

const chapter3 = [
  h1('CHƯƠNG 3. BÀI 2.1 — MÔ PHỎNG HỆ THỐNG BẰNG 3 TERMINAL'),
  h2('3.1. Ý tưởng và kiến trúc mô phỏng'),
  p('Trước khi lắp mạch, toàn bộ luồng giao tiếp được kiểm chứng bằng phần mềm. Mỗi thành phần của hệ thống thật được thay bằng một chương trình Node.js chạy trong một cửa sổ Terminal riêng, cùng kết nối tới một MQTT Broker. Điểm mấu chốt là các chương trình mô phỏng dùng ĐÚNG bộ topic, ĐÚNG định dạng payload và ĐÚNG logic xử lý của thành phần thật mà nó thay thế, nên kết quả mô phỏng phản ánh chính xác hành vi của hệ thống thật.'),
  ...figure(IMG.b2_three_terminals, 'Hình 3.1: Kiến trúc mô phỏng hệ thống bằng 3 Terminal', 540),
  caption('Bảng 3.1: Vai trò của 3 Terminal'),
  simpleTable(['Terminal', 'Đóng vai', 'Publish', 'Subscribe'], [
    ['Terminal 1', 'Board ESP32-C3 + 3 LED + DHT11 (thay thế ở Bài 2.2 bằng board thật)', 'home/device/{id}/status, home/sensor/1/data, home/sensor/2/data', 'home/device/+/set'],
    ['Terminal 2', 'Backend (thay thế ở Bài 3 bằng Backend Node.js + MySQL thật)', 'home/device/{id}/set', 'home/device/+/status, home/sensor/+/data'],
    ['Terminal 3', 'Công cụ quan sát Broker', '(không publish)', 'home/#'],
  ], [14, 34, 30, 22]),
  p(''),
  h2('3.2. Thiết kế topic và payload'),
  p('Cây topic được thiết kế ở Bài 1 theo cấu trúc home/<loại>/<id>/<hành động>. Tách riêng hai topic set và status cho mỗi thiết bị giúp tránh vòng lặp: nếu dùng chung một topic, chính thiết bị sẽ nhận lại bản tin trạng thái nó vừa gửi và hiểu nhầm thành lệnh mới. Mọi payload đều là JSON để dễ mở rộng thêm trường mà không phá vỡ bên nhận; riêng lệnh điều khiển, phần cứng chấp nhận cả chuỗi thô "ON"/"OFF" để tiện thử nhanh bằng mosquitto_pub.'),
  ...figure(IMG.b2_topic_tree, 'Hình 3.2: Cây topic MQTT của hệ thống', 520),
  caption('Bảng 3.2: Đặc tả topic và payload'),
  simpleTable(['Topic', 'Publisher → Subscriber', 'Payload mẫu', 'Ý nghĩa'], [
    ['home/device/{id}/set', 'Backend → Phần cứng', '{"action":"ON"}', 'Lệnh bật/tắt thiết bị id (1 = Đèn, 2 = Quạt, 3 = Điều hòa)'],
    ['home/device/{id}/status', 'Phần cứng → Backend', '{"device_id":1,"state":"ON"}', 'Trạng thái THẬT sau khi xử lý lệnh; cũng được gửi khi board (re)connect để đồng bộ'],
    ['home/sensor/1/data', 'Phần cứng → Backend', '{"sensor_id":1,"type":"temperature","value":28.4,"unit":"°C"}', 'Nhiệt độ, mỗi 5 giây'],
    ['home/sensor/2/data', 'Phần cứng → Backend', '{"sensor_id":2,"type":"humidity","value":63,"unit":"%"}', 'Độ ẩm, mỗi 5 giây'],
  ], [22, 18, 32, 28]),
  p(''),

  h2('3.3. Cài đặt chương trình'),
  h3('3.3.1. Terminal 1 — giả lập phần cứng'),
  p('Khi kết nối thành công, Terminal 1 subscribe home/device/+/set, publish trạng thái ban đầu của 3 LED (giống hàm setup() của board thật) rồi cứ 5 giây phát một cặp giá trị nhiệt độ/độ ẩm ngẫu nhiên trong khoảng thực tế (26–30°C, 55–70%). Hàm onCommand() dưới đây xử lý một lệnh: tách device_id từ topic, chấp nhận payload JSON hoặc chuỗi thô, từ chối thiết bị/lệnh không hợp lệ, "bật LED" bằng cách đổi trạng thái nội bộ, rồi sau 200 ms (mô phỏng thời gian xử lý phần cứng) publish lại trạng thái thật.'),
  ...codeBlock(extract('mqtt-simulation/terminal1_hardware_simulator.js', 'function onCommand(')),
  p('Ngoài ra, Terminal 1 nhận các lệnh gõ tay để tái hiện những tình huống khó tạo ra với phần cứng thật: offline (đóng kết nối MQTT, giả lập ESP mất Wi-Fi), online (kết nối lại), temp <giá trị> (phát ngay một giá trị nhiệt độ tuỳ ý, ví dụ 33.5°C để kích hoạt UC07) và status (xem trạng thái 3 LED).'),

  h3('3.3.2. Terminal 2 — giả lập Backend'),
  p('Terminal 2 tái hiện phần giao tiếp MQTT của Backend thật (backend/src/mqtt/mqttClient.js) nhưng thay các câu lệnh SQL bằng dòng log, để có thể chạy mà không cần MySQL. Hàm sendCommand() tương ứng với thao tác người dùng bấm nút trên Web: "ghi" ActionHistory ở trạng thái pending, publish lệnh và khởi động bộ đếm ACTION_TIMEOUT_MS — đúng nhánh ngoại lệ của Sequence Diagram UC03 ở Bài 1.'),
  ...codeBlock(extract('mqtt-simulation/terminal2_backend_simulator.js', 'function sendCommand(')),
  p('Khi bản tin trạng thái về tới, onDeviceStatus() huỷ bộ đếm, tính thời gian phản hồi và chốt lệnh thành success. Nếu không có lệnh nào đang chờ cho thiết bị đó, bản tin được hiểu là bản tin đồng bộ (board vừa khởi động hoặc vừa kết nối lại) và chỉ cập nhật trạng thái thiết bị.'),
  ...codeBlock(extract('mqtt-simulation/terminal2_backend_simulator.js', 'function onDeviceStatus(')),
  p('Hàm onSensorData() hiện thực UC07: với cảm biến nhiệt độ, nếu giá trị vượt TEMP_ALERT_THRESHOLD (32°C) thì tự động gửi lệnh bật Điều hòa với triggered_by = system khi Điều hòa đang tắt; nếu Điều hòa đã bật hoặc đang chờ phản hồi lệnh trước thì chỉ cảnh báo, không gửi lệnh trùng.'),
  ...codeBlock(extract('mqtt-simulation/terminal2_backend_simulator.js', 'function onSensorData(')),

  h3('3.3.3. Terminal 3 — quan sát Broker'),
  p('Terminal 3 chỉ subscribe home/# và in ra mọi bản tin kèm thời gian và chiều đi, cho phép đối chiếu trực tiếp với log của hai Terminal kia. Có hai cách chạy tương đương: công cụ dòng lệnh chính thức của Mosquitto (mosquitto_sub -h localhost -t "home/#" -v) hoặc chương trình terminal3_monitor.js (npm run monitor) — tiện trên Windows khi chưa cài mosquitto-clients.'),

  h2('3.4. Luồng gói tin giữa 3 Terminal'),
  p('Hình 3.3 mô tả trình tự bản tin khi Terminal 2 gửi lệnh bật Đèn trong hai trường hợp: Terminal 1 đang hoạt động (kịch bản 1) và Terminal 1 đã mất kết nối (kịch bản 2). Có thể so sánh trực tiếp với Sequence Diagram UC03 ở Bài 1: vai trò "Backend" và "NodeMCU" (board vi điều khiển) trong sơ đồ Bài 1 lần lượt do Terminal 2 và Terminal 1 đảm nhận.'),
  ...figure(IMG.b2_seq_sim, 'Hình 3.3: Sequence Diagram — luồng gói tin giữa 3 Terminal (kịch bản 1 và 2)', 540),

  h2('3.5. Hướng dẫn chạy'),
  bullet('Bước 1 — cài thư viện: cd mqtt-simulation, rồi npm install.'),
  bullet('Bước 2 — chuẩn bị Broker: cài và khởi động Mosquitto trên máy, sau đó đặt BROKER_URL=mqtt://localhost:1883 trong cả 3 cửa sổ (PowerShell: $env:BROKER_URL="mqtt://localhost:1883"). Nếu bỏ qua bước này, chương trình dùng broker công cộng broker.hivemq.com.'),
  bullet('Bước 3 — mở Terminal 3 trước (npm run monitor) để không bỏ sót bản tin nào.'),
  bullet('Bước 4 — mở Terminal 1 (npm run hardware) và Terminal 2 (npm run backend).'),
  bullet('Bước 5 — xếp 3 cửa sổ cạnh nhau, thực hiện lần lượt 3 kịch bản ở mục 3.6 và chụp màn hình sau mỗi kịch bản.'),
  p('Không nên dùng broker công cộng khi chụp ảnh báo cáo: broker này dùng chung cho mọi người, nếu một bạn khác cùng chạy topic home/... thì hai bên sẽ điều khiển nhầm thiết bị của nhau và log sẽ xuất hiện bản tin lạ.'),

  h2('3.6. Kết quả chạy mô phỏng'),
  p('Phần này trình bày 3 kịch bản bao phủ toàn bộ các nhánh của Sequence Diagram ở Bài 1. Các khối log là đầu ra mẫu của chính chương trình (đã lược bớt biểu tượng) để người đọc biết cần quan sát dòng nào; minh chứng chính thức là ảnh chụp 3 cửa sổ Terminal khi chạy trên máy.'),
  h3('3.6.1. Kịch bản 1 — bật/tắt thiết bị thành công'),
  p('Thao tác: gõ "1 ON" ở Terminal 2. Terminal 2 publish lệnh và bắt đầu đếm giờ; Terminal 1 nhận lệnh, "bật" LED Đèn và phản hồi; Terminal 2 nhận phản hồi sau khoảng 200 ms, huỷ bộ đếm và chốt success; Terminal 3 thấy đúng 2 bản tin theo hai chiều ngược nhau.'),
  logCap('Log Terminal 2 (Backend):'),
  ...codeBlock(LOG_SC1_T2),
  logCap('Log Terminal 1 (Phần cứng):'),
  ...codeBlock(LOG_SC1_T1),
  logCap('Log Terminal 3 (Monitor):'),
  ...codeBlock(LOG_SC1_T3),
  ...evidenceBox('Kịch bản 1 — 3 cửa sổ Terminal khi gõ "1 ON"', 'Chụp cả 3 cửa sổ trong một ảnh; thấy rõ dòng Publish ở T2, dòng digitalWrite ở T1 và 2 bản tin set/status ở T3.'),

  h3('3.6.2. Kịch bản 2 — thiết bị mất kết nối, lệnh bị timeout'),
  p('Thao tác: gõ "offline" ở Terminal 1, sau đó gõ "3 ON" ở Terminal 2. Vì không còn subscriber nào cho home/device/3/set và bản tin dùng QoS 0, Broker bỏ bản tin; sau đúng 5 giây Terminal 2 báo TIMEOUT, chuyển lệnh sang trạng thái timeout và (ở hệ thống thật) phát sự kiện để Frontend khôi phục công tắc. Gõ "online" ở Terminal 1: board kết nối lại và publish trạng thái thật của cả 3 LED (Điều hòa vẫn OFF), Terminal 2 đồng bộ lại.'),
  logCap('Log Terminal 2 (Backend):'),
  ...codeBlock(LOG_SC2_T2),
  logCap('Log Terminal 3 (Monitor):'),
  ...codeBlock(LOG_SC2_T3),
  ...evidenceBox('Kịch bản 2 — lệnh "3 ON" khi Terminal 1 offline', 'Chụp sau khi T2 in dòng TIMEOUT; T3 chỉ có bản tin …/set mà không có …/status tương ứng.'),

  h3('3.6.3. Kịch bản 3 — nhiệt độ vượt ngưỡng, tự động bật Điều hòa (UC07)'),
  p('Thao tác: gõ "temp 33.5" ở Terminal 1, sau đó gõ "temp 34.2". Lần thứ nhất, Terminal 2 phát hiện 33.5°C > 32°C khi Điều hòa đang OFF nên tự gửi lệnh bật với triggered_by = system, và lệnh này cũng đi qua đúng cơ chế chờ phản hồi/timeout như lệnh của người dùng. Lần thứ hai, Điều hòa đã ON nên Terminal 2 chỉ cảnh báo, không gửi lệnh trùng.'),
  logCap('Log Terminal 2 (Backend):'),
  ...codeBlock(LOG_SC3_T2),
  ...evidenceBox('Kịch bản 3 — "temp 33.5" rồi "temp 34.2"', 'Chụp sau lần thứ hai; thấy T2 tự publish home/device/3/set ở lần 1 và chỉ cảnh báo ở lần 2.'),

  h2('3.7. Nhận xét'),
  p('Kết quả mô phỏng khẳng định thiết kế topic và luồng xử lý ở Bài 1 hoạt động đúng ở cả ba nhánh. Thời gian khứ hồi của một lệnh (từ lúc publish .../set tới lúc nhận .../status) chủ yếu là 200 ms trễ giả lập của Terminal 1, cho thấy chi phí của Broker trên máy cục bộ là không đáng kể. Kịch bản 2 cho thấy rõ hệ quả của QoS 0: lệnh gửi lúc thiết bị mất kết nối bị mất hẳn chứ không được giao bù khi thiết bị kết nối lại — đây chính là lý do thiết kế cần cơ chế timeout ở tầng ứng dụng, và cũng là hành vi mong muốn, vì giao bù một lệnh "bật" đã cũ vài phút có thể gây bất ngờ cho người dùng. Cuối cùng, nhờ Pub/Sub tách rời các bên, Terminal 3 quan sát được toàn bộ hệ thống mà hai chương trình còn lại hoàn toàn không cần biết đến sự tồn tại của nó.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 4 — BÀI 2.2 PHẦN CỨNG THẬT
// ---------------------------------------------------------------------------
const SERIAL_EXPECTED = `[BOARD] ESP32-C3 Super Mini | LED Den=GPIO5, Quat=GPIO6, Dieu hoa=GPIO7 | DHT=GPIO10
[WIFI] Đang kết nối tới <SSID>.....
[WIFI] Đã kết nối! IP: 192.168.x.x
[MQTT] Đang kết nối broker... OK (clientId=esp-iot-node-XXXXXX)
[MQTT] Đã subscribe home/device/{1,2,3}/set
[MQTT] Publish home/device/1/status -> {"device_id":1,"state":"OFF"}
[MQTT] Publish home/device/2/status -> {"device_id":2,"state":"OFF"}
[MQTT] Publish home/device/3/status -> {"device_id":3,"state":"OFF"}
[DHT] temp=<nhiệt độ>°C humidity=<độ ẩm>% -> đã publish MQTT
[MQTT] Nhận: home/device/1/set -> {"action":"ON"}
[LED] device_id=1 -> ON
[MQTT] Publish home/device/1/status -> {"device_id":1,"state":"ON"}`;

const chapter4 = [
  h1('CHƯƠNG 4. BÀI 2.2 — LẬP TRÌNH PHẦN CỨNG THẬT'),
  h2('4.1. Linh kiện sử dụng'),
  caption('Bảng 4.1: Danh sách linh kiện'),
  simpleTable(['Linh kiện', 'Số lượng', 'Vai trò'], [
    ['ESP32-C3 Super Mini (firmware cũng chạy trên NodeMCU ESP8266 / ESP32 DevKit)', '1', 'Vi điều khiển trung tâm, kết nối Wi-Fi và MQTT'],
    ['LED 5mm', '3', 'Mô phỏng 3 thiết bị điện: Đèn, Quạt, Điều hòa'],
    ['Điện trở 220Ω', '3', 'Hạn dòng cho LED (khoảng 6 mA mỗi LED)'],
    ['Cảm biến DHT11 (hoặc DHT22)', '1', 'Đo nhiệt độ và độ ẩm môi trường'],
    ['Điện trở 10kΩ', '1 (tuỳ chọn)', 'Kéo lên chân DATA nếu dùng cảm biến DHT11 dạng 4 chân trần (module 3 chân đã có sẵn)'],
    ['Breadboard, dây cắm, cáp USB-C có truyền dữ liệu', '—', 'Lắp mạch, cấp nguồn và nạp chương trình'],
  ], [36, 14, 50]),
  p(''),
  h2('4.2. Sơ đồ khối'),
  p('Board ESP32-C3 là trung tâm: nhận dữ liệu từ DHT11 qua một dây tín hiệu, điều khiển 3 LED qua 3 chân GPIO, và trao đổi bản tin với Broker qua Wi-Fi. Backend (Bài 3) không giao tiếp trực tiếp với board mà chỉ thông qua Broker — đúng như Terminal 2 ở Bài 2.1.'),
  ...figure(IMG.b2_hw_block, 'Hình 4.1: Sơ đồ khối phần cứng', 540),
  h2('4.3. Sơ đồ đấu nối'),
  ...figure(IMG.b2_wiring_c3, 'Hình 4.2: Sơ đồ nguyên lý đấu nối ESP32-C3 Super Mini — 3 LED — DHT11', 540),
  caption('Bảng 4.2: Bảng đấu nối chân (board dùng trong đồ án và các board thay thế)'),
  simpleTable(['Linh kiện', 'ESP32-C3 Super Mini (đồ án)', 'NodeMCU ESP8266', 'ESP32 DevKit', 'Ghi chú'], [
    ['LED "Đèn" (device_id = 1)', 'GPIO5', 'D1 (GPIO5)', 'GPIO4', 'Anode qua 220Ω, cathode về GND'],
    ['LED "Quạt" (device_id = 2)', 'GPIO6', 'D2 (GPIO4)', 'GPIO5', 'Anode qua 220Ω, cathode về GND'],
    ['LED "Điều hòa" (device_id = 3)', 'GPIO7', 'D5 (GPIO14)', 'GPIO18', 'Anode qua 220Ω, cathode về GND'],
    ['DHT11 — DATA', 'GPIO10', 'D7 (GPIO13)', 'GPIO15', 'Thêm 10kΩ lên 3V3 nếu cảm biến chưa có sẵn'],
    ['DHT11 — VCC', '3V3', '3V3', '3V3', 'Không dùng chân 5V'],
    ['DHT11 — GND', 'GND', 'GND', 'GND', 'Chung GND với các LED'],
  ], [24, 18, 16, 14, 28]),
  p(''),
  p('Số chân GPIO trong bảng được khai báo ở đầu firmware bằng các hằng LED_LIGHT_PIN, LED_FAN_PIN, LED_AC_PIN, DHT_PIN, và tự động chọn theo loại board khi biên dịch. Nếu cắm khác bảng, chỉ cần sửa các hằng này.'),

  h2('4.4. Cấu hình và thư viện'),
  p('Cài đặt Arduino IDE theo các bước sau, rồi sửa các hằng cấu hình ở đầu file firmware (Bảng 4.3):'),
  bullet('Vào File → Preferences, thêm vào ô Additional Boards Manager URLs địa chỉ gói board ESP32:'),
  ...codeBlock('https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json'),
  bullet('Vào Boards Manager, cài gói "esp32 by Espressif Systems". (Nếu dùng NodeMCU ESP8266 thì thêm URL https://arduino.esp8266.com/stable/package_esp8266com_index.json và cài gói esp8266.)'),
  bullet('Vào Library Manager, cài 4 thư viện: PubSubClient, DHT sensor library, Adafruit Unified Sensor, ArduinoJson.'),
  caption('Bảng 4.3: Các hằng cấu hình trong firmware'),
  simpleTable(['Hằng', 'Giá trị mặc định', 'Ý nghĩa'], [
    ['WIFI_SSID / WIFI_PASSWORD', '"TEN_WIFI_CUA_BAN" / "MAT_KHAU_WIFI"', 'Mạng Wi-Fi board sẽ kết nối — phải là băng tần 2.4 GHz (ESP32-C3 và ESP8266 không hỗ trợ 5 GHz)'],
    ['MQTT_BROKER / MQTT_PORT', '"broker.hivemq.com" / 1883', 'Địa chỉ Broker; khi dùng Mosquitto trên laptop, điền IP LAN của laptop (vd 192.168.1.10), không dùng "localhost"'],
    ['MQTT_CLIENT_PREFIX', '"esp-iot-node-"', 'Tiền tố Client ID; firmware tự ghép thêm chip ID để Client ID là duy nhất'],
    ['DHT_TYPE', 'DHT11', 'Đổi thành DHT22 nếu dùng loại cảm biến đó'],
    ['SENSOR_INTERVAL_MS', '5000', 'Chu kỳ đọc và gửi dữ liệu cảm biến'],
  ], [26, 32, 42]),
  p(''),
  p('Với ESP32-C3 Super Mini, trong menu Tools của Arduino IDE cần chọn board "ESP32C3 Dev Module" (hoặc "Nologo ESP32C3 Super Mini" nếu bản core có sẵn) và đặt "USB CDC On Boot" thành "Enabled". Đoạn mã kết nối Wi-Fi dưới đây cho thấy cách firmware giảm công suất phát riêng cho ESP32-C3:'),
  ...codeBlock(extract('hardware/iot_device_node/iot_device_node.ino', 'void setupWifi()')),
  p('Khi dùng Mosquitto 2.x chạy trên laptop làm Broker cho board thật, cần lưu ý Mosquitto 2.x mặc định chỉ chấp nhận kết nối từ chính máy đó. Phải thêm hai dòng "listener 1883" và "allow_anonymous true" vào file mosquitto.conf rồi khởi động lại dịch vụ, đồng thời mở cổng 1883 trên tường lửa của laptop, thì board mới kết nối được qua mạng LAN.'),

  h2('4.5. Lưu đồ thuật toán'),
  p('Firmware gồm hai hàm chính theo mô hình Arduino. setup() chạy một lần khi cấp nguồn: khởi tạo chân LED, cảm biến, kết nối Wi-Fi và cấu hình MQTT client (Hình 4.3). loop() chạy lặp vô hạn: kiểm tra và khôi phục kết nối, gọi mqttClient.loop() để xử lý bản tin đến và duy trì keep-alive, và định kỳ đọc cảm biến (Hình 4.4). Việc định kỳ dùng millis() thay cho delay(5000) để vòng lặp không bị chặn — nhờ vậy lệnh bật/tắt luôn được xử lý ngay, không phải chờ hết 5 giây đọc cảm biến.'),
  ...figure(IMG.b2_fw_setup, 'Hình 4.3: Lưu đồ hàm setup()', 230),
  ...figure(IMG.b2_fw_loop, 'Hình 4.4: Lưu đồ hàm loop()', 300),
  p('Mỗi khi có bản tin trên topic đã subscribe, thư viện PubSubClient gọi hàm callback onMqttMessage() (Hình 4.5).'),
  ...figure(IMG.b2_callback_flow, 'Hình 4.5: Lưu đồ hàm xử lý lệnh onMqttMessage()', 300),

  h2('4.6. Giải thích mã nguồn chính'),
  h3('4.6.1. Kết nối và tự kết nối lại MQTT'),
  p('reconnectMqtt() được gọi trong loop() mỗi khi mất kết nối. Sau khi kết nối thành công, board subscribe 3 topic lệnh và publish ngay trạng thái hiện tại của cả 3 LED — nhờ đó, sau một lần rớt mạng, Backend luôn được đồng bộ lại đúng trạng thái thật của phần cứng (chính là hành vi ở cuối kịch bản 2 của Bài 2.1).'),
  ...codeBlock(extract('hardware/iot_device_node/iot_device_node.ino', 'void reconnectMqtt()')),
  p('Client ID được tạo từ chip ID riêng của từng board. Theo đặc tả MQTT, khi một client mới kết nối với Client ID đã tồn tại, Broker sẽ ngắt kết nối client cũ; nếu cả lớp nạp cùng một firmware với Client ID cố định lên broker công cộng, các board sẽ liên tục "đá" nhau ra khỏi Broker. Ghép chip ID giúp tránh hoàn toàn lỗi khó phát hiện này.'),
  ...codeBlock(extract('hardware/iot_device_node/iot_device_node.ino', 'String buildClientId()')),
  h3('4.6.2. Xử lý lệnh điều khiển'),
  p('onMqttMessage() tách device_id từ topic, chấp nhận payload JSON hoặc chuỗi thô, kiểm tra thiết bị và lệnh hợp lệ, gọi digitalWrite() để bật/tắt LED thật, lưu trạng thái vào mảng deviceState và publish phản hồi. Hai quyết định thiết kế đáng chú ý: lệnh không phải ON/OFF bị bỏ qua thay vì mặc định tắt thiết bị (tránh tắt nhầm khi nhận payload sai), và trạng thái được lưu trong biến thay vì đọc lại bằng digitalRead() trên chân OUTPUT — cách đọc này không cho kết quả đúng trên một số phiên bản core ESP32.'),
  ...codeBlock(extract('hardware/iot_device_node/iot_device_node.ino', 'void onMqttMessage(')),
  h3('4.6.3. Đọc và gửi dữ liệu cảm biến'),
  ...codeBlock(extract('hardware/iot_device_node/iot_device_node.ino', 'void readAndPublishSensors()')),
  p('Payload cảm biến có cùng định dạng với Terminal 1 ở Bài 2.1, nên Terminal 2 và Backend thật xử lý dữ liệu từ board thật y hệt dữ liệu mô phỏng.'),

  h2('4.7. Nạp chương trình và kiểm tra'),
  bullet('Bước 1 — lắp mạch theo Hình 4.2 / Bảng 4.2, kiểm tra kỹ chiều LED (chân dài là anode) trước khi cấp nguồn.'),
  bullet('Bước 2 — mở iot_device_node.ino, sửa WIFI_SSID, WIFI_PASSWORD, MQTT_BROKER.'),
  bullet('Bước 3 — chọn board ESP32C3 Dev Module, bật USB CDC On Boot = Enabled, chọn cổng COM rồi bấm Upload. Nếu Upload báo không kết nối được: giữ nút BOOT, bấm-nhả RESET, nhả BOOT rồi Upload lại. (NodeMCU ESP8266: chọn NodeMCU 1.0 (ESP-12E Module).)'),
  bullet('Bước 4 — mở Serial Monitor ở tốc độ 115200 baud để theo dõi log.'),
  bullet('Bước 5 — mở Terminal 3 (monitor) và Terminal 2 (backend) của Bài 2.1 trỏ tới cùng Broker, gõ "1 ON", "2 ON", "3 ON"… và quan sát LED thật.'),
  p('Khi board hoạt động đúng, Serial Monitor in ra chuỗi log có dạng như sau (các giá trị trong dấu < > phụ thuộc mạng và môi trường thực tế):'),
  ...codeBlock(SERIAL_EXPECTED),
  ...evidenceBox('Mạch thật đã lắp', 'Ảnh breadboard thấy rõ board ESP32-C3 Super Mini, 3 LED (ít nhất một LED đang sáng) và cảm biến DHT11.'),
  ...evidenceBox('Serial Monitor khi board chạy', 'Thấy các dòng [WIFI] Đã kết nối, [MQTT] … OK (clientId=…), [DHT] temp=… và [LED] device_id=… -> ON.'),
  ...evidenceBox('Terminal 2 + Terminal 3 điều khiển board thật', 'Gõ lệnh ở Terminal 2; Terminal 3 thấy bản tin …/status do board thật gửi; chụp kèm LED tương ứng đang sáng.'),

  h2('4.8. Chuyển từ mô phỏng sang phần cứng thật'),
  p('Vì board thật và Terminal 1 dùng chung topic, payload và hành vi (phản hồi trạng thái sau mỗi lệnh, đồng bộ trạng thái khi kết nối lại, chu kỳ cảm biến 5 giây), việc chuyển đổi chỉ là tắt Terminal 1 và cấp nguồn cho board. Cũng chính vì vậy, ở Bài 3, Terminal 2 được thay bằng Backend thật (Node.js + MySQL + Socket.io) mà firmware không cần sửa một dòng nào. Kịch bản 2 có thể tái hiện trên phần cứng thật bằng cách rút nguồn board hoặc tắt Wi-Fi, rồi gửi lệnh từ Terminal 2; kịch bản 3 có thể tái hiện bằng cách hà hơi hoặc áp tay lên cảm biến để nhiệt độ tăng, hoặc tạm hạ TEMP_ALERT_THRESHOLD khi chạy Terminal 2.'),
];

// ---------------------------------------------------------------------------
// CHƯƠNG 5 — KIỂM THỬ
// ---------------------------------------------------------------------------
const chapter5 = [
  h1('CHƯƠNG 5. KIỂM THỬ'),
  p('Bảng 5.1 liệt kê các trường hợp kiểm thử cho cả phần mô phỏng và phần cứng thật. Cột "Kết quả thực tế" được điền sau khi tự chạy từng trường hợp trên máy và board của mình.'),
  caption('Bảng 5.1: Các trường hợp kiểm thử'),
  simpleTable(['Mã', 'Nội dung kiểm thử', 'Thao tác', 'Kết quả mong đợi', 'Kết quả thực tế'], [
    ['TC01', 'Kết nối Broker', 'Chạy 3 Terminal', 'Cả 3 in "Đã kết nối MQTT Broker", T3 thấy 3 bản tin trạng thái ban đầu', ''],
    ['TC02', 'Bật thiết bị', 'T2: 1 ON', 'T1 bật LED Đèn; T2 nhận status ON, success trong < 1 s', ''],
    ['TC03', 'Tắt thiết bị', 'T2: 1 OFF', 'T1 tắt LED Đèn; T2 nhận status OFF, success', ''],
    ['TC04', 'Payload chuỗi thô', 'mosquitto_pub -t home/device/2/set -m ON', 'Quạt bật, có bản tin status phản hồi', ''],
    ['TC05', 'Lệnh không hợp lệ', 'mosquitto_pub -t home/device/1/set -m TOGGLE', 'Bị bỏ qua, trạng thái LED không đổi, không có status', ''],
    ['TC06', 'Thiết bị không tồn tại', 'mosquitto_pub -t home/device/9/set -m ON', 'Bị bỏ qua, có dòng cảnh báo', ''],
    ['TC07', 'Mất kết nối → timeout', 'T1: offline; T2: 3 ON', 'Sau 5 s T2 báo TIMEOUT, status = timeout', ''],
    ['TC08', 'Kết nối lại → đồng bộ', 'T1: online', 'T1 publish trạng thái 3 LED, T2 đồng bộ đúng', ''],
    ['TC09', 'Vượt ngưỡng, Điều hòa OFF', 'T1: temp 33.5', 'T2 tự gửi 3 ON với triggered_by = system, nhận success', ''],
    ['TC10', 'Vượt ngưỡng, Điều hòa ON', 'T1: temp 34.2', 'T2 chỉ cảnh báo, không gửi lệnh mới', ''],
    ['TC11', 'Cảm biến định kỳ', 'Quan sát T3 trong 20 s', 'Mỗi 5 s có 1 cặp bản tin sensor/1 và sensor/2', ''],
    ['TC12', 'LED thật', 'Board thật + T2: 1 ON, 2 ON, 3 ON', '3 LED thật sáng đúng thứ tự, Serial in [LED] … ON', ''],
    ['TC13', 'Cảm biến thật', 'Board thật, quan sát T3', 'Giá trị nhiệt độ/độ ẩm hợp lý, thay đổi khi áp tay lên DHT11', ''],
    ['TC14', 'Lỗi cảm biến', 'Rút dây DATA của DHT11', 'Serial in "Lỗi đọc cảm biến", không gửi dữ liệu rác', ''],
    ['TC15', 'Board rớt Wi-Fi', 'Tắt/bật lại Wi-Fi phát', 'Board tự kết nối lại, publish lại trạng thái 3 LED', ''],
  ], [8, 18, 24, 34, 16]),
];

// ---------------------------------------------------------------------------
// KẾT LUẬN, TÀI LIỆU THAM KHẢO, PHỤ LỤC
// ---------------------------------------------------------------------------
const conclusion = [
  h1('KẾT LUẬN'),
  p('Bài 2 đã hiện thực lớp giao tiếp MQTT của hệ thống theo đúng thiết kế ở Bài 1. Ở Bài 2.1, ba chương trình mô phỏng cho phép kiểm chứng đầy đủ cả ba nhánh nghiệp vụ — điều khiển thành công, thiết bị mất kết nối dẫn tới timeout, và tự động bật Điều hòa khi nhiệt độ vượt ngưỡng — mà không cần bất kỳ linh kiện nào. Ở Bài 2.2, firmware cho ESP32-C3 Super Mini (đồng thời hỗ trợ ESP8266/ESP32) dùng đúng bộ topic và payload đó để điều khiển LED thật và gửi dữ liệu cảm biến DHT11 thật, kèm các cơ chế giúp hệ thống bền vững khi chạy thực tế: tự kết nối lại Wi-Fi/MQTT, đồng bộ lại trạng thái sau khi kết nối, Client ID duy nhất cho từng board, bỏ qua lệnh không hợp lệ và không gửi giá trị cảm biến lỗi.'),
  p('Hạn chế hiện tại: (1) bản tin dùng QoS 0 nên lệnh gửi lúc thiết bị mất kết nối không được giao bù — đã được bù đắp bằng cơ chế timeout ở tầng ứng dụng; (2) kết nối tới Broker chưa mã hoá và chưa xác thực; (3) Backend chỉ phát hiện thiết bị mất kết nối khi có lệnh bị timeout, chưa biết được trạng thái online/offline của board một cách chủ động.'),
  p('Hướng phát triển: dùng Last Will and Testament với một topic trạng thái board (ví dụ home/node/status, cờ retained) để Backend và Dashboard biết ngay khi board mất kết nối; bật TLS (cổng 8883) kèm tên đăng nhập/mật khẩu trên Mosquitto; hỗ trợ cập nhật firmware qua mạng (OTA); và mở rộng thêm cảm biến ánh sáng — bảng Sensor ở Bài 1 đã có sẵn loại light_intensity để bổ sung mà không phải đổi cấu trúc cơ sở dữ liệu.'),
];
const references = [
  h1('TÀI LIỆU THAM KHẢO'),
  p('[1] OASIS, "MQTT Version 3.1.1 — OASIS Standard", https://docs.oasis-open.org/mqtt/mqtt/v3.1.1/mqtt-v3.1.1.html'),
  p('[2] Eclipse Foundation, "Eclipse Mosquitto — An open source MQTT broker", https://mosquitto.org'),
  p('[3] MQTT.js, "The MQTT client for Node.js and the browser", https://github.com/mqttjs/MQTT.js'),
  p('[4] N. O\'Leary, "Arduino Client for MQTT (PubSubClient)", https://pubsubclient.knolleary.net'),
  p('[5] ESP8266 Community, "ESP8266 Arduino Core Documentation", https://arduino-esp8266.readthedocs.io'),
  p('[6] Espressif Systems, "Arduino-ESP32 Documentation", https://docs.espressif.com/projects/arduino-esp32'),
  p('[7] Adafruit, "DHT sensor library", https://github.com/adafruit/DHT-sensor-library'),
  p('[8] B. Blanchon, "ArduinoJson", https://arduinojson.org'),
];
const appendix = [
  h1('PHỤ LỤC'),
  h2('A. Liên kết đồ án'),
  p('Điền link thật trước khi nộp, đồng bộ với báo cáo Bài 1 và trang Profile của Frontend:'),
  bullet('GitHub Repository (thư mục mqtt-simulation/ và hardware/): .............................................'),
  bullet('Video demo (nếu có): .............................................'),
  h2('B. Mã nguồn đầy đủ của firmware (hardware/iot_device_node/iot_device_node.ino)'),
  ...codeBlock(fs.readFileSync(path.join(ROOT, 'hardware/iot_device_node/iot_device_node.ino'), 'utf8').replace(/\n+$/, '')),
];

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------
const doc = new Document({
  numbering: {
    config: [{
      reference: 'main-bullets',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 480, hanging: 260 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 260 } } } },
      ],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Times New Roman', size: 24 } } },
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
  sections: [{
    properties: { page: { size: { width: 11907, height: 16840 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Báo cáo Bài 2 IoT — Đỗ Minh Quân', size: 18, color: '94A3B8' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
    children: [
      ...titlePage(),
      new Paragraph({ text: 'MỤC LỤC', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
      new TableOfContents('Mục lục', { hyperlink: true, headingStyleRange: '1-3' }),
      new Paragraph({ children: [new PageBreak()] }),
      ...figuresListPage,
      ...abbreviationsPage,
      ...chapter1,
      ...chapter2,
      ...chapter3,
      ...chapter4,
      ...chapter5,
      ...conclusion,
      ...references,
      ...appendix,
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(path.join(__dirname, 'BaoCao_Bai2_GiaoTiepMQTT_DoMinhQuan.docx'), buffer);
  console.log('Đã tạo report/BaoCao_Bai2_GiaoTiepMQTT_DoMinhQuan.docx');
});
