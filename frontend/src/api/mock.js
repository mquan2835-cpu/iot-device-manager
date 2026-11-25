// =====================================================================================
// CHẾ ĐỘ CHỈ CHẠY FRONTEND  (chạy bằng: npm run demo  trong thư mục frontend)
// Không cần backend, MySQL, MQTT Broker hay board: mọi API và Socket.io được thay bằng
// dữ liệu giả lưu ngay trong bộ nhớ trình duyệt. Tải lại trang (F5) là dữ liệu tạo lại từ đầu.
//   - Đăng nhập: quan@example.com / 123456
//   - Bật/tắt thiết bị: luôn thành công sau 0.5 giây
//   - Cảm biến: tự sinh số đo mới mỗi 5 giây (biểu đồ tự chạy)
//   - Có thêm khung thứ 4 CHỈ ở chế độ demo: Máy lọc không khí + cảm biến Bụi mịn PM2.5
// Chạy bình thường (npm run dev) thì file này KHÔNG được dùng.
// =====================================================================================

export const DEMO = import.meta.env.MODE === 'demo';

const pad = (n) => String(n).padStart(2, '0');
// Date -> "2026-10-28 22:41:18" (giống định dạng MySQL trả về)
const toSqlTime = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const round = (v, digits) => Number(v.toFixed(digits));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- dữ liệu giả ban đầu
const db = {
  currentUserId: 1,
  users: [
    { id: 1, full_name: 'Đỗ Minh Quân', email: 'quan@example.com', password: '123456', role: 'admin', created_at: toSqlTime(new Date()) },
  ],
  devices: [
    { id: 1, name: 'Đèn phòng khách', device_type: 'light', location: 'Phòng khách', current_state: 'OFF' },
    { id: 2, name: 'Quạt phòng khách', device_type: 'fan', location: 'Phòng khách', current_state: 'ON' },
    { id: 3, name: 'Điều hòa phòng ngủ', device_type: 'air_conditioner', location: 'Phòng ngủ', current_state: 'OFF' },
    { id: 4, name: 'Máy lọc không khí', device_type: 'air_purifier', location: 'Phòng ngủ', current_state: 'OFF' },   // thiết bị thứ 4 (chỉ có ở demo)
  ],
  readings: [],   // mỗi phần tử = 1 lần đo: { recorded_at, temperature, humidity, light, dust }, cũ -> mới
  actions: [],    // lịch sử bật/tắt: { id, device_id, user_id, action, triggered_by, status, triggered_at, responded_at }
  nextActionId: 1,
};

// Số đo giả: dao động nhẹ quanh 28 °C, 55 %, 120 lux, bụi mịn 35 µg/m³
function fakeReading(i, time) {
  return {
    recorded_at: toSqlTime(time),
    temperature: round(28 + Math.sin(i / 20) * 1.5 + (Math.random() - 0.5) * 0.4, 1),
    humidity: round(55 + Math.cos(i / 25) * 5 + (Math.random() - 0.5) * 1.5, 1),
    light: Math.round(120 + Math.sin(i / 10) * 40 + (Math.random() - 0.5) * 10),
    dust: Math.round(35 + Math.sin(i / 15) * 12 + (Math.random() - 0.5) * 4),   // bụi mịn PM2.5 (µg/m³)
  };
}

// 300 lần đo trong quá khứ (mỗi 5 giây = khoảng 25 phút gần nhất)
(function seedReadings() {
  const now = Date.now();
  for (let i = 0; i < 300; i += 1) {
    db.readings.push(fakeReading(i, new Date(now - (299 - i) * 5000)));
  }
})();

// 40 lệnh bật/tắt trong quá khứ, phần lớn thành công, vài lệnh thất bại / quá thời gian
(function seedActions() {
  const now = Date.now();
  for (let i = 0; i < 40; i += 1) {
    const time = new Date(now - (40 - i) * 3 * 60 * 1000);   // cách nhau 3 phút
    const r = Math.random();
    const status = r < 0.8 ? 'success' : r < 0.9 ? 'timeout' : 'failed';
    db.actions.push({
      id: db.nextActionId++,
      device_id: (i % db.devices.length) + 1,   // lần lượt thiết bị 1, 2, 3, 4
      user_id: 1,
      action: i % 2 === 0 ? 'ON' : 'OFF',
      triggered_by: 'user',
      status,
      triggered_at: toSqlTime(time),
      responded_at: status === 'success' ? toSqlTime(new Date(time.getTime() + 400)) : null,
    });
  }
})();

