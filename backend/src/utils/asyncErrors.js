// Express 4 KHÔNG tự bắt lỗi xảy ra trong hàm async (vd: quên Start MySQL trong XAMPP)
// -> request bị treo, web quay mãi, terminal in ra cả trang lỗi dài.
// File này bọc mọi hàm xử lý của router: có lỗi thì chuyển vào middleware báo lỗi ở cuối server.js,
// web nhận được câu báo lỗi dễ hiểu ngay lập tức.
// Phải require file này TRƯỚC khi require các file routes.
const express = require('express');

function wrap(fn) {
  // Bỏ qua: không phải hàm, middleware báo lỗi (4 tham số), router con (có .stack)
  if (typeof fn !== 'function' || fn.length === 4 || fn.stack) return fn;
  return function wrapped(req, res, next) {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

for (const method of ['get', 'post', 'put', 'patch', 'delete', 'use']) {
  const original = express.Router[method];
  express.Router[method] = function patched(...args) {
    return original.apply(this, args.map(wrap));
  };
}
