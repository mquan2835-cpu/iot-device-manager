/**
 * TERMINAL 2 — Giả lập BACKEND, đúng giao thức MQTT thiết kế ở Bài 1 (giống backend/src/mqtt/mqttClient.js)
 *
 *   PUBLISH   home/device/{id}/set     {"action":"ON"}                    (gửi lệnh — như bấm nút trên Web)
 *   SUBSCRIBE home/device/+/status     {"device_id":1,"state":"ON"}       (phần cứng báo trạng thái thật)
 *   SUBSCRIBE home/sensor/data         {"temperature":30.5,"humidity":62.0,"light":180}   (gộp 3 số đo)
 *
 *   Mỗi lệnh chờ phản hồi tối đa ACTION_TIMEOUT_MS (5 s) -> quá hạn thì báo TIMEOUT (nhánh else sơ đồ UC03).
 *
 * MÀN HÌNH IM LẶNG: cửa sổ này CHỈ in kết quả lệnh bạn gõ. Dữ liệu cảm biến vẫn được nhận ngầm (xem ở Terminal 3).
 *
 * Lệnh:
 *   1 ON | 2 OFF | 3 ON ...        bật/tắt từng thiết bị  (1 = Đèn, 2 = Quạt, 3 = Điều hòa)
 *   1 2 ON | 1,3 OFF ...           2 thiết bị bất kỳ
 *   all ON | all OFF | 1 2 3 ON    cả 3
 *   status                         trạng thái 3 thiết bị
 *   sensor                         in 1 lần số đo cảm biến mới nhất
 *   chitiet on | chitiet off       in thêm dòng INSERT/UPDATE ActionHistory (để chụp ảnh báo cáo)
 *   auto on | auto off             UC07: tự bật Điều hòa khi nhiệt độ > ngưỡng (mặc định TẮT)
 *
 * Chạy: npm run backend
 */
const mqtt = require('mqtt');
const { createConsole } = require('./console_io');

const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const ACTION_TIMEOUT_MS = Number(process.env.ACTION_TIMEOUT_MS) || 5000;
const TEMP_ALERT_THRESHOLD = Number(process.env.TEMP_ALERT_THRESHOLD) || 32;
const AC_DEVICE_ID = 3;   // UC07 tự bật Điều hòa

const NAMES = { 1: '1 Đèn (GPIO3)', 2: '2 Quạt (GPIO4)', 3: '3 Điều hòa (GPIO7)' };
const state = { 1: 'UNKNOWN', 2: 'UNKNOWN', 3: 'UNKNOWN' };   // giả lập cột Device.current_state
const pending = {};      // deviceId -> { actionId, action, sentAt, timer, by }  (ActionHistory đang pending)
const lastSensor = {};   // sensor_id -> { value, unit, type, at }
let nextActionId = 1;
let verbose = false;
let autoMode = process.env.AUTO === '1';
let wasConnected = false;
let offlineNoticed = false;

function log(msg) {
  const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  console.log(`${t}  ${msg}`);
}
const detail = (msg) => { if (verbose) log(`   ${msg}`); };

log(`Đang kết nối ${BROKER_URL} ...`);
const client = mqtt.connect(BROKER_URL, {
  clientId: 'backend-sim-' + Math.random().toString(16).slice(2, 8),
  queueQoSZero: false,   // lệnh gõ lúc chưa kết nối bị từ chối, không bị gửi muộn
});

client.on('connect', () => {
  client.subscribe(['home/device/+/status', 'home/sensor/data']);
  log(wasConnected ? 'Đã kết nối lại Broker.' : 'Đã kết nối MQTT Broker. Gõ lệnh rồi Enter.');
  if (!wasConnected) printHelp();
  wasConnected = true;
  offlineNoticed = false;
});
client.on('offline', () => { if (!offlineNoticed) log('Mất kết nối Broker — đang tự kết nối lại...'); offlineNoticed = true; });
client.on('error', () => {});

client.on('message', (topic, raw) => {
  let body;
  try { body = JSON.parse(raw.toString()); } catch { body = { state: raw.toString() }; }
  const st = topic.match(/^home\/device\/(\d+)\/status$/);
  if (st) return onStatus(Number(st[1]), body);
  if (topic === 'home/sensor/data') return onSensorData(body);
});

/** Giống POST /api/devices/:id/action của Backend thật: INSERT pending -> PUBLISH set -> đếm giờ */
function sendCommand(id, action, by = 'user') {
  if (pending[id]) clearTimeout(pending[id].timer);
  const actionId = nextActionId++;
  const topic = `home/device/${id}/set`;
  const payload = JSON.stringify({ action });
  detail(`INSERT ActionHistory #${actionId} (device_id=${id}, action=${action}, triggered_by=${by}, status=pending)`);
  client.publish(topic, payload);
  log(`Gửi ${topic} ${payload}`);
  const timer = setTimeout(() => {
    delete pending[id];
    log(`${NAMES[id]}: KHÔNG phản hồi sau ${ACTION_TIMEOUT_MS / 1000} giây (TIMEOUT)`);
    detail(`-> UPDATE ActionHistory #${actionId} SET status='timeout'`);
  }, ACTION_TIMEOUT_MS);
  pending[id] = { actionId, action, sentAt: Date.now(), timer, by };
}

