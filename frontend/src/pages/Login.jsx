import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO } from '../api/mock';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('quan@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(fullName, email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-left">
        <div className="brand">
          <div className="brand-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
            </svg>
          </div>
          <div className="brand-name">SmartHome IoT</div>
        </div>

        <div className="hero">
          <h1>Quản lý ngôi nhà<br />thông minh của bạn</h1>
          <p>Giám sát và điều khiển đèn, quạt, điều hòa theo thời gian thực qua giao thức MQTT — ngay trên trình duyệt.</p>
        </div>

        <div className="stats">
          <div><div className="stat-num">3</div><div className="stat-label">Thiết bị kết nối</div></div>
          <div><div className="stat-num">99.9%</div><div className="stat-label">Uptime MQTT</div></div>
          <div><div className="stat-num">&lt;500ms</div><div className="stat-label">Độ trễ điều khiển</div></div>
        </div>
      </div>

      <div className="login-right">
        <form className="form-box" onSubmit={handleSubmit}>
          <div className="form-title">{mode === 'login' ? 'Đăng nhập' : 'Đăng ký tài khoản'}</div>
          <div className="form-sub">
            {mode === 'login' ? 'Nhập thông tin tài khoản để truy cập hệ thống' : 'Tạo tài khoản mới để bắt đầu quản lý thiết bị'}
          </div>

          {DEMO && (
            <div className="search-note">Chế độ demo (chỉ frontend, dữ liệu giả): đăng nhập bằng <strong>quan@example.com</strong> / <strong>123456</strong></div>
          )}
          {error && <div className="form-error">{error}</div>}

          {mode === 'register' && (
            <div className="field">
              <label>Họ và tên</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>

          <div className="footer-note">
            {mode === 'login' ? (
              <>Chưa có tài khoản?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('register'); setError(''); }}>Đăng ký ngay</a>
              </>
            ) : (
              <>Đã có tài khoản?{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setMode('login'); setError(''); }}>Đăng nhập</a>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
