/**
 * TERMINAL 1 — Giả lập PHẦN CỨNG (thay cho board ESP32-C3 Super Mini ở Bài 2.1)
 *
 * Vai trò: đóng vai board ESP32-C3 Super Mini có 3 "đèn LED" (Đèn, Quạt, Điều hòa)
 * một cảm biến nhiệt độ/độ ẩm I2C và cảm biến ánh sáng TEMT6000. Dùng ĐÚNG bộ topic của phần cứng thật (Bài 2.2):
 *  - SUBSCRIBE home/device/{id}/set      -> nhận lệnh ON/OFF
 *  - PUBLISH   home/device/{id}/status   -> báo trạng thái thật sau khi "digitalWrite"
 *  - PUBLISH   home/sensor/data          -> {"temperature":..,"humidity":..,"light":..} gộp 3 số đo, mỗi SENSOR_INTERVAL_MS
 *
 * Lệnh gõ trực tiếp trong Terminal 1 (để tái hiện các nhánh ngoại lệ của Sequence Diagram Bài 1):
 *   offline       -> ngắt kết nối MQTT (giả lập ESP mất Wi-Fi)  => Terminal 2 sẽ báo TIMEOUT
 *   online        -> kết nối lại
 *   temp <số>     -> phát ngay 1 giá trị nhiệt độ tuỳ ý, vd "temp 33.5" => kích hoạt UC07 ở Terminal 2
 *   status        -> in trạng thái 3 LED
 *   help          -> xem hướng dẫn
 *
 * Chạy: npm install && npm run hardware
 */
const mqtt = require('mqtt');
const { createConsole } = require('./console_io');

// Mặc định dùng broker công cộng để test nhanh; nên dùng Mosquitto local khi demo/chụp ảnh báo cáo:
//   BROKER_URL=mqtt://localhost:1883 npm run hardware
const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_INTERVAL_MS = Number(process.env.SENSOR_INTERVAL_MS) || 5000;
const CLIENT_ID = 'hardware-simulator-' + Math.random().toString(16).slice(2, 8);

const devices = {
  1: { name: 'Đèn', pin: 'GPIO3', state: 'OFF' },
  2: { name: 'Quạt', pin: 'GPIO4', state: 'OFF' },
  3: { name: 'Điều hòa', pin: 'GPIO7', state: 'OFF' },
};

let client = null;
let sensorTimer = null;
let manualOffline = false; // true khi người dùng chủ động gõ "offline"
let showSensor = process.env.SHOW_SENSOR === '1'; // mặc định KHÔNG in dòng gửi cảm biến -> màn hình đứng yên

function log(msg) {
  const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  console.log(`${t} [HARDWARE] ${msg}`);
}

function start() {
  // Tài khoản MQTT (nếu Broker bật user/password): set MQTT_USER=... và set MQTT_PASS=... trước khi chạy
  const auth = process.env.MQTT_USER ? { username: process.env.MQTT_USER, password: process.env.MQTT_PASS || '' } : {};
  client = mqtt.connect(BROKER_URL, { clientId: CLIENT_ID, reconnectPeriod: 0, ...auth });

  client.on('connect', () => {
    log(`Đã kết nối MQTT Broker ${BROKER_URL} (clientId=${CLIENT_ID})`);
    client.subscribe('home/device/+/set', () => log('Subscribed: home/device/+/set'));

    // Giống setup() của board thật: báo trạng thái ban đầu của cả 3 LED để Backend đồng bộ
    Object.keys(devices).forEach((id) => publishStatus(id));

    // Giống loop() của board thật: đọc cảm biến định kỳ
    sensorTimer = setInterval(() => {
      const temperature = Number((26 + Math.random() * 4).toFixed(1));
      const humidity = Number((55 + Math.random() * 15).toFixed(1));
      publishSensors(temperature, humidity);
    }, SENSOR_INTERVAL_MS);
  });

  client.on('message', onCommand);
  client.on('error', (err) => log(`Lỗi MQTT: ${err.message}`));
  client.on('close', () => {
    clearInterval(sensorTimer);
    sensorTimer = null;
    if (!manualOffline) log('Mất kết nối Broker ngoài ý muốn — gõ "online" để kết nối lại.');
  });
}

