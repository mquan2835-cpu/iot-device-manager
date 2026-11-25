/**
 * TERMINAL — PUBLISH lệnh điều khiển (mô phỏng Backend / người dùng bấm nút trên Web)
 * Gõ lệnh -> publish {"action":"ON"|"OFF"} lên home/device/{id}/set. Màn hình đứng im, chỉ in khi bạn gõ.
 *
 *   1 ON | 2 OFF | 3 ON          từng thiết bị (1 = Đèn, 2 = Quạt, 3 = Điều hòa)
 *   1 2 ON | 1,3 OFF             2 thiết bị bất kỳ
 *   all ON | all OFF             cả 3
 *
 * Kết quả (thành công hay không) xem ở Terminal "status" (npm run status).
 * Chạy: npm run control
 */
const mqtt = require('mqtt');
const { createConsole } = require('./console_io');
const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const NAMES = { 1: 'Đèn', 2: 'Quạt', 3: 'Điều hòa' };

function log(msg) { console.log(`${new Date().toLocaleTimeString('vi-VN', { hour12: false })}  ${msg}`); }
function help() {
  console.log('\n=== PUBLISH lệnh điều khiển — gõ rồi Enter ===');
  console.log('  1 = Đèn (GPIO3)   2 = Quạt (GPIO4)   3 = Điều hòa (GPIO7)');
  console.log('  Từng cái : 1 ON   2 OFF   3 ON');
  console.log('  2 cái    : 1 2 ON   1 3 OFF   2 3 ON');
  console.log('  Cả 3     : all ON   all OFF');
  console.log('  Gửi thô  : raw <topic> <payload>   vd: raw home/device/9/set {"action":"ON"}   (không kiểm tra, để thử board)\n');
}

log(`Đang kết nối ${BROKER_URL} ...`);
const client = mqtt.connect(BROKER_URL, { clientId: 'pub-control-' + Math.random().toString(16).slice(2, 8), queueQoSZero: false });
let first = true;
client.on('connect', () => { log(first ? 'Đã kết nối Broker.' : 'Đã kết nối lại Broker.'); if (first) help(); first = false; });
client.on('offline', () => log('Mất kết nối Broker — đang tự kết nối lại...'));
client.on('error', () => {});

function parseIds(head) {
  if (/^all$/i.test(head)) return [1, 2, 3];
  const ids = [];
  for (const x of head.split(/[\s,]+/).filter(Boolean)) {
    if (!NAMES[Number(x)]) return null;
    if (!ids.includes(Number(x))) ids.push(Number(x));
  }
  return ids.length ? ids : null;
}

createConsole((line) => {
  // raw <topic> <payload>: gửi NGUYÊN VĂN, không kiểm tra (dùng để thử board từ chối lệnh sai)
  const raw = line.trim().match(/^raw\s+(\S+)\s+(.+)$/i);
  if (raw) {
    if (!client.connected) return log('Chưa kết nối Broker — chờ dòng "Đã kết nối" rồi gõ lại.');
    client.publish(raw[1], raw[2]);
    return log(`PUBLISH (raw, không kiểm tra) ${raw[1]} ${raw[2]}`);
  }

  const m = line.trim().match(/^(.*?)\s*\b(on|off)$/i);
  const ids = m && parseIds(m[1].trim());
  if (!ids) {
    if (!line.trim()) return;
    log(`Lệnh "${line.trim()}" không hợp lệ — KHÔNG gửi đi. Chỉ dùng thiết bị 1, 2, 3 và ON/OFF.`);
    return help();
  }
  if (!client.connected) return log('Chưa kết nối Broker — chờ dòng "Đã kết nối" rồi gõ lại.');
  const action = m[2].toUpperCase();
  for (const id of ids) {
    const topic = `home/device/${id}/set`, payload = JSON.stringify({ action });
    client.publish(topic, payload);
    log(`PUBLISH ${topic} ${payload}   (${NAMES[id]} ${action === 'ON' ? 'BẬT' : 'TẮT'})`);
  }
});