// ---------------------------------------------------------------- Socket.io giả
// Có đủ on / off / emit giống socket thật, để các trang dùng y như cũ
function createFakeSocket() {
  const handlers = {};
  return {
    connected: true,
    on(event, fn) { (handlers[event] = handlers[event] || []).push(fn); return this; },
    off(event, fn) { handlers[event] = (handlers[event] || []).filter((h) => h !== fn); return this; },
    emit(event, payload) { (handlers[event] || []).slice().forEach((h) => h(payload)); },
  };
}
export const fakeSocket = createFakeSocket();

// Mỗi 5 giây sinh 1 lần đo mới và báo cho các trang (giống board gửi home/sensor/data)
const SENSORS = [
  { id: 1, key: 'temperature', type: 'temperature', unit: '°C' },
  { id: 2, key: 'humidity', type: 'humidity', unit: '%' },
  { id: 3, key: 'light', type: 'light_intensity', unit: 'lux' },
  { id: 4, key: 'dust', type: 'dust', unit: 'µg/m³' },   // cảm biến thứ 4: bụi mịn PM2.5
];
if (DEMO) {
  setInterval(() => {
    const reading = fakeReading(db.readings.length, new Date());
    db.readings.push(reading);
    SENSORS.forEach((s) => fakeSocket.emit('sensor:update', {
      sensor_id: s.id, type: s.type, value: reading[s.key], unit: s.unit, recorded_at: reading.recorded_at,
    }));
  }, 5000);
}

// ---------------------------------------------------------------- các hàm giống backend
const TIME_PATTERN = /^\d{4}(-\d{2}(-\d{2}( \d{2}(:\d{2}(:\d{2})?)?)?)?)?$/;
const TIME_ERROR = 'Thời gian phải nhập dạng năm/tháng/ngày giờ:phút:giây, vd: 2026/10/28 22:41:18';

// Lọc theo thời gian: "2026/10/28 22:41" khớp mọi thời điểm bắt đầu bằng "2026-10-28 22:41"
function timeMatcher(text) {
  const q = String(text).trim().replace(/\//g, '-');
  if (!TIME_PATTERN.test(q)) return null;
  return (time) => time.startsWith(q);
}

// Phân trang: trả về { data, total, page, limit } giống backend
function paginate(list, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || 10;
  if (![10, 20, 50, 100].includes(limit)) limit = 10;
  const start = (page - 1) * limit;
  return { data: list.slice(start, start + limit), total: list.length, page, limit };
}

const ok = (data, status = 200) => ({ status, data });
const fail = (status, message) => ({ status, data: { message } });
const publicUser = (u) => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role, created_at: u.created_at });

