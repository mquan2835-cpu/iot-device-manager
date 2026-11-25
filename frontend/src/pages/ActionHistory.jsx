import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { socket } from '../api/socket';
import Layout from '../components/Layout';
import CopyButton from '../components/CopyButton';
import Pagination from '../components/Pagination';
import { formatTime, isValidTimeQuery, TIME_PLACEHOLDER, TIME_ERROR } from '../utils/time';

const statusStyle = {
  success: { background: '#ECFDF5', color: '#059669' },
  pending: { background: '#EFF6FF', color: '#2563EB' },
  failed: { background: '#FEF2F2', color: '#DC2626' },
  timeout: { background: '#FEF2F2', color: '#DC2626' },   // quá thời gian cũng hiện là Thất bại
};
// Hiển thị: "quá thời gian" (timeout) và "board báo lỗi" (failed) đều gộp thành Thất bại
const STATUS_LABEL = { success: 'Thành công', pending: 'Đang chờ', failed: 'Thất bại', timeout: 'Thất bại' };
// Bộ lọc trạng thái: chỉ 3 lựa chọn. Chọn "Thất bại" thì backend lấy cả failed lẫn timeout
const STATUS_OPTIONS = [['success', 'Thành công'], ['pending', 'Đang chờ'], ['failed', 'Thất bại']];

export default function ActionHistory() {
  // 3 bộ lọc: đổi là lọc luôn
  const [deviceId, setDeviceId] = useState('');
  const [action, setAction] = useState('');
  const [status, setStatus] = useState('');
  // Ô tìm kiếm thời gian: chỉ lọc khi bấm Tìm kiếm / Enter
  const [timeText, setTimeText] = useState('');
  const [timeQuery, setTimeQuery] = useState('');
  const [error, setError] = useState('');

  const [devices, setDevices] = useState([]);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);           // trang đang xem
  const [pageSize, setPageSize] = useState(10);  // số bản ghi mỗi trang
  const [total, setTotal] = useState(0);         // tổng số bản ghi khớp bộ lọc

  // UC05: GET /api/actions?device_id=&action=&status=&q=&page=&limit=
  const load = useCallback(async () => {
    const params = { page, limit: pageSize };
    if (deviceId) params.device_id = deviceId;
    if (action) params.action = action;
    if (status) params.status = status;
    if (timeQuery) params.q = timeQuery;
    try {
      const { data } = await client.get('/actions', { params });
      setRows(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được dữ liệu');
    }
  }, [deviceId, action, status, timeQuery, page, pageSize]);

  useEffect(() => {
    client.get('/devices').then((res) => setDevices(res.data));
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function refresh() { load(); }
    socket.on('device:update', refresh);
    socket.on('action:update', refresh);
    return () => {
      socket.off('device:update', refresh);
      socket.off('action:update', refresh);
    };
  }, [load]);

  function handleSearch(e) {
    e.preventDefault();
    const q = timeText.trim();
    if (q && !isValidTimeQuery(q)) {
      return setError(TIME_ERROR);
    }
    setError('');
    setTimeQuery(q);
    setPage(1);   // tìm kiếm mới -> quay về trang 1
  }

  function handleClear() {
    setTimeText('');
    setTimeQuery('');
    setError('');
    setDeviceId('');
    setAction('');
    setStatus('');
    setPage(1);
  }

  const hasFilter = deviceId || action || status || timeQuery;

  return (
    <Layout title="Action History" subtitle="Nhật ký các lệnh điều khiển thiết bị">
      <form className="filter-bar" onSubmit={handleSearch}>
        <input
          className="search-input"
          value={timeText}
          onChange={(e) => setTimeText(e.target.value)}
          placeholder={TIME_PLACEHOLDER}
        />
        <button className="btn-search" type="submit">Tìm kiếm</button>
      </form>

      <div className="filter-bar">
        <select className="select" value={deviceId} onChange={(e) => { setDeviceId(e.target.value); setPage(1); }}>
          <option value="">Tất cả thiết bị</option>
          {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="select" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">Tất cả hành động</option>
          <option value="ON">Bật (ON)</option>
          <option value="OFF">Tắt (OFF)</option>
        </select>
        <select className="select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        {hasFilter && <button className="btn-light" type="button" onClick={handleClear}>Xóa lọc</button>}
      </div>

      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>ID</th><th>Thiết bị</th><th>Hành động</th><th>Trạng thái</th><th>Thời gian</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700, color: '#64748B' }}>#{a.id}</td>
                <td style={{ fontWeight: 700, color: '#0F172A' }}>{a.device_name}</td>
                <td>
                  <span className="tag" style={a.action === 'ON' ? { background: '#ECFDF5', color: '#059669' } : { background: '#F1F5F9', color: '#64748B' }}>
                    {a.action}
                  </span>
                </td>
                <td>
                  <span className="tag" style={statusStyle[a.status] || statusStyle.pending}>● {STATUS_LABEL[a.status] || a.status}</span>
                </td>
                <td>
                  <span className="time-cell">{formatTime(a.triggered_at)}<CopyButton text={formatTime(a.triggered_at)} /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty-state">Không có lịch sử hành động phù hợp</div>}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </div>
    </Layout>
  );
}
