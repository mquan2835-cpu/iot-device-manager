const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const ACTION_TIMEOUT_MS = Number(process.env.ACTION_TIMEOUT_MS) || 5000;

// GET /api/devices
router.get('/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, device_type, location, current_state, created_at, updated_at FROM `Device` ORDER BY id'
  );
  res.json(rows);
});

// POST /api/devices
router.post('/', async (req, res) => {
  const { name, device_type, location } = req.body;
  if (!name || !device_type) {
    return res.status(400).json({ message: 'Thiếu name hoặc device_type' });
  }

  const [result] = await pool.query(
    'INSERT INTO `Device` (name, device_type, location, mqtt_topic_control, mqtt_topic_status, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [name, device_type, location || null, 'placeholder/set', 'placeholder/status', req.user.id]
  );
  const id = result.insertId;
  await pool.query(
    'UPDATE `Device` SET mqtt_topic_control = ?, mqtt_topic_status = ? WHERE id = ?',
    [`home/device/${id}/set`, `home/device/${id}/status`, id]
  );

  res.status(201).json({ id, name, device_type, location });
});

// POST /api/devices/:id/action  -> Bật/Tắt thiết bị (UC03)
router.post('/:id/action', async (req, res) => {
  const deviceId = Number(req.params.id);
  const action = (req.body.action || '').toUpperCase();

  if (!['ON', 'OFF'].includes(action)) {
    return res.status(400).json({ message: 'action phải là "ON" hoặc "OFF"' });
  }

  const [deviceRows] = await pool.query('SELECT id FROM `Device` WHERE id = ?', [deviceId]);
  if (!deviceRows.length) {
    return res.status(404).json({ message: 'Không tìm thấy thiết bị' });
  }

  const { mqtt } = req.app.locals;
  const demo = req.app.locals.demo;   // true khi chạy `npm run demo` (luồng giả lập, không cần board)

  // Broker đang tắt thì báo lỗi ngay, không ghi lệnh "treo" vào lịch sử (chế độ demo thì bỏ qua)
  if (!demo && !mqtt.isConnected()) {
    return res.status(503).json({ message: 'Backend chưa kết nối được MQTT Broker (Mosquitto đã chạy chưa?)' });
  }

  const [result] = await pool.query(
    "INSERT INTO ActionHistory (device_id, user_id, action, triggered_by, status) VALUES (?, ?, ?, 'user', 'pending')",
    [deviceId, req.user.id, action]
  );
  const actionId = result.insertId;

  // Publish lệnh xuống MQTT -> phần cứng (Terminal 1 mô phỏng hoặc ESP thật)
  if (mqtt.isConnected()) mqtt.publishDeviceCommand(deviceId, action);

  // LUỒNG GIẢ LẬP: sau 0.5 giây coi như thiết bị đã phản hồi thành công (không cần đếm giờ timeout)
  if (demo) {
    setTimeout(() => {
      mqtt.simulateDeviceStatus(deviceId, action).catch((err) => console.error('[DEMO] Lỗi:', err.code || err.message));
    }, 500);
    return res.status(202).json({ action_id: actionId, status: 'pending' });
  }

  // Nếu sau ACTION_TIMEOUT_MS không nhận được phản hồi status -> đánh dấu timeout
  setTimeout(async () => {
    const [rows] = await pool.query('SELECT status FROM ActionHistory WHERE id = ?', [actionId]);
    if (rows.length && rows[0].status === 'pending') {
      await pool.query("UPDATE ActionHistory SET status = 'timeout' WHERE id = ?", [actionId]);
      req.app.locals.io.emit('action:update', { action_id: actionId, device_id: deviceId, status: 'timeout' });
      console.log(`[ACTION] #${actionId} timeout - thiết bị #${deviceId} không phản hồi`);
    }
  }, ACTION_TIMEOUT_MS);

  res.status(202).json({ action_id: actionId, status: 'pending' });
});

module.exports = router;
