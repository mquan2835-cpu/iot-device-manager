/**
 * TERMINAL 3 — Quan sát toàn bộ gói tin đi qua MQTT Broker
 *
 * Tương đương: mosquitto_sub -h <broker> -t 'home/#' -v
 * Dùng file này khi máy chưa cài Mosquitto client (thường gặp trên Windows).
 *
 * Wildcard '#' = mọi topic con của home/  => thấy cả lệnh (…/set), phản hồi (…/status) và dữ liệu cảm biến.
 * Chạy: npm run monitor              (topic home/#)
 *       npm run monitor:ptit         (topic iot_ptit/# — dùng với firmware iot_ptit_esp32c3)
 *       node terminal3_monitor.js <topic>   (nghe topic tuỳ ý)
 */
const mqtt = require('mqtt');
const { createConsole } = require('./console_io');

const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const TOPIC = process.argv[2] || process.env.MONITOR_TOPIC || 'home/#';
const client = mqtt.connect(BROKER_URL, { clientId: 'monitor-' + Math.random().toString(16).slice(2, 8) });

const ARROW = (topic) => {
  if (topic.endsWith('/set') || topic.endsWith('/device_control')) return 'Backend  → Hardware';
  if (/\/(device_response|data_sensor|device_sync)$/.test(topic)) return 'Hardware → Backend ';
  if (topic.endsWith('/status')) return 'Hardware → Backend ';
  if (topic.includes('/sensor/')) return 'Hardware → Backend ';
  return '                   ';
};

client.on('connect', () => {
  client.subscribe(TOPIC, () => console.log(`[MONITOR] Đã kết nối ${BROKER_URL}, đang nghe topic '${TOPIC}'\n` +
    `[MONITOR] Đang HIỆN dữ liệu cảm biến — gõ "sensor off" để ẩn, "sensor on" để hiện lại\n`));
});

// Gõ "sensor off" để ẩn các bản tin dữ liệu cảm biến (chỉ còn lệnh/phản hồi), "sensor on" để hiện lại
let showSensor = process.env.SHOW_SENSOR !== '0';   // mặc định HIỆN dữ liệu cảm biến; gõ "sensor off" để ẩn
createConsole((line) => {
  if (/^\s*sensor/i.test(line)) {
    showSensor = /on\s*$/i.test(line.trim());
    console.log(showSensor ? '[MONITOR] Hiện bản tin cảm biến' : '[MONITOR] Ẩn bản tin cảm biến — chỉ hiện lệnh / phản hồi / BOOT');
  }
});

client.on('message', (topic, payload) => {
  if (!showSensor && (topic.includes('/sensor/') || topic.endsWith('/sensor/data') || topic.endsWith('/data_sensor'))) return;
  const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  console.log(`${t}  ${ARROW(topic)}  ${topic.padEnd(25)} ${payload.toString()}`);
  const hd = topic.match(/^home\/device\/(\d+)\/(set|status)$/);
  if (hd) console.log(`          (${['', 'Đèn', 'Quạt', 'Điều hòa'][hd[1]] || 'thiết bị ' + hd[1]} — ${hd[2] === 'set' ? 'lệnh gửi xuống' : 'board báo trạng thái thật'})`);
  if (topic.endsWith('/data_sensor') || topic === 'home/sensor/data') {
    try {
      const d = JSON.parse(payload.toString());
      console.log(`          Nhiệt độ: ${d.temperature} °C   Độ ẩm: ${d.humidity} %   Ánh sáng: ${d.light}`);
    } catch { /* payload không phải JSON thì chỉ in dòng gốc ở trên */ }
  }
});

client.on('error', (err) => console.log(`[MONITOR] Lỗi MQTT: ${err.message}`));
