import { io } from 'socket.io-client';
import { DEMO, fakeSocket } from './mock';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

// Kết nối duy nhất, dùng chung cho toàn app (Dashboard, Data Sensor... cùng lắng nghe)
// Chế độ chỉ chạy frontend (npm run demo): dùng socket giả, không kết nối backend
export const socket = DEMO ? fakeSocket : io(SOCKET_URL, { autoConnect: true, reconnection: true });

// Ghi nhớ trạng thái Broker mới nhất (Backend gửi ngay khi socket vừa kết nối),
// để trang nào mở sau cũng biết Backend có đang kết nối MQTT Broker không.
export const realtime = { brokerOnline: true };
socket.on('broker:status', ({ online }) => { realtime.brokerOnline = online; });
