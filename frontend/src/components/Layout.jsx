import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

// fit = true: trang vừa khít 1 màn hình, không cuộn (dùng cho Dashboard)
export default function Layout({ title, subtitle, rightExtra, children, fit = false }) {
  const { user } = useAuth();
  const initials = (user?.full_name || 'U').split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className={`main-area${fit ? ' fit' : ''}`}>
        <div className="topbar">
          <div>
            <div className="page-title">{title}</div>
            {subtitle && <div className="page-sub">{subtitle}</div>}
          </div>
          <div className="top-right">
            {rightExtra}
            <div className="avatar">{initials}</div>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
