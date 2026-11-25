import { useEffect, useState, useCallback, useRef } from 'react';
import client from '../api/client';
import { socket } from '../api/socket';
import Layout from '../components/Layout';
import CopyButton from '../components/CopyButton';
import Pagination from '../components/Pagination';
import { formatTime, isValidTimeQuery, TIME_PLACEHOLDER, TIME_ERROR } from '../utils/time';
import { DEMO } from '../api/mock';

// 4 trường được phép tìm kiếm + chữ gợi ý trong ô search tương ứng
const FIELDS = {
  temperature: { label: 'Nhiệt độ', unit: '°C', placeholder: 'Nhập giá trị nhiệt độ (°C), vd: 28 hoặc 28.5', numeric: true },
  humidity: { label: 'Độ ẩm', unit: '%', placeholder: 'Nhập giá trị độ ẩm (%), vd: 60', numeric: true },
  light: { label: 'Ánh sáng', unit: 'lux', placeholder: 'Nhập giá trị ánh sáng (lux), vd: 120', numeric: true },
  // Bụi mịn chỉ có ở chế độ demo (npm run demo)
  ...(DEMO ? { dust: { label: 'Bụi mịn', unit: 'µg/m³', placeholder: 'Nhập giá trị bụi mịn (µg/m³), vd: 35', numeric: true } } : {}),
  time: { label: 'Thời gian', unit: '', placeholder: TIME_PLACEHOLDER, numeric: false },
};

const show = (v, digits = 1) => (v === null || v === undefined ? '--' : Number(v).toFixed(digits));

export default function DataSensor() {
  const [field, setField] = useState('');       // trường đang chọn trong dropdown (CHƯA tìm)
  const [text, setText] = useState('');         // chữ đang gõ trong ô search (CHƯA tìm)
  const [applied, setApplied] = useState(null); // điều kiện đã bấm Tìm kiếm: { field, q }
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);           // trang đang xem
  const [pageSize, setPageSize] = useState(10);  // số bản ghi mỗi trang
  const [total, setTotal] = useState(0);         // tổng số bản ghi (của cả kết quả tìm kiếm)
  const reloadTimer = useRef(null);

  // Chỉ gọi API khi đã bấm Tìm kiếm (applied đổi) hoặc đổi trang, KHÔNG gọi khi mới đổi dropdown
  const load = useCallback(async () => {
    const params = { page, limit: pageSize, ...(applied ? { field: applied.field, q: applied.q } : {}) };
    try {
      const { data } = await client.get('/sensors/search', { params });
      setRows(data.data);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được dữ liệu');
    }
  }, [applied, page, pageSize]);

  useEffect(() => { load(); }, [load]);

  // Đang xem trang 1 của tất cả dữ liệu thì tự cập nhật khi có số đo mới;
  // đang tìm kiếm hoặc đang xem trang khác thì giữ nguyên, không bị nhảy dòng
  useEffect(() => {
    if (applied || page !== 1) return undefined;
    function onSensorUpdate() {
      clearTimeout(reloadTimer.current);   // 1 lần board gửi = 3 sự kiện -> chỉ tải lại 1 lần
      reloadTimer.current = setTimeout(load, 300);
    }
    socket.on('sensor:update', onSensorUpdate);
    return () => { socket.off('sensor:update', onSensorUpdate); clearTimeout(reloadTimer.current); };
  }, [applied, page, load]);

  function handleSearch(e) {
    e.preventDefault();
    const q = text.trim();
    if (!field) return setError('Hãy chọn trường cần tìm kiếm trước.');
    if (!q) return setError(`Hãy nhập giá trị ${FIELDS[field].label.toLowerCase()} cần tìm.`);
    if (FIELDS[field].numeric && Number.isNaN(Number(q.replace(',', '.')))) {
      return setError(`Giá trị ${FIELDS[field].label.toLowerCase()} phải là số.`);
    }
    if (field === 'time' && !isValidTimeQuery(q)) {
      return setError(TIME_ERROR);
    }
    setError('');
    setApplied({ field, q });
    setPage(1);   // tìm kiếm mới -> quay về trang 1
  }

  function handleClear() {
    setText('');
    setError('');
    setApplied(null);
    setPage(1);
  }

  return (
    <Layout title="Data Sensor" subtitle="Lịch sử dữ liệu cảm biến nhiệt độ, độ ẩm & ánh sáng">
      <form className="filter-bar" onSubmit={handleSearch}>
        <select
          className="select"
          value={field}
          onChange={(e) => { setField(e.target.value); setError(''); }}
        >
          <option value="">-- Chọn trường tìm kiếm --</option>
          {Object.entries(FIELDS).map(([key, f]) => <option key={key} value={key}>{f.label}</option>)}
        </select>
        <input
          className="search-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={field ? FIELDS[field].placeholder : 'Chọn trường cần tìm trước'}
          disabled={!field}
        />
        <button className="btn-search" type="submit">Tìm kiếm</button>
        {applied && <button className="btn-light" type="button" onClick={handleClear}>Xóa tìm kiếm</button>}
      </form>

      {error && <div className="form-error" style={{ marginBottom: 14 }}>{error}</div>}
      {applied && (
        <div className="search-note">
          Kết quả tìm <strong>{FIELDS[applied.field].label}</strong> = <strong>{applied.q}</strong>
          {FIELDS[applied.field].unit && ` ${FIELDS[applied.field].unit}`}: {total} bản ghi
        </div>
      )}

      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Chi tiết dữ liệu</div>
        <table>
          <thead>
            <tr><th>STT</th><th>Nhiệt độ (°C)</th><th>Độ ẩm (%)</th><th>Ánh sáng (lux)</th>{DEMO && <th>Bụi mịn (µg/m³)</th>}<th>Thời gian</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.recorded_at}>
                <td>{(page - 1) * pageSize + i + 1}</td>
                <td><span className="tag" style={{ background: '#FEE2E2', color: '#DC2626' }}>{show(r.temperature)}</span></td>
                <td><span className="tag" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>{show(r.humidity)}</span></td>
                <td><span className="tag" style={{ background: '#FEF3C7', color: '#B45309' }}>{show(r.light, 0)}</span></td>
                {DEMO && <td><span className="tag" style={{ background: '#EDE9FE', color: '#6D28D9' }}>{show(r.dust, 0)}</span></td>}
                <td>
                  <span className="time-cell">{formatTime(r.recorded_at)}<CopyButton text={formatTime(r.recorded_at)} /></span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="empty-state">Không có dữ liệu</div>}
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
