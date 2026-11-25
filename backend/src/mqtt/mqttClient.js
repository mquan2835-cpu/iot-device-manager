const mqtt = require('mqtt');
const pool = require('../db/pool');
require('dotenv').config();

// Broker Mosquitto chạy trên laptop (giống Bài 2): cổng 1999, bắt buộc user/password
const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1999';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
// Thêm hậu tố ngẫu nhiên để không trùng tên client (Broker sẽ đá client trùng tên ra)
const CLIENT_ID = (process.env.MQTT_CLIENT_ID || 'iot-backend-server') + '-' + Math.random().toString(16).slice(2, 6);
const TEMP_ALERT_THRESHOLD = Number(process.env.TEMP_ALERT_THRESHOLD) || 32;

let client = null;
let ioRef = null;   // Socket.io, dùng cho luồng giả lập (simulateDeviceStatus)

/**
 * Khởi tạo kết nối MQTT, subscribe status/sensor, và đồng bộ 2 chiều với DB + Socket.io.
 * @param {import('socket.io').Server} io
 */
function initMqtt(io) {
  ioRef = io;
  client = mqtt.connect(BROKER_URL, {
    clientId: CLIENT_ID,
    username: MQTT_USERNAME || undefined,
    password: MQTT_PASSWORD || undefined,
    reconnectPeriod: 3000,   // mất kết nối thì 3 giây thử lại 1 lần
  });

  let offlineLogged = false;
  let errorLogged = false;
  client.on('connect', () => {
    offlineLogged = false;
    errorLogged = false;
    console.log(`[MQTT] Backend đã kết nối broker ${BROKER_URL} (user: ${MQTT_USERNAME || 'không dùng'})`);
    // Đúng 3 topic mà board ESP32-C3 của Bài 2 publish lên
    client.subscribe(['home/device/+/status', 'home/sensor/data', 'home/device/error'], (err) => {
      if (!err) console.log('[MQTT] Subscribed: home/device/+/status, home/sensor/data, home/device/error');
    });
    io?.emit('broker:status', { online: true });
  });

  client.on('offline', () => {
    if (!offlineLogged) console.log(`[MQTT] Mất kết nối broker ${BROKER_URL} — tự thử lại mỗi 3 giây...`);
    offlineLogged = true;
    io?.emit('broker:status', { online: false });
  });

  client.on('error', (err) => {
    if (errorLogged) return;   // Broker tắt thì mỗi 3 giây lại lỗi 1 lần -> chỉ in lần đầu
    errorLogged = true;
    if (err.code === 4 || err.code === 5) {
      console.error('[MQTT] Broker từ chối đăng nhập: sai MQTT_USERNAME / MQTT_PASSWORD trong file .env');
    } else if (err.code === 'ECONNREFUSED') {
      console.error(`[MQTT] Không kết nối được ${BROKER_URL}: Broker Mosquitto chưa chạy?`);
    } else {
      console.error('[MQTT] Lỗi kết nối:', err.message);
    }
  });

  client.on('message', async (topic, payloadRaw) => {
    const payload = safeJsonParse(payloadRaw.toString());

    try {
      if (/^home\/device\/(\d+)\/status$/.test(topic)) {
        await handleDeviceStatus(topic, payload, io);
      } else if (topic === 'home/sensor/data') {
        await handleSensorData(payload, io);
      } else if (topic === 'home/device/error') {
        await handleDeviceError(payload, io);
      }
    } catch (err) {
      console.error(`[MQTT] Không lưu được bản tin ${topic}: ${err.code || err.message}`);
    }
  });

  return { publishDeviceCommand, isConnected, simulateDeviceStatus };
}

