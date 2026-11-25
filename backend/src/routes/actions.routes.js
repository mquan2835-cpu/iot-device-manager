const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { timeCondition, TIME_ERROR } = require('./sensors.routes');
const { getPaging } = require('../utils/paging');

const router = express.Router();
router.use(requireAuth);

// GET /api/actions?device_id=&action=&status=&q=&from=&to=  (UC05)
//   device_id, action (ON/OFF), status (success/pending/failed): 3 bộ lọc
//   status=failed lấy cả 'failed' (board báo lỗi) lẫn 'timeout' (quá thời gian) -> đều là Thất bại
//   q: ô tìm kiếm theo thời gian, dạng năm-tháng-ngày giờ:phút:giây, vd "2026-10-29 14:30:05"
router.get('/', async (req, res) => {
  const { device_id, action, status, q, from, to } = req.query;
  const conditions = [];
  const params = [];

  if (device_id) { conditions.push('a.device_id = ?'); params.push(device_id); }
  if (action) { conditions.push('a.action = ?'); params.push(String(action).toUpperCase()); }
  if (status === 'failed') {
    conditions.push("a.status IN ('failed', 'timeout')");
  } else if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (q && String(q).trim()) {
    const cond = timeCondition('a.triggered_at', q);
    if (!cond) return res.status(400).json({ message: TIME_ERROR });
    conditions.push(cond.sql);
    params.push(...cond.params);
  }
  if (from) { conditions.push('a.triggered_at >= ?'); params.push(from); }
  if (to) { conditions.push('a.triggered_at <= ?'); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const selectSql = `SELECT a.id, a.device_id, d.name AS device_name, a.user_id, u.full_name AS user_name,
            a.action, a.triggered_by, a.status, a.triggered_at, a.responded_at
     FROM ActionHistory a
     JOIN Device d ON d.id = a.device_id
     JOIN \`User\` u ON u.id = a.user_id
     ${where}
     ORDER BY a.triggered_at DESC, a.id DESC`;

  // Không phân trang: trả mảng 200 dòng mới nhất như cũ
  const paging = getPaging(req.query);
  if (!paging) {
    const [rows] = await pool.query(`${selectSql} LIMIT 200`, params);
    return res.json(rows);
  }

  // Có phân trang (trang Action History): đếm tổng + lấy đúng 1 trang
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ActionHistory a ${where}`, params);
  const [rows] = await pool.query(`${selectSql} LIMIT ? OFFSET ?`, [...params, paging.limit, paging.offset]);
  res.json({ data: rows, total: Number(total), page: paging.page, limit: paging.limit });
});

module.exports = router;
