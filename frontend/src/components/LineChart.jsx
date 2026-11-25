// Biểu đồ đường đơn giản vẽ bằng SVG thuần (không phụ thuộc thư viện ngoài).
// series: [{ color, values: number[] }]
export default function LineChart({ series, width = 100, height = 120, fillArea = false }) {
  const allValues = series.flatMap((s) => s.values);
  if (!allValues.length) {
    return <div className="empty-state">Chưa có dữ liệu để vẽ biểu đồ</div>;
  }
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const toPoints = (values) =>
    values
      .map((v, i) => {
        const x = values.length > 1 ? (i / (values.length - 1)) * width : 0;
        const y = height - ((v - min) / range) * (height - 10) - 5;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {series.map((s, idx) => {
        const points = toPoints(s.values);
        return (
          <g key={idx}>
            {fillArea && (
              <polyline points={`${points} ${width},${height} 0,${height}`} fill={s.color} opacity="0.12" stroke="none" />
            )}
            <polyline points={points} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
}
