/**
 * TERMINAL 2 (bản iot_ptit) — Giả lập BACKEND cho firmware hardware/iot_ptit_esp32c3
 *
 * Dùng đúng giao thức của firmware iot_ptit:
 *   PUBLISH   iot_ptit/device_control   {"deviceId":1,"action":"ON"}                        (gửi lệnh)
 *   SUBSCRIBE iot_ptit/device_response  {"deviceId":1,"action":"ON","status":"SUCCESS"}    (board xác nhận)
 *   SUBSCRIBE iot_ptit/data_sensor      {"temperature":30.5,"humidity":61,"light":150}     (mỗi 2 giây)
 *   SUBSCRIBE iot_ptit/device_sync      {"status":"BOOT"}  (board vừa khởi động / kết nối lại)
 *
 * MÀN HÌNH IM LẶNG: cửa sổ này CHỈ in kết quả của lệnh bạn gõ.
 * Dữ liệu cảm biến, tin BOOT, phản hồi lạ... vẫn được xử lý nhưng KHÔNG in ra (xem ở Terminal 3).
 *
 * Lệnh:
 *   1 ON | 2 OFF | 3 ON ...        bật/tắt từng đèn
 *   1 2 ON | 1,3 OFF | 2 3 ON ...  bật/tắt 2 đèn bất kỳ
 *   all ON | all OFF | 1 2 3 ON    cả 3 đèn
 *   status                         xem trạng thái 3 thiết bị
 *   sensor                         in 1 lần giá trị cảm biến mới nhất
 *   chitiet on | chitiet off       bật/tắt in chi tiết (INSERT/UPDATE ActionHistory) để chụp ảnh báo cáo
 *   auto on | auto off             bật/tắt tự động bật LED 1 khi nhiệt độ > ngưỡng (mặc định TẮT)
 *   help                           xem hướng dẫn
 *
 * Chạy: npm run backend:ptit
 */
const mqtt = require('mqtt');
const { createConsole } = require('./console_io');

const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const ACTION_TIMEOUT_MS = Number(process.env.ACTION_TIMEOUT_MS) || 5000;
const TEMP_ALERT_THRESHOLD = Number(process.env.TEMP_ALERT_THRESHOLD) || 32;
const AUTO_DEVICE_ID = Number(process.env.AUTO_DEVICE_ID) || 1;

const TOPIC_DATA_SENSOR = 'iot_ptit/data_sensor';
const TOPIC_DEVICE_CONTROL = 'iot_ptit/device_control';
const TOPIC_DEVICE_RESPONSE = 'iot_ptit/device_response';
const TOPIC_DEVICE_SYNC = 'iot_ptit/device_sync';

const NAMES = { 1: '1 Đèn (GPIO3)', 2: '2 Quạt (GPIO4)', 3: '3 Điều hòa (GPIO7)' };
const state = { 1: 'UNKNOWN', 2: 'UNKNOWN', 3: 'UNKNOWN' };
const pending = {};      // deviceId -> { actionId, action, sentAt, timer, by }
let nextActionId = 1;
let verbose = false;     // chitiet on/off
let autoMode = process.env.AUTO === '1';
let lastSensor = null;
let wasConnected = false;
let helpShown = false;

function log(msg) {
  const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  console.log(`${t}  ${msg}`);
}
const detail = (msg) => { if (verbose) log(`   ${msg}`); };

log(`Đang kết nối ${BROKER_URL} ...`);
const client = mqtt.connect(BROKER_URL, {
  clientId: 'backend-ptit-' + Math.random().toString(16).slice(2, 8),
  queueQoSZero: false,   // lệnh gõ lúc chưa kết nối bị từ chối, không bị gửi muộn
});

client.on('connect', () => {
  client.subscribe([TOPIC_DEVICE_RESPONSE, TOPIC_DATA_SENSOR, TOPIC_DEVICE_SYNC]);
  log(wasConnected ? '🔁 Đã kết nối lại Broker.' : '✅ Đã kết nối MQTT Broker. Gõ lệnh rồi Enter.');
  wasConnected = true;
  if (!helpShown) { printHelp(); helpShown = true; }
});
let offlineNoticed = false;
client.on('offline', () => { if (!offlineNoticed) log('⚠️  Mất kết nối Broker — đang tự kết nối lại...'); offlineNoticed = true; });
client.on('connect', () => { offlineNoticed = false; });
client.on('error', () => {});   // lỗi kết nối đã báo bằng dòng "Mất kết nối" ở trên, không in lặp lại

client.on('message', (topic, raw) => {
  let body;
  try { body = JSON.parse(raw.toString()); } catch { return; }
  if (topic === TOPIC_DEVICE_RESPONSE) onResponse(body);
  else if (topic === TOPIC_DATA_SENSOR) onSensor(body);
  else if (topic === TOPIC_DEVICE_SYNC) onSync(body);
});

function sendCommand(id, action, by = 'user') {
  if (pending[id]) clearTimeout(pending[id].timer);
  const actionId = nextActionId++;
  const payload = JSON.stringify({ deviceId: id, action });
  client.publish(TOPIC_DEVICE_CONTROL, payload);
  if (by === 'user' || verbose) {
    detail(`📝 INSERT ActionHistory #${actionId} (deviceId=${id}, action=${action}, triggered_by=${by}, status=pending)`);
    log(`📤 Gửi ${TOPIC_DEVICE_CONTROL} ${payload}`);
  }
  const timer = setTimeout(() => {
    delete pending[id];
    if (by === 'user' || verbose) {
      log(`⏰ ${NAMES[id]}: KHÔNG phản hồi sau ${ACTION_TIMEOUT_MS / 1000} giây (TIMEOUT)`);
      detail(`-> UPDATE ActionHistory #${actionId} SET status='timeout'`);
    }
  }, ACTION_TIMEOUT_MS);
  pending[id] = { actionId, action, sentAt: Date.now(), timer, by };
}