async function handleDeviceStatus(topic, payload, io) {
  const deviceId = Number(topic.match(/^home\/device\/(\d+)\/status$/)[1]);
  const state = (payload.state || '').toUpperCase() === 'ON' ? 'ON' : 'OFF';

  await pool.query('UPDATE `Device` SET current_state = ? WHERE id = ?', [state, deviceId]);

  // Cập nhật bản ghi ActionHistory đang pending gần nhất của thiết bị này -> success
  const [rows] = await pool.query(
    `SELECT id FROM ActionHistory WHERE device_id = ? AND status = 'pending' ORDER BY triggered_at DESC LIMIT 1`,
    [deviceId]
  );
  if (rows.length) {
    await pool.query(
      `UPDATE ActionHistory SET status = 'success', responded_at = NOW() WHERE id = ?`,
      [rows[0].id]
    );
    io?.emit('action:update', { action_id: rows[0].id, device_id: deviceId, status: 'success' });
  }

  console.log(`[MQTT] Device #${deviceId} -> ${state} (đã đồng bộ DB)`);
  io?.emit('device:update', { device_id: deviceId, state });
}

/**
 * Board báo lỗi (Bài 2): home/device/error  {"error":"Thiet bi khong ton tai!","topic":"home/device/4/set"}
 * -> nếu lỗi thuộc 1 thiết bị đang có lệnh pending thì chốt lệnh đó = 'failed' và báo xuống Frontend.
 */
async function handleDeviceError(payload, io) {
  const message = payload.error || 'Thiết bị báo lỗi không rõ nguyên nhân';
  const match = String(payload.topic || '').match(/^home\/device\/(\d+)\/set$/);
  console.log(`[MQTT] Board báo lỗi: ${message} (topic lệnh: ${payload.topic || '?'})`);

  if (!match) {
    io?.emit('device:error', { message, topic: payload.topic });
    return;
  }

  const deviceId = Number(match[1]);
  const [rows] = await pool.query(
    `SELECT id FROM ActionHistory WHERE device_id = ? AND status = 'pending' ORDER BY triggered_at DESC LIMIT 1`,
    [deviceId]
  );
  if (rows.length) {
    await pool.query(`UPDATE ActionHistory SET status = 'failed', responded_at = NOW() WHERE id = ?`, [rows[0].id]);
    io?.emit('action:update', { action_id: rows[0].id, device_id: deviceId, status: 'failed', message });
  } else {
    io?.emit('device:error', { device_id: deviceId, message, topic: payload.topic });
  }
}

// Bản tin cảm biến gộp: home/sensor/data  {"temperature":30.5,"humidity":62.0,"light":180}
// -> tách thành 3 dòng DataSensor theo sensor_id (khớp dữ liệu seed trong schema.sql).
const SENSOR_FIELDS = [
  { key: 'temperature', sensorId: 1, type: 'temperature',     unit: '°C' },
  { key: 'humidity',    sensorId: 2, type: 'humidity',        unit: '%' },
  { key: 'light',       sensorId: 3, type: 'light_intensity', unit: 'lux' },
];

async function handleSensorData(payload, io) {
  // Ô nào board không gửi (cảm biến đọc lỗi / BMP280 không có độ ẩm) thì bỏ qua
  const readings = SENSOR_FIELDS
    .map((f) => ({ ...f, value: Number(payload[f.key]) }))
    .filter((f) => payload[f.key] !== undefined && !Number.isNaN(f.value));
  if (!readings.length) return;

  // Ghi cả 3 số đo bằng 1 câu INSERT -> cùng 1 thời điểm recorded_at,
  // nhờ vậy trang Data Sensor gộp được thành 1 dòng: thời gian | nhiệt độ | độ ẩm | ánh sáng
  await pool.query(
    `INSERT INTO DataSensor (sensor_id, value) VALUES ${readings.map(() => '(?, ?)').join(', ')}`,
    readings.flatMap((f) => [f.sensorId, f.value])
  );

  for (const f of readings) {
    io?.emit('sensor:update', { sensor_id: f.sensorId, type: f.type, value: f.value, unit: f.unit, recorded_at: new Date().toISOString() });
    // UC07 - Cảnh báo & tự động xử lý khi cảm biến nhiệt độ vượt ngưỡng an toàn
    await checkThresholdAndAutoAct(f.sensorId, f.value, io);
  }
}

/**
 * UC07: nếu cảm biến là nhiệt độ và giá trị vượt TEMP_ALERT_THRESHOLD, hệ thống
 * tự động bật thiết bị "Điều hòa" (nếu đang OFF) mà không cần người dùng thao tác,
 * đồng thời phát cảnh báo real-time xuống Frontend qua Socket.io.
 */
