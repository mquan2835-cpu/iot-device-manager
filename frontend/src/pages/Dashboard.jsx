import { useEffect, useState, useCallback, useRef } from 'react';
import client from '../api/client';
import { socket } from '../api/socket';
import Layout from '../components/Layout';
import TimeChart from '../components/TimeChart';
import { deviceIcon, deviceIconBg, IconThermometer, IconDroplet, IconSun, IconDust } from '../components/Icons';
import { DEMO } from '../api/mock';

// Mỗi khung trên Dashboard = 1 thiết bị + 1 chỉ số cảm biến đi kèm:
//   Đèn - Ánh sáng | Quạt - Nhiệt độ | Điều hòa - Độ ẩm | Máy lọc không khí - Bụi mịn (chỉ ở demo)
const PAIRED_SENSOR = {
  light:           { sensorId: 3, label: 'ÁNH SÁNG', unit: 'lux', digits: 0, Icon: IconSun,         bg: '#FEF3C7' },
  fan:             { sensorId: 1, label: 'NHIỆT ĐỘ', unit: '°C',  digits: 1, Icon: IconThermometer, bg: '#FFE4E6' },
  air_conditioner: { sensorId: 2, label: 'ĐỘ ẨM',    unit: '%',   digits: 1, Icon: IconDroplet,     bg: '#DBEAFE' },
  air_purifier:    { sensorId: 4, label: 'BỤI MỊN',  unit: 'µg/m³', digits: 0, Icon: IconDust, bg: '#EDE9FE' },
};

const CHART_POINTS = 30;   // số lần đo gần nhất vẽ trên biểu đồ
// Lưới an toàn: bấm công tắc mà sau 8 giây vẫn chưa nhận được kết quả qua realtime
// (mất kết nối socket, backend lỗi...) thì bỏ "Đang chờ" và hỏi lại backend trạng thái thật
const PENDING_TIMEOUT_MS = 8000;
const CHART_SERIES = [
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', color: '#E11D48', axis: 'left', digits: 1 },
  { key: 'humidity', label: 'Độ ẩm', unit: '%', color: '#2563EB', axis: 'left', digits: 1 },
  { key: 'light', label: 'Ánh sáng', unit: 'lux', color: '#D97706', axis: 'right', digits: 0 },
  // Đường thứ 4 chỉ có ở chế độ demo (backend thật chưa có cảm biến bụi mịn)
  ...(DEMO ? [{ key: 'dust', label: 'Bụi mịn', unit: 'µg/m³', color: '#7C3AED', axis: 'left', digits: 0 }] : []),
];