/** Giống handleDeviceStatus(): cập nhật Device.current_state, chốt ActionHistory pending -> success */
function onStatus(id, body) {
  if (!NAMES[id]) return;
  const s = String(body.state || '').toUpperCase() === 'ON' ? 'ON' : 'OFF';
  state[id] = s;
  const p = pending[id];
  if (!p) return;              // bản tin đồng bộ (board vừa kết nối) -> chỉ cập nhật trạng thái, không in
  clearTimeout(p.timer);
  delete pending[id];
  log(`${NAMES[id]}: ${s === 'ON' ? 'đã BẬT' : 'đã TẮT'}  (board báo ${JSON.stringify(body)} sau ${Date.now() - p.sentAt} ms)`);
  detail(`-> UPDATE ActionHistory #${p.actionId} SET status='success'; UPDATE Device #${id} SET current_state='${s}'`);
}

/** Giống handleSensorData(): tách bản tin gộp thành 3 sensor_id -> INSERT DataSensor + UC07 */
const SENSOR_FIELDS = [['temperature', 1, '°C'], ['humidity', 2, '%'], ['light', 3, 'lux']];
function onSensorData(body) {
  for (const [key, id, unit] of SENSOR_FIELDS) {
    if (body[key] === undefined || Number.isNaN(Number(body[key]))) continue;
    lastSensor[id] = { value: Number(body[key]), unit, at: new Date() };
  }
  const value = Number(body.temperature);
  if (!autoMode || Number.isNaN(value) || value <= TEMP_ALERT_THRESHOLD) return;
  if (state[AC_DEVICE_ID] === 'ON' || pending[AC_DEVICE_ID]) return;
  log(`Nhiệt độ ${value}°C > ngưỡng ${TEMP_ALERT_THRESHOLD}°C — TỰ ĐỘNG bật ${NAMES[AC_DEVICE_ID]} (UC07)`);
  sendCommand(AC_DEVICE_ID, 'ON', 'system');
}

function printHelp() {
  console.log('');
  console.log('=== TERMINAL 2 (Backend) — chỉ in kết quả lệnh bạn gõ ===');
  console.log('  Thiết bị   : 1 = Đèn (GPIO3)   2 = Quạt (GPIO4)   3 = Điều hòa (GPIO7)');
  console.log('  Từng cái   : 1 ON   2 OFF   3 ON ...');
  console.log('  2 cái      : 1 2 ON   1 3 OFF   2 3 ON ...');
  console.log('  Cả 3       : all ON   all OFF');
  console.log('  status     : xem trạng thái 3 thiết bị');
  console.log('  sensor     : xem số đo cảm biến mới nhất (1 lần)');
  console.log('  chitiet on : in thêm dòng INSERT/UPDATE ActionHistory (chitiet off để tắt)');
  console.log(`  auto on    : UC07 — tự bật Điều hòa khi nhiệt độ > ${TEMP_ALERT_THRESHOLD}°C (auto off để tắt, hiện đang ${autoMode ? 'BẬT' : 'TẮT'})`);
  console.log('');
}

// Lấy danh sách số thiết bị từ phần trước chữ ON/OFF. Trả về null nếu không hợp lệ.
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
  } else if (lower.startsWith('sensor')) {
    const label = { 1: 'Nhiệt độ', 2: 'Độ ẩm', 3: 'Ánh sáng' };
    const ids = Object.keys(lastSensor);
    if (!ids.length) return log('Chưa nhận được dữ liệu cảm biến nào (board đã chạy chưa?).');
    log('' + ids.map((id) => `${label[id] || 'Cảm biến ' + id} ${lastSensor[id].value} ${lastSensor[id].unit}`).join(' | '));
  } else if (/^chi\s*ti[eế]t/.test(lower)) {
    verbose = last === 'on';
    log(verbose ? 'Đã BẬT in chi tiết ActionHistory.' : 'Đã TẮT in chi tiết.');
  } else if (lower.startsWith('auto')) {
    autoMode = last === 'on';
    log(autoMode ? `Đã BẬT UC07: nhiệt độ > ${TEMP_ALERT_THRESHOLD}°C sẽ tự bật Điều hòa.` : 'Đã TẮT tự động.');
  } else if ((last === 'on' || last === 'off') && parseIds(text)) {
    if (!client.connected) return log('Chưa kết nối Broker — chờ dòng "Đã kết nối" rồi gõ lại.');
    parseIds(text).forEach((id) => sendCommand(id, last.toUpperCase()));
  } else {
    printHelp();
  }
});
