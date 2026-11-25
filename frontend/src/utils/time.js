// Thời gian dùng thống nhất 1 dạng: năm/tháng/ngày giờ:phút:giây  (vd 2026/10/28 22:41:18)
// - Bảng dữ liệu hiển thị đúng dạng này
// - Ô tìm kiếm nhập dạng này (gõ dấu - thay cho / cũng được; được bỏ bớt phần cuối, vd 2026/10/28)

export const TIME_PLACEHOLDER = 'Nhập giá trị thời gian, vd: 2026/10/28 22:41:18';
export const TIME_ERROR = 'Thời gian phải nhập dạng năm/tháng/ngày giờ:phút:giây, vd: 2026/10/28 22:41:18';

// MySQL trả về "2026-10-28 22:41:18" -> hiển thị "2026/10/28 22:41:18"
export const formatTime = (value) => {
  const s = String(value || '').replace('T', ' ').slice(0, 19);
  return s.slice(0, 10).replace(/-/g, '/') + s.slice(10);
};

// Hợp lệ: 2026 | 2026/10 | 2026/10/28 | 2026/10/28 22 | 2026/10/28 22:41 | 2026/10/28 22:41:18
const TIME_PATTERN = /^\d{4}([/-]\d{2}([/-]\d{2}( \d{2}(:\d{2}(:\d{2})?)?)?)?)?$/;
export const isValidTimeQuery = (text) => TIME_PATTERN.test(text.trim());
