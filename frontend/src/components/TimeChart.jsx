import { useState } from 'react';

// Biểu đồ đường theo thời gian, gộp nhiều đại lượng vào CHUNG 1 khung (SVG thuần, không cần thư viện)
//   - Trục dọc TRÁI : dùng chung cho nhiệt độ (°C) và độ ẩm (%)  (cùng cỡ vài chục)
//   - Trục dọc PHẢI : riêng cho ánh sáng (lux)                    (cỡ vài trăm, vẽ chung trục trái sẽ dẹt)
//   - Trục ngang    : giờ đo
//   - Mốc: trục dọc chia thành Y_STEPS khoảng bằng nhau theo số tròn (vd 20, 30, 40...),
//          trục ngang đặt X_TICKS mốc giờ, mỗi mốc có đường kẻ mờ để dễ dóng giá trị
// rows:   [{ t: '14:30:05', temperature: 28.1, humidity: 50.9, light: 77 }, ...] theo thứ tự cũ -> mới
// series: [{ key, label, unit, color, axis: 'left' | 'right', digits }]
const Y_STEPS = 5;   // số khoảng chia trên trục dọc (=> 6 mốc)
const X_TICKS = 6;   // số mốc giờ trên trục ngang

// Làm tròn bước chia về số "đẹp": 1, 2, 2.5, 5, 10 × 10^n  (vd 3.7 -> 5, 13 -> 20, 0.34 -> 0.5)
function niceStep(raw) {
  const power = 10 ** Math.floor(Math.log10(raw));
  const f = raw / power;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * power;
}

// Tìm thang đo [min, max] gồm đúng Y_STEPS khoảng, mỗi khoảng là 1 số tròn, chứa trọn mọi giá trị
function niceScale(values) {
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (lo === hi) { lo -= 1; hi += 1; }
  let step = niceStep((hi - lo) / Y_STEPS);
  let min = Math.floor(lo / step) * step;
  // Nếu Y_STEPS khoảng chưa phủ tới giá trị lớn nhất thì tăng bước lên số tròn kế tiếp
  while (min + step * Y_STEPS < hi) {
    step = niceStep(step * 1.01);
    min = Math.floor(lo / step) * step;
  }
  const ticks = Array.from({ length: Y_STEPS + 1 }, (_, i) => min + step * i);
  return { min, max: min + step * Y_STEPS, step, ticks };
}