async function checkThresholdAndAutoAct(sensorId, value, io) {
  const [sensorRows] = await pool.query('SELECT sensor_type FROM `Sensor` WHERE id = ?', [sensorId]);
  if (!sensorRows.length || sensorRows[0].sensor_type !== 'temperature') return;
  if (value <= TEMP_ALERT_THRESHOLD) return;

  const [acRows] = await pool.query(
    "SELECT id, user_id, current_state FROM `Device` WHERE device_type = 'air_conditioner' LIMIT 1"
  );
  if (!acRows.length) return;
  const ac = acRows[0];

  if (ac.current_state === 'ON') {
    // Điều hòa đã bật sẵn -> chỉ cảnh báo, không tạo lệnh điều khiển mới
    io?.emit('alert:threshold', {
      sensor_id: sensorId, value, threshold: TEMP_ALERT_THRESHOLD,
      device_id: ac.id, auto_action: false, message: `Nhiệt độ ${value}°C vượt ngưỡng ${TEMP_ALERT_THRESHOLD}°C`,
    });
    return;
  }

  const [result] = await pool.query(
    "INSERT INTO ActionHistory (device_id, user_id, action, triggered_by, status) VALUES (?, ?, 'ON', 'system', 'pending')",
    [ac.id, ac.user_id]
  );
  const actionId = result.insertId;

  publishDeviceCommand(ac.id, 'ON');
  console.log(`[UC07] Nhiệt độ ${value}°C vượt ngưỡng ${TEMP_ALERT_THRESHOLD}°C -> tự động bật Điều hòa #${ac.id}`);

  io?.emit('alert:threshold', {
    sensor_id: sensorId, value, threshold: TEMP_ALERT_THRESHOLD,
    device_id: ac.id, action_id: actionId, auto_action: true,
    message: `Nhiệt độ ${value}°C vượt ngưỡng ${TEMP_ALERT_THRESHOLD}°C - đã tự động bật Điều hòa`,
  });

  // Cũng tuân theo cơ chế timeout như lệnh do người dùng bấm (UC03)
  const ACTION_TIMEOUT_MS = Number(process.env.ACTION_TIMEOUT_MS) || 5000;
  setTimeout(async () => {
    const [rows] = await pool.query('SELECT status FROM ActionHistory WHERE id = ?', [actionId]);
    if (rows.length && rows[0].status === 'pending') {
      await pool.query("UPDATE ActionHistory SET status = 'timeout' WHERE id = ?", [actionId]);
      io?.emit('action:update', { action_id: actionId, device_id: ac.id, status: 'timeout' });
      console.log(`[UC07] Lệnh tự động #${actionId} timeout - thiết bị #${ac.id} không phản hồi`);
    }
  }, ACTION_TIMEOUT_MS);
}

/**
 * LUỒNG GIẢ LẬP (chạy bằng `npm run demo`): không cần board, coi như phần cứng đã bật/tắt xong
 * và gửi lại trạng thái -> đi qua đúng hàm xử lý status như khi có board thật
 * (cập nhật Device, ActionHistory = success, đẩy realtime xuống web).
 */
async function simulateDeviceStatus(deviceId, action) {
  console.log(`[DEMO] Giả lập thiết bị #${deviceId} phản hồi: ${action}`);
  await handleDeviceStatus(`home/device/${deviceId}/status`, { device_id: deviceId, state: action }, ioRef);
}

/** Backend có đang kết nối Broker không (route dùng để từ chối lệnh ngay nếu Broker tắt) */
function isConnected() {
  return Boolean(client && client.connected);
}

/** Publish lệnh điều khiển xuống phần cứng qua MQTT (dùng bởi routes/devices) */
function publishDeviceCommand(deviceId, action) {
  if (!client) throw new Error('MQTT client chưa được khởi tạo');
  const topic = `home/device/${deviceId}/set`;
  const payload = JSON.stringify({ action });
  client.publish(topic, payload);
  console.log(`[MQTT] Publish ${topic} -> ${payload}`);
}

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch { return {}; }
}

module.exports = { initMqtt };
