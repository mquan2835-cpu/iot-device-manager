const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/users/me
router.get('/me', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, full_name, email, role, created_at FROM `User` WHERE id = ?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy user' });
  res.json(rows[0]);
});

// PUT /api/users/me
router.put('/me', async (req, res) => {
  const { full_name, old_password, new_password } = req.body;

  if (full_name) {
    await pool.query('UPDATE `User` SET full_name = ? WHERE id = ?', [full_name, req.user.id]);
  }

  if (old_password && new_password) {
    const [rows] = await pool.query('SELECT password_hash FROM `User` WHERE id = ?', [req.user.id]);
    const match = await bcrypt.compare(old_password, rows[0].password_hash);
    if (!match) return res.status(400).json({ message: 'Mật khẩu cũ không đúng' });

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE `User` SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
  }

  res.json({ message: 'Cập nhật thành công' });
});

module.exports = router;