export default function TimeChart({ title, rows, series, height = 260, fill = false }) {
  const [hover, setHover] = useState(null);   // vị trí điểm đang rê chuột
  const cardClass = fill ? 'card tc-fill' : 'card';
  const boxHeight = fill ? undefined : height;  // fill: để CSS tự giãn chiều cao

  const valuesOf = (s) => rows.map((r) => r[s.key]).filter((v) => v !== null && v !== undefined);
  const latestOf = (s) => { const v = valuesOf(s); return v.length ? v[v.length - 1] : null; };
  const fmt = (v, digits = 1) => (v === null || v === undefined ? '--' : Number(v).toFixed(digits));

  const legend = (
    <div className="mc-legend">
      {series.map((s) => (
        <span key={s.key} className="mc-legend-item">
          <i style={{ background: s.color }} />
          {s.label}: <strong style={{ color: s.color }}>{fmt(latestOf(s), s.digits)} {s.unit}</strong>
        </span>
      ))}
    </div>
  );

  if (!rows.length) {
    return (
      <div className={cardClass}>
        <div className="chart-head"><div className="chart-title">{title}</div></div>
        {legend}
        <div className="empty-state tc-empty" style={{ height: boxHeight }}>Chưa có dữ liệu</div>
      </div>
    );
  }

  // Thang đo của từng trục (cùng số khoảng chia => đường kẻ ngang khớp cả 2 bên)
  const scaleOf = (axis) => {
    const all = series.filter((s) => s.axis === axis).flatMap(valuesOf);
    return all.length ? niceScale(all) : null;
  };
  const scales = { left: scaleOf('left'), right: scaleOf('right') };
  const unitsOf = (axis) => series.filter((s) => s.axis === axis).map((s) => s.unit).join(' / ');

  const x = (i) => (rows.length > 1 ? (i / (rows.length - 1)) * 100 : 50);          // % chiều ngang
  const y = (v, axis) => { const s = scales[axis]; return 100 - ((v - s.min) / (s.max - s.min)) * 100; };
  const gridY = Array.from({ length: Y_STEPS + 1 }, (_, i) => (i / Y_STEPS) * 100);  // vị trí các đường kẻ ngang

  // Mốc trục ngang: X_TICKS lần đo cách đều nhau (luôn có lần đầu và lần cuối)
  const tickCount = Math.min(X_TICKS, rows.length);
  const xTicks = [...new Set(Array.from({ length: tickCount }, (_, k) => (
    tickCount > 1 ? Math.round((k * (rows.length - 1)) / (tickCount - 1)) : 0
  )))];

  // Số chữ số thập phân của nhãn mốc: bước chia lẻ (vd 2.5) thì hiện 1 chữ số, còn lại hiện số nguyên
  const tickDigits = (axis) => (scales[axis] && !Number.isInteger(scales[axis].step) ? 1 : 0);

  // Rê chuột trên biểu đồ -> tìm lần đo gần nhất theo chiều ngang để hiện bảng giá trị
  function onMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1);
    setHover(Math.round(ratio * (rows.length - 1)));
  }

  const axisLabels = (axis) => (
    <div className={`tc-yaxis${axis === 'right' ? ' right' : ''}`} style={{ height: boxHeight }} title={unitsOf(axis)}>
      {scales[axis] && scales[axis].ticks.map((v) => (
        <span key={v} className="tc-ytick" style={{ top: `${y(v, axis)}%` }}>{fmt(v, tickDigits(axis))}</span>
      ))}
    </div>
  );

  return (
    <div className={cardClass}>
      <div className="chart-head"><div className="chart-title">{title}</div></div>
      {legend}
      <div className="tc-units">
        <span>{unitsOf('left')}</span>
        <span>{unitsOf('right')}</span>
      </div>

      <div className="tc-body">
        {axisLabels('left')}

        <div className="tc-plot" style={{ height: boxHeight }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
            {/* Đường kẻ ngang tại mỗi mốc giá trị */}
            {gridY.map((g) => (
              <line key={`h${g}`} x1="0" x2="100" y1={g} y2={g} stroke="#E2E8F0" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {/* Đường kẻ dọc tại mỗi mốc giờ */}
            {xTicks.map((i) => (
              <line key={`v${i}`} x1={x(i)} x2={x(i)} y1="0" y2="100" stroke="#F1F5F9" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            {series.map((s) => {
              if (!scales[s.axis]) return null;
              const points = rows
                .map((r, i) => (r[s.key] === null || r[s.key] === undefined ? null : `${x(i).toFixed(2)},${y(r[s.key], s.axis).toFixed(2)}`))
                .filter(Boolean)
                .join(' ');
              return (
                <polyline key={s.key} points={points} fill="none" stroke={s.color} strokeWidth="2.5"
                  strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              );
            })}
            {hover !== null && (
              <line x1={x(hover)} x2={x(hover)} y1="0" y2="100" stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
            )}
          </svg>

          {/* Chấm tròn: lần đo mới nhất (hoặc lần đo đang rê chuột) của từng đường */}
          {series.map((s) => {
            const i = hover !== null ? hover : rows.length - 1;
            const v = rows[i][s.key];
            if (v === null || v === undefined || !scales[s.axis]) return null;
            return <span key={s.key} className="tc-dot" style={{ left: `${x(i)}%`, top: `${y(v, s.axis)}%`, background: s.color }} />;
          })}

          {hover !== null && (
            <div className="mc-tooltip" style={x(hover) > 60 ? { right: `${100 - x(hover) + 2}%` } : { left: `${x(hover) + 2}%` }}>
              <div className="mc-tooltip-time">{rows[hover].t}</div>
              {series.map((s) => (
                <div key={s.key}><i style={{ background: s.color }} />{s.label}: <strong>{fmt(rows[hover][s.key], s.digits)} {s.unit}</strong></div>
              ))}
            </div>
          )}
        </div>

        {axisLabels('right')}
      </div>

      {/* Mốc giờ dưới trục ngang, đặt đúng vị trí lần đo tương ứng */}
      <div className="tc-xaxis">
        {xTicks.map((i, k) => (
          <span
            key={i}
            className="tc-xtick"
            style={{ left: `${x(i)}%`, transform: k === 0 ? 'none' : k === xTicks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' }}
          >
            {rows[i].t}
          </span>
        ))}
      </div>
    </div>
  );
}
