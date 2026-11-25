// Thanh phân trang dưới bảng:
//   Hiển thị 11–20 trên tổng 125 bản ghi      Số bản ghi/trang [10 ▾]   ‹ 1 2 [3] 4 … 13 ›   Trang 3/13
export const PAGE_SIZES = [10, 20, 50, 100];

// Danh sách nút số trang: luôn có trang đầu, trang cuối, trang hiện tại và 1 trang mỗi bên; chỗ bị bỏ thì hiện "…"
function pageItems(page, totalPages) {
  const nums = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);
  const items = [];
  nums.forEach((p, i) => {
    if (i > 0 && p - nums[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;   // số thứ tự bản ghi đầu trang
  const to = Math.min(page * pageSize, total);         // số thứ tự bản ghi cuối trang

  return (
    <div className="pager">
      <div className="pager-info">
        Hiển thị <strong>{from}–{to}</strong> trên tổng <strong>{total}</strong> bản ghi
      </div>

      <div className="pager-right">
        <label className="pager-info pager-size-label">
          Số bản ghi/trang
          <select className="pager-size" value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <div className="pager-buttons">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} title="Trang trước">‹</button>
          {pageItems(page, totalPages).map((item) => (
            typeof item === 'string'
              ? <span key={item} className="pager-gap">…</span>
              : (
                <button key={item} type="button" className={item === page ? 'active' : ''} onClick={() => onPageChange(item)}>
                  {item}
                </button>
              )
          ))}
          <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} title="Trang sau">›</button>
        </div>

        <span className="pager-info">Trang <strong>{page}</strong>/{totalPages}</span>
      </div>
    </div>
  );
}
