# Backend — IoT Device Manager (Bài 3)

Node.js + Express + MySQL + MQTT + Socket.io (đẩy dữ liệu realtime xuống Frontend).

## Cài đặt

```bash
cd /d D:\iot-device-manager\backend
npm install
```
File `.env` đã có sẵn, cấu hình cho máy dùng **XAMPP** (MySQL user `root`, không mật khẩu) và **Broker Mosquitto của Bài 2** (`mqtt://localhost:1999`, tài khoản MQTT điền vào `MQTT_USERNAME` / `MQTT_PASSWORD`).

## Tạo cơ sở dữ liệu

Mở XAMPP Control Panel → **Start** dòng MySQL → bấm **Admin** (mở phpMyAdmin) → tab **Import** → chọn `backend/db/schema.sql` → **Import**.

(Đã seed sẵn 1 user `quan@example.com` / mật khẩu `123456`, 3 thiết bị, 3 cảm biến — khớp Bài 1. Import lại nhiều lần không bị lỗi trùng.)

## Chạy server

```bash
npm start
# hoặc khi phát triển (tự reload khi sửa code):
npm run dev
```

Server chạy tại `http://localhost:3000`:
- REST API: `http://localhost:3000/api/...` (đúng theo `docs/api-docs/openapi.yaml`)
- Kiểm tra nhanh: `curl http://localhost:3000/api/health`
- Realtime: Socket.io tại cùng cổng, các event Frontend nên lắng nghe:
  - `device:update` → `{ device_id, state }`
  - `sensor:update` → `{ sensor_id, type, value, unit, recorded_at }`
  - `action:update` → `{ action_id, device_id, status }` (`success` / `timeout` / `failed`)
  - `broker:status` → `{ online }` (Backend có đang kết nối MQTT Broker không)
  - `device:error` → `{ device_id?, message, topic }` (board báo lỗi qua `home/device/error`)
  - `alert:threshold` → cảnh báo UC07

## Cấu trúc thư mục

```
backend/
├── db/schema.sql              # Bảng + seed (đồng bộ với docs/database-design.md)
├── src/
│   ├── server.js               # Điểm khởi động: Express + Socket.io + mount routes
│   ├── db/pool.js              # MySQL connection pool
│   ├── mqtt/mqttClient.js      # Subscribe status/sensor, đồng bộ DB + emit socket
│   ├── middleware/auth.js      # Xác thực JWT Bearer token
│   ├── utils/jwt.js
│   └── routes/
│       ├── auth.routes.js      # POST /register, /login
│       ├── users.routes.js     # GET/PUT /me
│       ├── devices.routes.js   # GET/POST /devices, POST /devices/:id/action
│       ├── sensors.routes.js   # GET /sensors, /sensors/latest
│       └── actions.routes.js   # GET /actions (lịch sử)
```

## Luồng bật/tắt thiết bị (đúng Sequence Diagram ở Bài 1)

1. Frontend gọi `POST /api/devices/:id/action` → Backend `INSERT ActionHistory(status=pending)`.
2. Backend publish MQTT `home/device/:id/set`.
3. Hardware (thật hoặc mô phỏng ở Bài 2.1) xử lý, publish lại `home/device/:id/status`.
4. `mqttClient.js` nhận được, `UPDATE Device.current_state`, `UPDATE ActionHistory` thành `success`, rồi emit `device:update` qua Socket.io để Frontend cập nhật ngay không cần tải lại trang.
5. Nếu không có phản hồi sau `ACTION_TIMEOUT_MS` (mặc định 5s), action tự chuyển sang `timeout`.
6. Nếu board báo lỗi lên `home/device/error`, action đang chờ của thiết bị đó chuyển sang `failed`.
7. Nếu Backend chưa kết nối được Broker, API trả `503` ngay, không ghi lệnh vào lịch sử.

## Test nhanh bằng Postman

Import `docs/api-docs/postman_collection.json`, chạy `Login` trước để tự động lưu `token`, sau đó gọi các API khác.
