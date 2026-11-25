require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

require('./utils/asyncErrors');   // bắt lỗi async của mọi route (phải đứng trước các require routes)
const { initMqtt } = require('./mqtt/mqttClient');
const pool = require('./db/pool');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const devicesRoutes = require('./routes/devices.routes');
const sensorsRoutes = require('./routes/sensors.routes');
const actionsRoutes = require('./routes/actions.routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'iot-device-manager-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/actions', actionsRoutes);

// Middleware báo lỗi: mọi lỗi của các route đều đi vào đây (nhờ utils/asyncErrors.js)
const DB_ERRORS = ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE', 'PROTOCOL_CONNECTION_LOST'];
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (DB_ERRORS.includes(err.code)) {
    console.error(`[DB] ${req.method} ${req.originalUrl} -> lỗi ${err.code}: MySQL trong XAMPP đã Start chưa?`);
    return res.status(503).json({ message: 'Không kết nối được cơ sở dữ liệu (MySQL trong XAMPP đã bật chưa?)' });
  }
  console.error(`[LỖI] ${req.method} ${req.originalUrl}: ${err.message}`);
  res.status(500).json({ message: 'Lỗi hệ thống', detail: err.message });
});

io.on('connection', (socket) => {
  console.log(`[SOCKET] Client kết nối realtime: ${socket.id}`);
  // Báo ngay cho trang web biết Backend có đang kết nối MQTT Broker không
  socket.emit('broker:status', { online: app.locals.mqtt.isConnected() });
  socket.on('disconnect', () => console.log(`[SOCKET] Client ngắt kết nối: ${socket.id}`));
});

// app.locals để các route (devices.routes.js) publish lệnh MQTT / emit socket
app.locals.io = io;
app.locals.mqtt = initMqtt(io);
// Chế độ demo: `npm run demo` -> bật/tắt thiết bị luôn thành công, không cần board và Broker
app.locals.demo = process.argv.includes('--demo') || process.env.DEMO_MODE === 'true';

process.on('unhandledRejection', (err) => {
  console.error('[LỖI NGẦM]', err?.code || err?.message || err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`\nBackend đang chạy tại http://localhost:${PORT}`);
  console.log(`   REST API:    http://localhost:${PORT}/api`);
  console.log(`   Realtime WS: ws://localhost:${PORT} (Socket.io)\n`);
  if (app.locals.demo) {
    console.log('[DEMO] Đang chạy CHẾ ĐỘ GIẢ LẬP: bật/tắt thiết bị luôn thành công sau 0.5 giây, không cần board.\n');
  }
  await checkDatabase();
});

// Kiểm tra CSDL lúc khởi động để báo lỗi dễ hiểu (hay gặp nhất: quên Start MySQL trong XAMPP)
async function checkDatabase() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS n FROM `Device`');
    console.log(`[DB] Kết nối MySQL OK — database "${process.env.DB_NAME}", có ${rows[0].n} thiết bị`);
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error('[DB] Không kết nối được MySQL: mở XAMPP Control Panel và bấm Start ở dòng MySQL.');
    } else if (err.code === 'ER_BAD_DB_ERROR' || err.code === 'ER_NO_SUCH_TABLE') {
      console.error('[DB] Chưa có database/bảng: import file backend/db/schema.sql bằng phpMyAdmin.');
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('[DB] Sai DB_USER / DB_PASSWORD trong file backend/.env');
    } else {
      console.error('[DB] Lỗi CSDL:', err.code || err.message);
    }
  }
}
