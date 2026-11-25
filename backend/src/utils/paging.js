// Phân trang: ?page=2&limit=10  ->  { page: 2, limit: 10, offset: 10 }
//   - offset = số bản ghi bỏ qua = (page - 1) * limit   (trang 2, 10 dòng/trang -> bỏ 10 dòng đầu)
//   - Không gửi page -> trả null: API trả về kiểu cũ (mảng), Dashboard vẫn dùng được
const LIMITS = [10, 20, 50, 100];

function getPaging(query) {
  if (query.page === undefined) return null;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || 10;
  if (!LIMITS.includes(limit)) limit = 10;
  return { page, limit, offset: (page - 1) * limit };
}

module.exports = { getPaging };