function onResponse(b) {
  const id = Number(b.deviceId);
  const action = String(b.action || '').toUpperCase();
  if (NAMES[id] && (action === 'ON' || action === 'OFF')) state[id] = action;
  const p = pending[id];
  if (!p) return;                // phản hồi không do lệnh nào ở đây gửi -> bỏ qua, không in
  clearTimeout(p.timer);
  delete pending[id];
  if (p.by === 'user' || verbose) {
    log(`✅ ${NAMES[id]}: ${action === 'ON' ? 'đã BẬT' : 'đã TẮT'}  (board trả SUCCESS sau ${Date.now() - p.sentAt} ms)`);
    detail(`-> UPDATE ActionHistory #${p.actionId} SET status='success'; UPDATE Device #${id} SET current_state='${action}'`);
  }
}

function onSensor(b) {
  lastSensor = { ...b, at: new Date() };   // chỉ lưu lại, KHÔNG in (gõ "sensor" để xem)
  const t = Number(b.temperature);
  if (!autoMode || Number.isNaN(t) || t <= TEMP_ALERT_THRESHOLD) return;
  if (state[AUTO_DEVICE_ID] === 'ON' || pending[AUTO_DEVICE_ID]) return;
  log(`⚠️  Nhiệt độ ${t}°C > ngưỡng ${TEMP_ALERT_THRESHOLD}°C — TỰ ĐỘNG bật ${NAMES[AUTO_DEVICE_ID]}`);
  sendCommand(AUTO_DEVICE_ID, 'ON', 'user');   // in kết quả như lệnh bình thường
}

function onSync() {
  // Board vừa khởi động: gửi lại trạng thái đã biết để board khôi phục đèn (âm thầm, không in)
  Object.keys(state).forEach((id) => {
    if (state[id] === 'ON' || state[id] === 'OFF') sendCommand(Number(id), state[id], 'system');
  });
}

function printHelp() {
  console.log('');
  console.log('=== TERMINAL 2 (Backend) — chỉ in kết quả lệnh bạn gõ ===');
  console.log('  Thiết bị   : 1 = Đèn (GPIO3)   2 = Quạt (GPIO4)   3 = Điều hòa (GPIO7)');
  console.log('  Từng cái   : 1 ON   2 OFF   3 ON ...');
  console.log('  2 cái      : 1 2 ON   1 3 OFF   2 3 ON ...');
  console.log('  Cả 3       : all ON   all OFF');
  console.log('  status     : xem trạng thái 3 thiết bị');
  console.log('  sensor     : xem giá trị cảm biến mới nhất (1 lần)');
  console.log('  chitiet on : in thêm dòng INSERT/UPDATE ActionHistory (chitiet off để tắt)');
  console.log(`  auto on    : tự bật thiết bị ${AUTO_DEVICE_ID} khi nhiệt độ > ${TEMP_ALERT_THRESHOLD}°C (auto off để tắt, hiện đang ${autoMode ? 'BẬT' : 'TẮT'})`);
  console.log('');
}

// Lấy danh sách số đèn từ phần trước chữ ON/OFF. Trả về null nếu có gì không hợp lệ.
function parseIds(line) {
  const head = line.trim().replace(/\s*(on|off)\s*$/i, '').trim();
  if (/^(all|tat ca|tất cả)$/i.test(head)) return [1, 2, 3];
  const parts = head.split(/[\s,]+/).filter(Boolean);
  if (!parts.length) return null;
  const ids = [];
  for (const x of parts) {
    const id = Number(x);
    if (!NAMES[id]) return null;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

createConsole((line) => {
  const text = line.trim();
  if (!text) return;
  const lower = text.toLowerCase();
  const last = lower.split(/\s+/).pop();

  if (lower === 'status') {
    Object.keys(state).forEach((id) =>
      console.log(`   ${NAMES[id].padEnd(18)}: ${state[id] === 'UNKNOWN' ? 'chưa rõ' : state[id]}${pending[id] ? '  (đang chờ phản hồi...)' : ''}`));
  } else if (lower === 'sensor' || lower.startsWith('sensor')) {
    if (!lastSensor) return log('Chưa nhận được dữ liệu cảm biến nào (board đã chạy chưa?).');
    const s = lastSensor;
    log(`📊 Nhiệt độ ${s.temperature}°C | Độ ẩm ${s.humidity}% | Ánh sáng ${s.light}  (lúc ${s.at.toLocaleTimeString('vi-VN', { hour12: false })})`);
  } else if (/^chi\s*tiet/.test(lower) || /^chi\s*tiết/.test(lower)) {
    verbose = last === 'on';
    log(verbose ? 'Đã BẬT in chi tiết ActionHistory.' : 'Đã TẮT in chi tiết.');
  } else if (lower.startsWith('auto')) {
    autoMode = last === 'on';
    log(autoMode ? `Đã BẬT tự động: nhiệt độ > ${TEMP_ALERT_THRESHOLD}°C sẽ bật ${NAMES[AUTO_DEVICE_ID]}.` : 'Đã TẮT tự động.');
  } else if ((last === 'on' || last === 'off') && parseIds(text)) {
    if (!client.connected) return log('❌ Chưa kết nối Broker — chờ dòng "Đã kết nối" rồi gõ lại.');
    const act = last.toUpperCase();
    parseIds(text).forEach((id) => sendCommand(id, act));
  } else {
    printHelp();
  }
});
