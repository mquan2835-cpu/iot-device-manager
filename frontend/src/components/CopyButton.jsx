import { useState } from 'react';

// Nút copy nhỏ: bấm là chép `text` vào bộ nhớ tạm (clipboard), hiện "Đã chép" trong 1.5 giây.
// Dùng ở cột Thời gian để chép nhanh rồi dán vào ô tìm kiếm.
export default function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Trình duyệt chặn clipboard -> dùng cách cũ: tạo ô chữ tạm, chọn chữ rồi copy
      const box = document.createElement('textarea');
      box.value = text;
      document.body.appendChild(box);
      box.select();
      document.execCommand('copy');
      box.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      className={`copy-btn${copied ? ' copied' : ''}`}
      onClick={handleCopy}
      title={copied ? 'Đã chép' : `Chép "${text}"`}
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="12" height="12" rx="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" />
        </svg>
      )}
      <span>{copied ? 'Đã chép' : 'Copy'}</span>
    </button>
  );
}
