/**
 * TERMINAL — SUBSCRIBE dữ liệu cảm biến
 * Đăng ký topic home/sensor/data để hứng dữ liệu cảm biến do phần cứng (board / Terminal Hardware) publish lên.
 * Mỗi 5 giây board gửi 1 bản tin GỘP: {"temperature":30.5,"humidity":62.0,"light":180} -> in trên 1 dòng.
 *
 * Gõ "raw on" để in thêm gói tin gốc (topic + JSON), "raw off" để tắt.
 * Chạy: npm run sensor
 */
const mqtt = require('mqtt');
const { createConsole } = require('./console_io');
const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const TOPIC = 'home/sensor/data';
const FIELDS = [
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C' },
  { key: 'humidity',    label: 'Độ ẩm',     unit: '%' },
  { key: 'light',       label: 'Ánh sáng',  unit: 'lux' },
];
let showRaw = false;

const now = () => new Date().toLocaleTimeString('vi-VN', { hour12: false });

console.log(`[SENSOR] Đang kết nối ${BROKER_URL} ...`);
const client = mqtt.connect(BROKER_URL, { clientId: 'sub-sensor-' + Math.random().toString(16).slice(2, 8) });

client.on('connect', () => client.subscribe(TOPIC, () =>
  console.log(`[SENSOR] Đã SUBSCRIBE '${TOPIC}' — chờ dữ liệu cảm biến... (gõ "raw on" để xem gói tin gốc)\n`)));

client.on('message', (topic, payload) => {
  let d;
  try { d = JSON.parse(payload.toString()); } catch { return; }
  if (showRaw) console.log(`          ${topic}  ${payload}`);
  const parts = FIELDS.filter((f) => d[f.key] !== undefined).map((f) => `${f.label} ${d[f.key]} ${f.unit}`);
  if (parts.length) console.log(`${now()}  ${parts.join('  |  ')}`);
});
client.on('offline', () => console.log('[SENSOR] Mất kết nối Broker — đang tự kết nối lại...'));
client.on('error', () => {});

createConsole((line) => {
  const t = line.trim().toLowerCase();
  if (t.startsWith('raw')) {
    showRaw = t.endsWith('on');
    console.log(showRaw ? '[SENSOR] Hiện thêm gói tin gốc' : '[SENSOR] Chỉ hiện dòng tổng hợp');
  }
});