function onCommand(topic, payload) {
  const text = payload.toString();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { action: text }; }   // nhận cả JSON lẫn chữ trơn "ON"
  const action = String(body.action || '').toUpperCase().trim();

  // Thiết bị nào? home/device/{id}/set  hoặc  home/device/multi/set {"devices":"1,3"} / {"devices":"all"}
  let ids;
  const single = topic.match(/^home\/device\/([^/]+)\/set$/);
  if (!single) return;
  if (single[1] === 'multi') {
    if (body.devices === undefined) return log(`Thiếu danh sách devices trên ${topic}: ${text} -> bỏ qua`);
    const ds = String(body.devices);
    ids = /all/i.test(ds) ? ['1', '2', '3'] : ['1', '2', '3'].filter((id) => ds.includes(id));
    if (!ids.length) return log(`Không có thiết bị hợp lệ trong devices: ${text} -> bỏ qua`);
  } else if (devices[single[1]]) {
    ids = [single[1]];
  } else {
    return log(`Bỏ qua lệnh cho thiết bị không tồn tại #${single[1]}`);
  }

  if (action !== 'ON' && action !== 'OFF') {
    log(`Payload không hợp lệ trên ${topic}: ${text} -> bỏ qua`);
    return;
  }

  for (const id of ids) {
    devices[id].state = action;
    // Giả lập digitalWrite(LED_PIN, HIGH/LOW)
    log(`Nhận lệnh ${topic} -> ${text} => digitalWrite(${devices[id].pin}, ${action === 'ON' ? 'HIGH' : 'LOW'}) — LED ${devices[id].name} ${action}`);
    // Độ trễ nhỏ giả lập thời gian phần cứng xử lý, rồi phản hồi trạng thái thật
    setTimeout(() => publishStatus(id), 200);
  }
}

function publishStatus(id) {
  const topic = `home/device/${id}/status`;
  const payload = JSON.stringify({ device_id: Number(id), state: devices[id].state });
  client.publish(topic, payload);
  log(`Publish ${topic} -> ${payload}`);
}

function publishSensors(temperature, humidity, lux = Math.round(150 + Math.random() * 100), forceLog = false) {
  const payload = JSON.stringify({ temperature, humidity, light: lux });
  client.publish('home/sensor/data', payload);
  if (showSensor || forceLog) log(`Publish home/sensor/data -> ${payload}`);
}

function printHelp() {
  console.log('\n=== TERMINAL 1 (giả lập ESP32-C3) — lệnh hỗ trợ ===');
  console.log('  offline      : ngắt MQTT, giả lập ESP mất Wi-Fi (Terminal 2 sẽ báo TIMEOUT)');
  console.log('  online       : kết nối lại');
  console.log('  temp <số>    : phát ngay 1 giá trị nhiệt độ, vd: temp 33.5 (kích hoạt UC07)');
  console.log('  sensor on    : hiện dòng gửi cảm biến (mặc định ẨN, vẫn gửi ngầm mỗi 5 giây); sensor off để ẩn');
  console.log('  status       : xem trạng thái 3 LED');
  console.log('  help         : xem hướng dẫn\n');
}

createConsole((line) => {
  const [cmd, arg] = line.trim().split(/\s+/);
  switch ((cmd || '').toLowerCase()) {
    case 'offline':
      if (!client || !client.connected) return log('Đang offline sẵn rồi.');
      log('Giả lập MẤT KẾT NỐI Wi-Fi/MQTT — board sẽ không nhận lệnh và không phản hồi.');
      manualOffline = true;
      client.end(true);
      break;
    case 'online':
      if (client && client.connected) return log('Đang online sẵn rồi.');
      log('Kết nối lại MQTT Broker...');
      manualOffline = false;
      start();
      break;
    case 'temp': {
      const value = Number(arg);
      if (Number.isNaN(value)) return log('Cú pháp: temp <số>, vd temp 33.5');
      if (!client || !client.connected) return log('Đang offline, không publish được.');
      publishSensors(value, Number((55 + Math.random() * 15).toFixed(1)), undefined, true);
      break;
    }
    case 'sensor':
      showSensor = String(arg || '').toLowerCase() === 'on';
      log(showSensor ? 'Hiện dòng gửi cảm biến' : 'Ẩn dòng gửi cảm biến (vẫn gửi ngầm mỗi 5 giây)');
      break;
    case 'status':
      Object.entries(devices).forEach(([id, d]) => console.log(`   #${id} ${d.name.padEnd(9)} (${d.pin.padEnd(5)}) : ${d.state}`));
      break;
    case '':
      break;
    default:
      printHelp();
  }
});

printHelp();
start();