function handle(method, url, query, body) {
  // ----- Đăng nhập / đăng ký
  if (method === 'POST' && url === '/auth/login') {
    const user = db.users.find((u) => u.email === body.email && u.password === body.password);
    if (!user) return fail(401, 'Sai email hoặc mật khẩu');
    db.currentUserId = user.id;
    return ok({ token: 'demo-token', user: publicUser(user) });
  }
  if (method === 'POST' && url === '/auth/register') {
    if (!body.full_name || !body.email || !body.password) return fail(400, 'Thiếu full_name, email hoặc password');
    if (db.users.some((u) => u.email === body.email)) return fail(409, 'Email đã được sử dụng');
    const user = { id: db.users.length + 1, full_name: body.full_name, email: body.email, password: body.password, role: 'user', created_at: toSqlTime(new Date()) };
    db.users.push(user);
    db.currentUserId = user.id;
    return ok({ token: 'demo-token', user: publicUser(user) }, 201);
  }

  // ----- Hồ sơ
  const me = db.users.find((u) => u.id === db.currentUserId) || db.users[0];
  if (method === 'GET' && url === '/users/me') return ok(publicUser(me));
  if (method === 'PUT' && url === '/users/me') {
    if (body.full_name) me.full_name = body.full_name;
    if (body.old_password && body.new_password) {
      if (body.old_password !== me.password) return fail(400, 'Mật khẩu cũ không đúng');
      me.password = body.new_password;
    }
    return ok({ message: 'Cập nhật thành công' });
  }

  // ----- Thiết bị
  if (method === 'GET' && url === '/devices') return ok(db.devices.map((d) => ({ ...d })));

  const actionMatch = url.match(/^\/devices\/(\d+)\/action$/);
  if (method === 'POST' && actionMatch) {
    const deviceId = Number(actionMatch[1]);
    const action = String(body.action || '').toUpperCase();
    if (!['ON', 'OFF'].includes(action)) return fail(400, 'action phải là "ON" hoặc "OFF"');
    const device = db.devices.find((d) => d.id === deviceId);
    if (!device) return fail(404, 'Không tìm thấy thiết bị');

    const record = {
      id: db.nextActionId++, device_id: deviceId, user_id: me.id, action, triggered_by: 'user',
      status: 'pending', triggered_at: toSqlTime(new Date()), responded_at: null,
    };
    db.actions.push(record);

    // Giả như board phản hồi thành công sau 0.5 giây
    setTimeout(() => {
      device.current_state = action;
      record.status = 'success';
      record.responded_at = toSqlTime(new Date());
      fakeSocket.emit('action:update', { action_id: record.id, device_id: deviceId, status: 'success' });
      fakeSocket.emit('device:update', { device_id: deviceId, state: action });
    }, 500);

    return ok({ action_id: record.id, status: 'pending' }, 202);
  }

  // ----- Cảm biến
  if (method === 'GET' && url === '/sensors/latest') {
    const last = db.readings[db.readings.length - 1];
    return ok(SENSORS.map((s) => ({
      sensor_id: s.id, sensor_type: s.type, value: last[s.key], unit: s.unit, recorded_at: last.recorded_at,
    })));
  }

  if (method === 'GET' && url === '/sensors/search') {
    let list = db.readings.slice().reverse();   // mới nhất trước
    const field = String(query.field || '');
    const q = String(query.q || '').trim();
    if (q) {
      if (['temperature', 'humidity', 'light', 'dust'].includes(field)) {
        const num = Number(q.replace(',', '.'));
        if (Number.isNaN(num)) return fail(400, 'Giá trị tìm kiếm phải là số');
        list = /^-?\d+$/.test(q)
          ? list.filter((r) => r[field] >= num && r[field] < num + 1)        // 28 -> 28.0..28.9
          : list.filter((r) => Math.abs(r[field] - num) < 0.05);             // 28.5 -> đúng 28.5
      } else if (field === 'time') {
        const match = timeMatcher(q);
        if (!match) return fail(400, TIME_ERROR);
        list = list.filter((r) => match(r.recorded_at));
      } else {
        return fail(400, 'Hãy chọn trường cần tìm kiếm');
      }
    }
    if (query.page === undefined) return ok(list.slice(0, 200));   // Dashboard (biểu đồ)
    return ok(paginate(list, query));                              // trang Data Sensor
  }

  // ----- Lịch sử hành động
  if (method === 'GET' && url === '/actions') {
    let list = db.actions.slice().reverse();   // mới nhất trước
    if (query.device_id) list = list.filter((a) => a.device_id === Number(query.device_id));
    if (query.action) list = list.filter((a) => a.action === String(query.action).toUpperCase());
    if (query.status === 'failed') list = list.filter((a) => a.status === 'failed' || a.status === 'timeout');
    else if (query.status) list = list.filter((a) => a.status === query.status);
    if (query.q && String(query.q).trim()) {
      const match = timeMatcher(query.q);
      if (!match) return fail(400, TIME_ERROR);
      list = list.filter((a) => match(a.triggered_at));
    }
    list = list.map((a) => ({
      ...a,
      device_name: (db.devices.find((d) => d.id === a.device_id) || {}).name,
      user_name: (db.users.find((u) => u.id === a.user_id) || {}).full_name,
    }));
    if (query.page === undefined) return ok(list.slice(0, 200));
    return ok(paginate(list, query));
  }

  return fail(404, `Chế độ demo chưa có API ${method} ${url}`);
}

// ---------------------------------------------------------------- gắn vào axios
// axios cho phép thay "adapter" (phần gửi request thật). Ở chế độ demo, thay vì gửi lên
// http://localhost:3000, request được trả lời ngay bằng hàm handle() ở trên.
export async function mockAdapter(config) {
  await sleep(120);   // giả độ trễ mạng cho giống thật
  const method = String(config.method || 'get').toUpperCase();
  const url = String(config.url || '').replace(/^https?:\/\/[^/]+/, '').replace(/^\/api/, '').split('?')[0];
  let body = config.data || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const result = handle(method, url, config.params || {}, body);
  const response = { data: result.data, status: result.status, statusText: String(result.status), headers: {}, config, request: {} };
  if (result.status >= 400) {
    const err = new Error(result.data.message);
    err.response = response;
    err.config = config;
    throw err;
  }
  return response;
}
