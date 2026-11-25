import axios from 'axios';
import { DEMO, mockAdapter } from './mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({ baseURL: API_URL });

// Chế độ chỉ chạy frontend (npm run demo): trả lời bằng dữ liệu giả, không gửi lên backend
if (DEMO) client.defaults.adapter = mockAdapter;

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!location.pathname.startsWith('/login')) {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
