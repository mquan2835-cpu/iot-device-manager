const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const { signToken } = require('../utils/jwt');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'Thiếu full_name, email hoặc password' });
  }

  const [existing] = await pool.query('SELECT id FROM `User` WHERE email = ?', [email]);
  if (existing.length) {
    return res.status(409).json({ message: 'Email đã được sử dụng' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO `User` (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [full_name, email, passwordHash, 'user']
  );

  const user = { id: result.insertId, full_name, email, role: 'user' };
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Thiếu email hoặc password' });
  }

  const [rows] = await pool.query('SELECT * FROM `User` WHERE email = ?', [email]);
  if (!rows.length) {
    return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
  }

  const userRow = rows[0];
  const match = await bcrypt.compare(password, userRow.password_hash);
  if (!match) {
    return res.status(401).json({ message: 'Sai email hoặc mật khẩu' });
  }

  const user = { id: userRow.id, full_name: userRow.full_name, email: userRow.email, role: userRow.role };
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ token, user });
});

module.exports = router;
