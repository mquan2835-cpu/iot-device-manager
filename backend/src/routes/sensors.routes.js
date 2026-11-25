const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');
const { getPaging } = require('../utils/paging');

const router = express.Router();
router.use(requireAuth);

// Tìm theo thời gian: dạng năm/tháng/ngày giờ:phút:giây, vd "2026/10/28 22:41:18" (dấu - cũng được).
// Được bỏ bớt phần cuối: "2026/10/28" (cả ngày), "2026/10/28 22:41" (cả phút đó)...
const TIME_PATTERN = /^\d{4}(-\d{2}(-\d{2}( \d{2}(:\d{2}(:\d{2})?)?)?)?)?$/;
const TIME_ERROR = 'Thời gian phải nhập dạng năm/tháng/ngày giờ:phút:giây, vd: 2026/10/28 22:41:18';

// Trả về { sql, params } để ghép vào WHERE/HAVING, hoặc null nếu nhập sai dạng
function timeCondition(column, text) {
  const q = String(text).trim().replace(/\//g, '-');   // 2026/10/28 -> 2026-10-28 (dạng MySQL)
  if (!TIME_PATTERN.test(q)) return null;
  return { sql: `DATE_FORMAT(${column}, '%Y-%m-%d %H:%i:%s') LIKE ?`, params: [`${q}%`] };
}

// GET /api/sensors?sensor_id=&from=&to=   (API theo thiết kế Bài 1, Dashboard dùng để vẽ biểu đồ)
router.get('/', async (req, res) => {
  const { sensor_id, from, to } = req.query;
  const conditions = [];
  const params = [];

  if (sensor_id) { conditions.push('ds.sensor_id = ?'); params.push(sensor_id); }
  if (from) { conditions.push('ds.recorded_at >= ?'); params.push(from); }
  if (to) { conditions.push('ds.recorded_at <= ?'); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT ds.id, ds.sensor_id, s.sensor_type, ds.value, s.unit, ds.recorded_at
     FROM DataSensor ds JOIN Sensor s ON s.id = ds.sensor_id
     ${where}
     ORDER BY ds.recorded_at DESC
     LIMIT 500`,
    params
  );
  res.json(rows);
});

// GET /api/sensors/search?field=temperature|humidity|light|time&q=giá_trị   (trang Data Sensor)
// Gộp 3 số đo cùng 1 lần gửi của board thành 1 dòng: thời gian | nhiệt độ | độ ẩm | ánh sáng
const NUMBER_FIELDS = ['temperature', 'humidity', 'light'];

router.get('/search', async (req, res) => {
  const field = String(req.query.field || '');
  const q = String(req.query.q || '').trim();
  const having = [];
  const params = [];

  if (q) {
    if (NUMBER_FIELDS.includes(field)) {
      const num = Number(q.replace(',', '.'));
      if (Number.isNaN(num)) {
        return res.status(400).json({ message: 'Giá trị tìm kiếm phải là số' });
      }
      if (/^-?\d+$/.test(q)) {
        // Nhập số nguyên, vd 28 -> lấy mọi giá trị từ 28.0 đến 28.9
        having.push(`${field} >= ? AND ${field} < ?`);
        params.push(num, num + 1);
      } else {
        // Nhập số thập phân, vd 28.5 -> lấy giá trị làm tròn 1 chữ số bằng 28.5
        having.push(`ABS(${field} - ?) < 0.05`);
        params.push(num);
      }
    } else if (field === 'time') {
      const cond = timeCondition('recorded_at', q);
      if (!cond) return res.status(400).json({ message: TIME_ERROR });
      having.push(cond.sql);
      params.push(...cond.params);
    } else {
      return res.status(400).json({ message: 'Hãy chọn trường cần tìm kiếm' });
    }
  }

  const groupSql = `SELECT recorded_at,
            MAX(CASE WHEN sensor_id = 1 THEN value END) AS temperature,
            MAX(CASE WHEN sensor_id = 2 THEN value END) AS humidity,
            MAX(CASE WHEN sensor_id = 3 THEN value END) AS light
     FROM DataSensor
     GROUP BY recorded_at
     ${having.length ? `HAVING ${having.join(' AND ')}` : ''}`;

  // Không phân trang (Dashboard lấy dữ liệu vẽ biểu đồ): trả mảng 200 dòng mới nhất như cũ
  const paging = getPaging(req.query);
  if (!paging) {
    const [rows] = await pool.query(`${groupSql} ORDER BY recorded_at DESC LIMIT 200`, params);
    return res.json(rows);
  }

  // Có phân trang (trang Data Sensor): đếm tổng số dòng + lấy đúng 1 trang
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM (${groupSql}) AS t`, params);
  const [rows] = await pool.query(
    `${groupSql} ORDER BY recorded_at DESC LIMIT ? OFFSET ?`,
    [...params, paging.limit, paging.offset]
  );
  res.json({ data: rows, total: Number(total), page: paging.page, limit: paging.limit });
});

// GET /api/sensors/latest
router.get('/latest', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT ds.sensor_id, s.sensor_type, ds.value, s.unit, ds.recorded_at
    FROM DataSensor ds
    JOIN Sensor s ON s.id = ds.sensor_id
    WHERE ds.id IN (SELECT MAX(id) FROM DataSensor GROUP BY sensor_id)
  `);
  res.json(rows);
});

module.exports = router;
module.exports.timeCondition = timeCondition;
module.exports.TIME_ERROR = TIME_ERROR;
