/**
 * TERMINAL 1 (bản iot_ptit) — Giả lập PHẦN CỨNG, dùng ĐÚNG giao thức của firmware hardware/iot_ptit_esp32c3
 *
 * Ở Bài 2.1 cửa sổ này đóng vai board ESP32-C3; ở Bài 2.2 board thật thay thế hoàn toàn cửa sổ này
 * mà Terminal 2 / Terminal 3 không phải đổi gì (vì cùng topic, cùng payload).
 *
 *   SUBSCRIBE iot_ptit/device_control   {"deviceId":1,"action":"ON"}
 *   PUBLISH   iot_ptit/device_response  {"deviceId":1,"action":"ON","status":"SUCCESS"}
 *   PUBLISH   iot_ptit/data_sensor      {"temperature":..,"humidity":..,"light":..}   mỗi 2 giây
 *   PUBLISH   iot_ptit/device_sync      {"status":"BOOT"}   mỗi lần kết nối broker
 *
 * Lệnh gõ trong cửa sổ này:
 *   offline     ngắt MQTT (giả lập board mất Wi-Fi)  -> Terminal 2 sẽ báo TIMEOUT
 *   online      kết nối lại (board gửi BOOT, Terminal 2 gửi lại trạng thái)
 *   temp <số>   phát ngay 1 giá trị nhiệt độ, vd: temp 33.5
 *   status      xem trạng thái 3 LED
 *
 * Chạy: npm run hardware:ptit
 */
const mqtt = require('mqtt');
const { createConsole } = require('./console_io');

const BROKER_URL = process.env.BROKER_URL || 'mqtt://broker.hivemq.com:1883';
const SENSOR_INTERVAL_MS = Number(process.env.SENSOR_INTERVAL_MS) || 2000;

const TOPIC_DATA_SENSOR = 'iot_ptit/data_sensor';
const TOPIC_DEVICE_CONTROL = 'iot_ptit/device_control';
const TOPIC_DEVICE_RESPONSE = 'iot_ptit/device_response';
const TOPIC_DEVICE_SYNC = 'iot_ptit/device_sync';

const leds = {
  1: { name: 'Đèn', pin: 'GPIO3', state: 'OFF' },
  2: { name: 'Quạt', pin: 'GPIO4', state: 'OFF' },
  3: { name: 'Điều hòa', pin: 'GPIO7', state: 'OFF' },
};

let client = null;
let sensorTimer = null;
let manualOffline = false;
let showSensor = process.env.SHOW_SENSOR === '1';   // mặc định KHÔNG in dòng gửi cảm biến -> màn hình đứng yên để gõ lệnh

function log(msg) {
  const t = new Date().toLocaleTimeString('vi-VN', { hour12: false });
  console.log(`${t} [HARDWARE] ${msg}`);
}

function start() {
  client = mqtt.connect(BROKER_URL, {
    clientId: 'ESP32C3Client-sim-' + Math.random().toString(16).slice(2, 6),
    reconnectPeriod: 0,
  });

  client.on('connect', () => {
    log(`Đã kết nối MQTT Broker ${BROKER_URL}`);
    client.subscribe(TOPIC_DEVICE_CONTROL, () => log(`Subscribed: ${TOPIC_DEVICE_CONTROL}`));
    client.publish(TOPIC_DEVICE_SYNC, JSON.stringify({ status: 'BOOT' }));
    log(`📤 Publish ${TOPIC_DEVICE_SYNC} -> {"status":"BOOT"}`);
    sensorTimer = setInterval(() => {
      publishSensor(Number((29 + Math.random() * 2).toFixed(1)));
    }, SENSOR_INTERVAL_MS);
  });

  client.on('message', (topic, raw) => {
    if (topic !== TOPIC_DEVICE_CONTROL) return;
    let body;
    try { body = JSON.parse(raw.toString()); } catch { return log('[Error] JSON parse failed'); }
    const id = Number(body.deviceId);
    const action = String(body.action || '').toUpperCase().trim();
    if (!leds[id]) return log(`[Warn] deviceId ${body.deviceId} không hợp lệ -> bỏ qua`);
    if (action !== 'ON' && action !== 'OFF') return log(`[Warn] action '${body.action}' không hợp lệ -> bỏ qua`);

    leds[id].state = action;
    log(`⚡ Nhận ${raw} => digitalWrite(${leds[id].pin}, ${action === 'ON' ? 'HIGH' : 'LOW'}) — ${leds[id].name} ${action}`);
    setTimeout(() => {   // giả lập thời gian xử lý phần cứng
      const res = JSON.stringify({ deviceId: id, action, status: 'SUCCESS' });
      client.publish(TOPIC_DEVICE_RESPONSE, res);
      log(`📤 Publish ${TOPIC_DEVICE_RESPONSE} -> ${res}`);
    }, 200);
  });

  client.on('error', (err) => log(`Lỗi MQTT: ${err.message}`));
  client.on('close', () => {
    clearInterval(sensorTimer);
    if (!manualOffline) log('Mất kết nối Broker ngoài ý muốn — gõ "online" để kết nối lại.');
  });
}

function publishSensor(temperature, forceLog = false) {
  const data = {
    temperature,
    humidity: Number((58 + Math.random() * 6).toFixed(1)),
    light: Math.round(200 + Math.random() * 600),   // cùng thang 0..1023 như firmware
  };
  client.publish(TOPIC_DATA_SENSOR, JSON.stringify(data));
  if (showSensor || forceLog) log(`🌡️  Publish ${TOPIC_DATA_SENSOR} -> ${JSON.stringify(data)}`);
}

function printHelp() {
  console.log('\n=== TERMINAL 1 (giả lập ESP32-C3, giao thức iot_ptit) ===');
  console.log('  offline    : ngắt MQTT, giả lập board mất Wi-Fi');
  console.log('  online     : kết nối lại (gửi BOOT)');
  console.log('  temp <số>  : phát ngay 1 giá trị nhiệt độ, vd: temp 33.5');
  console.log('  sensor on   : hiện dòng gửi dữ liệu cảm biến (mặc định ẨN, dữ liệu vẫn được gửi ngầm mỗi 2 giây)');
  console.log('  sensor off  : ẩn lại');
  console.log('  status     : xem trạng thái 3 LED\n');
}

createConsole((line) => {
  const [cmd, arg] = line.trim().split(/\s+/);
  switch ((cmd || '').toLowerCase()) {
    case 'offline':
      if (!client || !client.connected) return log('Đang offline sẵn rồi.');
      manualOffline = true;
      log('🔌 Giả lập MẤT KẾT NỐI Wi-Fi/MQTT');
      client.end(true);
      break;
    case 'online':
      if (client && client.connected) return log('Đang online sẵn rồi.');
      manualOffline = false;
      log('🔁 Kết nối lại MQTT Broker...');
      start();
      break;
    case 'temp': {
      const v = Number(arg);
      if (Number.isNaN(v)) return log('Cú pháp: temp <số>, vd temp 33.5');
      if (!client || !client.connected) return log('Đang offline, không publish được.');
      publishSensor(v, true);
      break;
    }
    case 'sensor':
      showSensor = /on\s*$/i.test(line.trim());
      log(showSensor ? 'Hiện dòng gửi dữ liệu cảm biến' : 'Ẩn dòng gửi dữ liệu cảm biến (vẫn gửi ngầm mỗi 2 giây)');
      break;
    case 'status':
      Object.entries(leds).forEach(([id, d]) => console.log(`   #${id} ${d.name.padEnd(9)} (${d.pin}) : ${d.state}`));
      break;
    case '':
      break;
    default:
      printHelp();
  }
});

printHelp();
start();
