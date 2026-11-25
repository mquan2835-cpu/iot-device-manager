/**
 * TERMINAL — SUBSCRIBE phản hồi trạng thái thiết bị
 * Đăng ký topic home/device/+/status để nhận xác nhận từ phần cứng sau khi bật/tắt (trạng thái THẬT của LED).
 * Chạy: npm run status
 */
const mqtt = require('mqtt');
const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const TOPIC = 'home/device/+/status';
const NAMES = { 1: 'Đèn (GPIO3)', 2: 'Quạt (GPIO4)', 3: 'Điều hòa (GPIO7)' };

console.log(`[STATUS] Đang kết nối ${BROKER_URL} ...`);
const client = mqtt.connect(BROKER_URL, { clientId: 'sub-status-' + Math.random().toString(16).slice(2, 8) });

client.on('connect', () => client.subscribe(TOPIC, () => console.log(`[STATUS] Đã SUBSCRIBE '${TOPIC}' — chờ phần cứng phản hồi...\n`)));
client.on('message', (topic, payload) => {
  const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  const id = topic.split('/')[2];
  let state = payload.toString();
  try { state = JSON.parse(state).state ?? state; } catch { /* chữ trơn */ }
  state = String(state).toUpperCase();
  console.log(`${t}  ${topic.padEnd(22)} ${payload}`);
  console.log(`          ${NAMES[id] || 'Thiết bị ' + id}: ${state === 'ON' ? 'đang BẬT' : 'đang TẮT'}  (phần cứng báo trạng thái thật)`);
});
client.on('offline', () => console.log('[STATUS] Mất kết nối Broker — đang tự kết nối lại...'));
client.on('error', () => {});
