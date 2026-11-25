import { NavLink } from 'react-router-dom';
import { IconGrid, IconChart, IconClock, IconUser, IconLogout } from './Icons';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', Icon: IconGrid, end: true },
  { to: '/data-sensor', label: 'Data Sensor', Icon: IconChart },
  { to: '/action-history', label: 'Action History', Icon: IconClock },
  { to: '/profile', label: 'Profile', Icon: IconUser },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const initials = (user?.full_name || 'U').split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-badge">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </svg>
        </div>
        <div>
          <div className="logo-text">SmartHome IoT</div>
          <div className="logo-sub">Device Manager</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="avatar">{initials}</div>
        <div style={{ flex: 1 }}>
          <div className="sf-name">{user?.full_name}</div>
          <button className="sf-role" onClick={logout} title="Đăng xuất">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <IconLogout /> Đăng xuất
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
