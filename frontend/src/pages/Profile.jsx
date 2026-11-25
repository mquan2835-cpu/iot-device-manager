import { useEffect, useState } from 'react';
import client from '../api/client';
import Layout from '../components/Layout';
import { deviceIcon, deviceIconBg, IconGithub, IconFigma, IconDocs, IconPdf } from '../components/Icons';
import { PROJECT_LINKS } from '../config/projectLinks';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [devices, setDevices] = useState([]);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    client.get('/devices').then((res) => setDevices(res.data));
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setMsg('');
    const body = { full_name: fullName };
    if (oldPassword && newPassword) {
      body.old_password = oldPassword;
      body.new_password = newPassword;
    }
    await client.put('/users/me', body);
    const updatedUser = { ...user, full_name: fullName };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setOldPassword('');
    setNewPassword('');
    setMsg('Đã cập nhật thông tin thành công');
  }

  const initials = (user?.full_name || 'U').split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

  const links = [
    { title: 'GitHub Repository', sub: PROJECT_LINKS.github.replace('https://', ''), href: PROJECT_LINKS.github, bg: '#0F172A', Icon: IconGithub },
    { title: 'Figma Design', sub: PROJECT_LINKS.figma.replace('https://', ''), href: PROJECT_LINKS.figma, bg: '#7C3AED', Icon: IconFigma },
    { title: 'API Docs (Swagger)', sub: PROJECT_LINKS.apiDocs.replace('https://', ''), href: PROJECT_LINKS.apiDocs, bg: '#14B8A6', Icon: IconDocs },
    { title: 'Báo cáo PDF', sub: 'Báo cáo đồ án tốt nghiệp (5 chương)', href: PROJECT_LINKS.reportPdf, bg: '#DC2626', Icon: IconPdf },
  ];

  return (
    <Layout title="Profile" subtitle="Thông tin cá nhân & liên kết đồ án">
      <div className="profile-grid">
        <form className="card" onSubmit={saveProfile}>
          <div className="profile-avatar">{initials}</div>
          <div className="p-name">{user?.full_name}</div>
          <div className="p-email">{user?.email}</div>
          <div className="p-role-tag">{(user?.role || 'user').toUpperCase()}</div>

          {msg && <div style={{ marginTop: 14, fontSize: 12, fontWeight: 700, color: '#059669' }}>{msg}</div>}

          <div className="field" style={{ marginTop: 18 }}>
            <label>Họ và tên</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="field">
            <label>Mật khẩu cũ</label>
            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="Để trống nếu không đổi mật khẩu" />
          </div>
          <div className="field">
            <label>Mật khẩu mới</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <button className="btn-primary" type="submit">Lưu thay đổi</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div className="card">
            <div className="section-title">Thiết bị đã đăng ký</div>
            {devices.map((d) => {
              const Icon = deviceIcon(d.device_type);
              const isOn = d.current_state === 'ON';
              return (
                <div className="device-row" key={d.id}>
                  <div className="dr-left">
                    <div className="dr-ic" style={{ background: deviceIconBg(d.device_type) }}><Icon /></div>
                    <div>
                      <div className="dr-name">{d.name}</div>
                      <div className="dr-loc">{d.location} · {d.device_type}</div>
                    </div>
                  </div>
                  <span className={isOn ? 'tag' : 'tag'} style={isOn ? { background: '#ECFDF5', color: '#059669' } : { background: '#F1F5F9', color: '#64748B' }}>
                    {d.current_state}
                  </span>
                </div>
              );
            })}
            {!devices.length && <div className="empty-state">Chưa có thiết bị</div>}
          </div>

          <div className="card">
            <div className="section-title">Đồ án IoT &amp; Ứng dụng — Liên kết bắt buộc</div>
            <div className="links-grid">
              {links.map((l) => (
                <a className="link-card" key={l.title} href={l.href} target="_blank" rel="noreferrer">
                  <div className="link-ic" style={{ background: l.bg }}><l.Icon /></div>
                  <div>
                    <div className="link-title">{l.title}</div>
                    <div className="link-sub">{l.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