export default function Dashboard() {
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState({});       // { sensor_id: { value, unit, ... } } giá trị mới nhất
  const [chartRows, setChartRows] = useState([]);   // các lần đo gần nhất để vẽ biểu đồ
  const [socketOnline, setSocketOnline] = useState(true);
  const [alert, setAlert] = useState(null);             // UC07 - cảnh báo nhiệt độ vượt ngưỡng
  const [deviceError, setDeviceError] = useState(null); // UC03 - lệnh bật/tắt bị lỗi / quá thời gian
  const [pendingIds, setPendingIds] = useState(() => new Set()); // thiết bị đang chờ phần cứng phản hồi
  const rollbackRef = useRef({});   // trạng thái cũ của công tắc, để trả lại nếu lệnh lỗi
  const chartTimer = useRef(null);
  const pendingTimers = useRef({});   // hẹn giờ lưới an toàn của từng thiết bị

  // Lấy các lần đo gần nhất (mỗi dòng: thời gian | nhiệt độ | độ ẩm | ánh sáng), cũ -> mới
  const loadChart = useCallback(async () => {
    const { data } = await client.get('/sensors/search');
    setChartRows(data.slice(0, CHART_POINTS).reverse());
  }, []);

  // UC02: GET /api/devices + GET /api/sensors/latest
  const loadAll = useCallback(async () => {
    const [devicesRes, latestRes] = await Promise.all([
      client.get('/devices'),
      client.get('/sensors/latest'),
      loadChart(),
    ]);
    setDevices(devicesRes.data);
    const latestMap = {};
    latestRes.data.forEach((s) => { latestMap[s.sensor_id] = s; });
    setSensors(latestMap);
  }, [loadChart]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // UC02 - luồng thay thế 3a: mất kết nối realtime thì tự tải lại dữ liệu mỗi 5 giây
  useEffect(() => {
    if (socketOnline) return undefined;
    const timer = setInterval(() => { loadAll().catch(() => {}); }, 5000);
    return () => clearInterval(timer);
  }, [socketOnline, loadAll]);

  // Thông báo lỗi/cảnh báo tự ẩn sau 8 giây
  useEffect(() => {
    if (!deviceError) return undefined;
    const t = setTimeout(() => setDeviceError(null), 8000);
    return () => clearTimeout(t);
  }, [deviceError]);
  useEffect(() => {
    if (!alert) return undefined;
    const t = setTimeout(() => setAlert(null), 8000);
    return () => clearTimeout(t);
  }, [alert]);

  useEffect(() => {
    function clearPending(deviceId) {
      setPendingIds((prev) => {
        if (!prev.has(deviceId)) return prev;
        const next = new Set(prev);
        next.delete(deviceId);
        return next;
      });
      delete rollbackRef.current[deviceId];
      clearTimeout(pendingTimers.current[deviceId]);
      delete pendingTimers.current[deviceId];
    }
    function onDeviceUpdate({ device_id, state }) {
      // Phần cứng đã phản hồi -> chốt trạng thái thật
      setDevices((prev) => prev.map((d) => (d.id === device_id ? { ...d, current_state: state } : d)));
      clearPending(device_id);
    }
    function onSensorUpdate(payload) {
      setSensors((prev) => ({ ...prev, [payload.sensor_id]: payload }));
      // 1 lần board gửi = nhiều sự kiện (mỗi cảm biến 1 cái) -> chỉ tải lại biểu đồ 1 lần
      clearTimeout(chartTimer.current);
      chartTimer.current = setTimeout(() => { loadChart().catch(() => {}); }, 300);
    }
    function onActionUpdate(payload) {
      // UC03 luồng ngoại lệ: quá thời gian (timeout) hoặc board báo lỗi (failed) -> trả công tắc về như cũ
      const isError = payload && (payload.status === 'timeout' || payload.status === 'failed');
      if (isError && rollbackRef.current[payload.device_id] !== undefined) {
        const prevState = rollbackRef.current[payload.device_id];
        setDevices((prev) => prev.map((d) => (d.id === payload.device_id ? { ...d, current_state: prevState } : d)));
        clearPending(payload.device_id);
        setDeviceError(payload.status === 'timeout'
          ? 'Thiết bị không phản hồi — đã trả công tắc về trạng thái trước đó.'
          : `Thiết bị báo lỗi: ${payload.message || 'không rõ nguyên nhân'} — đã trả công tắc về trạng thái trước đó.`);
      }
    }
    function onThresholdAlert(payload) { setAlert(payload); }   // UC07
    function onDeviceError(payload) { setDeviceError(`Thiết bị báo lỗi: ${payload.message}`); }
    function onConnect() { setSocketOnline(true); }
    function onDisconnect() { setSocketOnline(false); }

    setSocketOnline(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('device:update', onDeviceUpdate);
    socket.on('sensor:update', onSensorUpdate);
    socket.on('action:update', onActionUpdate);
    socket.on('alert:threshold', onThresholdAlert);
    socket.on('device:error', onDeviceError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('device:update', onDeviceUpdate);
      socket.off('sensor:update', onSensorUpdate);
      socket.off('action:update', onActionUpdate);
      socket.off('alert:threshold', onThresholdAlert);
      socket.off('device:error', onDeviceError);
      clearTimeout(chartTimer.current);
      Object.values(pendingTimers.current).forEach(clearTimeout);
    };
  }, [loadChart]);

  // UC03: bấm công tắc -> POST /api/devices/:id/action
  async function toggleDevice(device) {
    const prevState = device.current_state;
    const nextState = prevState === 'ON' ? 'OFF' : 'ON';

    // Đổi công tắc ngay + đánh dấu "đang chờ"; trạng thái thật được xác nhận qua socket device:update
    rollbackRef.current[device.id] = prevState;
    setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, current_state: nextState } : d)));
    setPendingIds((prev) => new Set(prev).add(device.id));

    try {
      await client.post(`/devices/${device.id}/action`, { action: nextState });

      // Lưới an toàn: quá PENDING_TIMEOUT_MS mà vẫn "Đang chờ" -> lấy lại trạng thái thật từ backend
      clearTimeout(pendingTimers.current[device.id]);
      pendingTimers.current[device.id] = setTimeout(async () => {
        delete pendingTimers.current[device.id];
        if (rollbackRef.current[device.id] === undefined) return;   // đã có kết quả rồi -> thôi
        delete rollbackRef.current[device.id];
        setPendingIds((prev) => { const next = new Set(prev); next.delete(device.id); return next; });
        try {
          const res = await client.get('/devices');
          setDevices(res.data);
        } catch { /* backend cũng không trả lời -> giữ nguyên */ }
        setDeviceError(`Không nhận được phản hồi cho "${device.name}" — đã cập nhật lại trạng thái thật của thiết bị.`);
      }, PENDING_TIMEOUT_MS);
    } catch (err) {
      // Không gửi được lệnh -> trả công tắc về như cũ ngay
      setDevices((prev) => prev.map((d) => (d.id === device.id ? { ...d, current_state: prevState } : d)));
      setPendingIds((prev) => { const next = new Set(prev); next.delete(device.id); return next; });
      delete rollbackRef.current[device.id];
      setDeviceError(err.response?.data?.message || `Không gửi được lệnh tới "${device.name}", vui lòng thử lại.`);
    }
  }

  // Dữ liệu biểu đồ: mỗi lần đo = giờ đo + các giá trị (thiếu giá trị nào thì để null)
  const toNum = (v) => (v === null || v === undefined ? null : Number(v));
  const chartData = chartRows.map((r) => ({
    t: String(r.recorded_at).slice(11, 19),   // "2026-10-29 14:30:05" -> "14:30:05"
    temperature: toNum(r.temperature),
    humidity: toNum(r.humidity),
    light: toNum(r.light),
    dust: toNum(r.dust),   // chỉ demo mới có, chạy thật thì luôn null
  }));

  return (
    <Layout title="Dashboard" subtitle="Tổng quan thiết bị & cảm biến thời gian thực" fit>
      {/* Thông báo nổi ở góc phải dưới, không chiếm chỗ nên trang không bị cuộn */}
      {(alert || deviceError) && (
        <div className="toast-stack">
          {alert && (
            <div className="toast">
              <span><strong>Cảnh báo nhiệt độ:</strong> {alert.message}{alert.auto_action ? ' — hệ thống đã tự bật Điều hòa.' : ''}</span>
              <button type="button" onClick={() => setAlert(null)}>×</button>
            </div>
          )}
          {deviceError && (
            <div className="toast">
              <span><strong>Lỗi điều khiển:</strong> {deviceError}</span>
              <button type="button" onClick={() => setDeviceError(null)}>×</button>
            </div>
          )}
        </div>
      )}

      {/* Số cột = số thiết bị: 3 thiết bị -> 3 khung, 4 thiết bị -> 4 khung trên 1 hàng */}
      <div className={`row-devices${devices.length >= 4 ? ' cols-4' : ''}`} style={{ gridTemplateColumns: `repeat(${Math.max(devices.length, 1)}, minmax(0, 1fr))` }}>
        {devices.map((device) => {
          const DeviceIcon = deviceIcon(device.device_type);
          const pair = PAIRED_SENSOR[device.device_type];
          const reading = pair ? sensors[pair.sensorId] : null;
          const isOn = device.current_state === 'ON';
          const isPending = pendingIds.has(device.id);
          return (
            <div className="card combo-card" key={device.id}>
              <div className="combo-top">
                <div className="device-icon" style={{ background: deviceIconBg(device.device_type) }}>
                  <DeviceIcon />
                </div>
                <div className="combo-info">
                  <div className="device-name">{device.name}</div>
                  <span className={`badge ${isOn ? 'on' : 'off'}`}>
                    {isPending ? '… Đang chờ' : isOn ? '● ON' : '○ OFF'}
                  </span>
                </div>
                <button
                  className={`switch ${isOn ? 'on' : 'off'}`}
                  onClick={() => toggleDevice(device)}
                  disabled={isPending}
                  style={isPending ? { opacity: 0.5, cursor: 'wait' } : undefined}
                  title={isPending ? 'Đang chờ phần cứng phản hồi...' : `Bấm để ${isOn ? 'tắt' : 'bật'}`}
                >
                  <span className="knob" style={isOn ? { right: 3 } : { left: 3 }} />
                </button>
              </div>

              {pair && (
                <div className="combo-sensor">
                  <div className="sensor-head">
                    <div className="sensor-icon" style={{ background: pair.bg }}><pair.Icon /></div>
                    <span className="sensor-label">{pair.label}</span>
                  </div>
                  <div className="combo-value">
                    {reading ? Number(reading.value).toFixed(pair.digits) : '--'}<span>{pair.unit}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!devices.length && <div className="empty-state">Chưa có thiết bị nào.</div>}
      </div>

      <TimeChart
        title={`Biểu đồ theo thời gian (${CHART_POINTS} lần đo gần nhất, tự cập nhật)`}
        rows={chartData}
        series={CHART_SERIES}
        fill
      />
    </Layout>
  );
}
