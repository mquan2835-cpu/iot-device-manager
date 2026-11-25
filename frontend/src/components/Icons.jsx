// Bộ icon dạng stroke SVG dùng chung, đồng bộ phong cách với UI mockup ở Bài 1.
const base = { fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const IconGrid = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" {...base} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);
export const IconChart = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" {...base} {...p}>
    <path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 5-7" />
  </svg>
);
export const IconClock = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" {...base} {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
  </svg>
);
export const IconUser = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" {...base} {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4.5 5-6 8-6s6.5 1.5 8 6" />
  </svg>
);
export const IconBulb = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" stroke="#D97706" {...base} {...p}>
    <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1 1 1.6l.2.7h5.6l.2-.7c.1-.6.5-1.2 1-1.6A7 7 0 0 0 12 2Z" />
  </svg>
);
export const IconFan = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" stroke="#2563EB" {...base} {...p}>
    <circle cx="12" cy="12" r="1.6" /><path d="M12 12c2-3 1-7-2-8-2 3-1 6 2 8Z" />
    <path d="M12 12c3 2 7 1 8-2-3-2-6-1-8 2Z" /><path d="M12 12c-2 3-1 7 2 8 2-3 1-6-2-8Z" />
  </svg>
);
export const IconSnow = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" stroke="#64748B" {...base} {...p}>
    <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11M2 12h20" />
  </svg>
);
// Máy lọc không khí: thân máy + các luồng gió thổi ra
export const IconPurifier = (p) => (
  <svg width="22" height="22" viewBox="0 0 24 24" stroke="#0D9488" {...base} {...p}>
    <rect x="6" y="3" width="12" height="18" rx="3" /><circle cx="12" cy="10" r="3" />
    <path d="M9 17h6" /><path d="M2 8c1.5-1 1.5-3 0-4" /><path d="M22 8c-1.5-1-1.5-3 0-4" />
  </svg>
);
// Bụi mịn: đám mây nhỏ + các hạt bụi
export const IconDust = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#7C3AED" {...base} {...p}>
    <path d="M17.5 15a4 4 0 0 0-.9-7.9A6 6 0 0 0 5 9a3.5 3.5 0 0 0 .5 6Z" />
    <path d="M8 19h.01M12 20h.01M16 19h.01M10 22h.01M14 22h.01" />
  </svg>
);
export const IconThermometer = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#E11D48" {...base} {...p}>
    <path d="M14 14.76V3.5a2 2 0 0 0-4 0v11.26a4 4 0 1 0 4 0Z" />
  </svg>
);
export const IconSun = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#D97706" {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconDroplet = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" stroke="#2563EB" {...base} {...p}>
    <path d="M12 2s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12Z" />
  </svg>
);
export const IconGithub = (p) => (
  <svg width="19" height="19" viewBox="0 0 24 24" stroke="#fff" {...base} {...p}>
    <path d="M8 3 4 12l4 9M16 3l4 9-4 9" />
  </svg>
);
export const IconFigma = (p) => (
  <svg width="19" height="19" viewBox="0 0 24 24" stroke="#fff" {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M10 4v16" />
  </svg>
);
export const IconDocs = (p) => (
  <svg width="19" height="19" viewBox="0 0 24 24" stroke="#fff" {...base} {...p}>
    <path d="M4 4h11l5 5v11H4Z" /><path d="M9 13h6M9 17h6M9 9h2" />
  </svg>
);
export const IconPdf = (p) => (
  <svg width="19" height="19" viewBox="0 0 24 24" stroke="#fff" {...base} {...p}>
    <path d="M6 2h9l5 5v15H6Z" /><path d="M14 2v6h6" />
  </svg>
);
export const IconLogout = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" {...base} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />
  </svg>
);

export function deviceIcon(type) {
  if (type === 'light') return IconBulb;
  if (type === 'fan') return IconFan;
  if (type === 'air_purifier') return IconPurifier;
  return IconSnow;
}
export function deviceIconBg(type) {
  if (type === 'light') return '#FEF3C7';
  if (type === 'fan') return '#DBEAFE';
  if (type === 'air_purifier') return '#CCFBF1';
  return '#F1F5F9';
}
