# Frontend — IoT Device Manager (Bài 3)

React (Vite) + React Router + Socket.io-client. Giao diện dựng theo mockup Figma ở Bài 1 (`design/` — 4 trang Dashboard, Data Sensor, Action History, Profile + Login).

## Cài đặt & chạy

```bash
cd frontend
npm install
cp .env.example .env   # chỉnh VITE_API_URL nếu Backend chạy khác cổng/host
npm run dev
```

Mở `http://localhost:5173`. Đăng nhập bằng tài khoản đã seed ở Bài 3 Backend: `quan@example.com` / `123456`.

## Cấu trúc

```
frontend/src/
├── api/client.js         # axios instance, tự gắn Bearer token
├── api/socket.js         # socket.io-client, dùng chung toàn app
├── context/AuthContext.jsx
├── components/           # Sidebar, Layout, LineChart (SVG thuần), Icons
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx       # 1 màn hình, không cuộn: 3 thẻ thiết bị + 2 cảm biến + chart
│   ├── DataSensor.jsx
│   ├── ActionHistory.jsx
│   └── Profile.jsx         # gồm khối 4 link bắt buộc (Bài 4)
└── config/projectLinks.js  # SỬA 4 link GitHub/Figma/API Docs/Báo cáo PDF ở đây
```

## Trước khi nộp bài — nhớ cập nhật `src/config/projectLinks.js`

File này chứa 4 link hiển thị ở trang Profile theo yêu cầu Bài 4. Thay placeholder bằng link thật:

```js
export const PROJECT_LINKS = {
  github: 'https://github.com/...',
  figma: 'https://www.figma.com/file/...',
  apiDocs: 'https://documenter.getpostman.com/view/...', // hoặc link Swagger UI đã deploy
  reportPdf: 'https://...',
};
```

## Realtime

Trang lắng nghe 3 event từ Backend qua Socket.io (không cần tải lại trang khi có dữ liệu mới):
- `device:update` → cập nhật nút bật/tắt đúng trạng thái thật
- `sensor:update` → cập nhật số liệu + biểu đồ
- `action:update` → cập nhật khi 1 lệnh bị timeout
