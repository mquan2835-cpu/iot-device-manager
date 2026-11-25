# Bài 1 — Báo cáo riêng (chuẩn theo báo cáo mẫu được chấm "tốt")

- `BaoCao_Bai1_ThietKeHeThong_DoMinhQuan.docx` — báo cáo **độc lập cho Bài 1** (Thiết kế hệ thống & CSDL), 22 trang: trang bìa, mục lục, Chương 1 (giới thiệu), Chương 2 (cơ sở lý thuyết + kiến trúc 5 tầng), Chương 3 (CSDL với bảng chi tiết từng cột + ERD, đặc tả đầy đủ 7 Use Case — mỗi UC kèm sequence diagram + ảnh UI, API RESTful tường thuật kèm ví dụ JSON + bảng sự kiện Socket.io), Kết luận, Tài liệu tham khảo, Phụ lục.
- `BaoCao_Bai1_ThietKeHeThong_DoMinhQuan.pdf` — bản xuất thử để xem trước bố cục (không dùng bản này để nộp).
- `build-report-bai1.js` / `build-report-bai1-usecases.js` / `build-report-bai1-main.js` — 3 script Node.js (dùng thư viện `docx`) sinh ra file trên; chạy `node build-report-bai1-main.js` để build lại sau khi sửa nội dung (script main sẽ tự require 2 file kia).
- File này được viết dựa trên việc **tham khảo cấu trúc và độ chi tiết** từ báo cáo Bài 1 của bạn cùng lớp (đã được giảng viên chấm "tốt") — bảng chi tiết từng cột CSDL, đặc tả sequence diagram cho từng Use Case, API viết tường thuật kèm JSON, sơ đồ kiến trúc 5 tầng — nhưng **toàn bộ nội dung là nguyên bản**, đúng với thiết kế thực tế của đồ án này (Node.js/Express/MySQL, không phải Java Spring Boot của bạn ấy).
- Đã bổ sung **UC07 (bonus)**: hệ thống tự động cảnh báo + tự bật Điều hòa khi nhiệt độ vượt ngưỡng — kéo theo cột `triggered_by` mới trong bảng `ActionHistory` (đã cập nhật đồng bộ ở `docs/database-design.md`, `backend/db/schema.sql`, `backend/src/mqtt/mqttClient.js`, các route liên quan, và 2 trang Frontend Dashboard/ActionHistory).

### Việc cần làm trước khi nộp báo cáo Bài 1

1. **Mở file .docx bằng Microsoft Word**, không nộp bản PDF xuất sẵn (chỉ để xem trước).
2. **Cập nhật Mục lục**: chuột phải vào bảng Mục lục → **Update Field / Cập nhật trường** (hoặc `Ctrl+A` rồi `F9`) để hiện đúng số trang.
3. Điền MSSV, lớp, giảng viên hướng dẫn ở trang bìa (đang để dấu `...`).
4. Ảnh giao diện đang chèn là bản mockup tham khảo — nếu bạn dựng lại UI trong Figma của riêng mình, thay bằng ảnh chụp từ Figma thật trước khi nộp.
5. Điền 3 link ở Phụ lục (GitHub, Figma, API Docs) — khớp với link đã điền ở trang Profile của Frontend (`frontend/src/config/projectLinks.js`).
6. Đọc lại toàn bộ Chương 3 một lượt để chắc chắn hiểu rõ từng thiết kế (đặc biệt UC07/`triggered_by`, vì đây là phần mở rộng so với đề bài gốc) — phòng khi giảng viên hỏi vấn đáp.

# Bài 2 — Báo cáo riêng (Lập trình giao tiếp MQTT)

- `BaoCao_Bai2_GiaoTiepMQTT_DoMinhQuan.docx` — báo cáo độc lập cho Bài 2, cùng phong cách với báo cáo Bài 1: trang bìa, mục lục, danh mục hình, từ viết tắt; Chương 1 giới thiệu; Chương 2 cơ sở lý thuyết (MQTT, Pub/Sub, topic & wildcard, gói tin, QoS/retained/LWT, ESP8266/ESP32, DHT11, tính điện trở hạn dòng LED); Chương 3 Bài 2.1 mô phỏng 3 Terminal (kiến trúc, đặc tả topic/payload, giải thích code, sequence diagram, 3 kịch bản kèm log mẫu); Chương 4 Bài 2.2 phần cứng (linh kiện, sơ đồ khối, sơ đồ đấu nối, cấu hình, 3 lưu đồ thuật toán, giải thích code); Chương 5 bảng 15 test case; Kết luận; Tài liệu tham khảo; Phụ lục mã nguồn firmware đầy đủ.
- `build-report-bai2.js` — script sinh file trên (`node build-report-bai2.js`). Các đoạn code trong báo cáo được **trích trực tiếp từ file nguồn lúc build**, nên sửa code xong chỉ cần build lại là báo cáo khớp.
- `assets/diagrams/bai2/` — các sơ đồ của Bài 2 (mermaid `.mmd` + ảnh `.png`; sơ đồ đấu nối vẽ bằng `draw_wiring.py`).

### Việc cần làm trước khi nộp báo cáo Bài 2

1. Chạy thật 3 kịch bản theo `mqtt-simulation/README.md` trên máy của bạn và chụp ảnh **3 cửa sổ Terminal** → dán vào 3 khung vàng `[CHÈN ẢNH CHỤP THẬT]` ở mục 3.6.
2. Lắp mạch, nạp firmware, chụp **ảnh mạch thật**, **Serial Monitor**, và **Terminal 2 + 3 điều khiển board thật** → dán vào 3 khung vàng ở mục 4.7. Nếu chưa có board, ghi rõ trong báo cáo là phần 2.2 mới dừng ở mức code + sơ đồ, đừng dùng ảnh mạch của người khác.
3. Tự chạy 15 test case ở Chương 5 và điền cột "Kết quả thực tế".
4. Mở bằng Word → chuột phải Mục lục → Update Field; điền MSSV/lớp/giảng viên ở trang bìa và link GitHub ở Phụ lục.
5. Các khối log trong báo cáo là **log mẫu** do chương trình in ra (để người đọc biết cần nhìn dòng nào) — ảnh chụp của bạn mới là minh chứng; giờ trên ảnh sẽ khác log mẫu, điều đó hoàn toàn bình thường.

# Bài 4 — Báo cáo tổng kết (5 chương, đồ án đầy đủ)

- `BaoCao_DoAnIOT.docx` — báo cáo đầy đủ 5 chương theo form đồ án tốt nghiệp (trang bìa, lời cảm ơn, mục lục, chương 1-5, tài liệu tham khảo, phụ lục).
- `BaoCao_DoAnIOT.pdf` — bản xuất thử để xem trước bố cục (không dùng bản này để nộp).
- `build-report.js` — script Node.js (dùng thư viện `docx`) sinh ra file trên; chạy `node build-report.js` để build lại sau khi sửa nội dung.
- `assets/diagrams/` — ảnh PNG các sơ đồ (Use Case, ERD, Sequence Diagram, kiến trúc 5 tầng), render tự động từ mermaid trong `docs/`.
- `assets/ui/` — ảnh chụp 5 màn hình UI mockup (Login, Dashboard, Data Sensor, Action History, Profile).

> Lưu ý: `BaoCao_DoAnIOT.docx` (Bài 4) hiện **chưa** được cập nhật để đưa UC07/`triggered_by` vào Chương 3 — nếu muốn đồng bộ, chạy lại `node build-report.js` sau khi bổ sung tương tự như đã làm ở báo cáo Bài 1, hoặc nhờ Claude cập nhật giúp.

## Đã tự động chèn sẵn vào báo cáo

Toàn bộ hình ảnh **có thể tạo ra một cách trung thực** từ chính thiết kế của đồ án đã được chèn sẵn vào đúng vị trí trong `BaoCao_DoAnIOT.docx`:

| Vị trí trong báo cáo | Hình đã chèn |
|---|---|
| 3.2 Đặc tả Use Case | Hình 3.1 — Sơ đồ Use Case tổng quan |
| 3.3 Thiết kế CSDL | Hình 3.2 — Sơ đồ ERD (5 bảng) |
| 3.4 Sequence Diagram | Hình 3.3, 3.4, 3.5 — 3 luồng: bật/tắt thiết bị, thu thập cảm biến, đăng nhập |
| 3.5 Thiết kế UI/UX | Hình 3.6 - 3.10 — 5 màn hình mockup (Login, Dashboard, Data Sensor, Action History, Profile) |

Muốn build lại các ảnh này (ví dụ sau khi bạn sửa mermaid trong `docs/`): xem lệnh `mmdc` trong lịch sử làm việc, hoặc yêu cầu Claude render lại.

## Những chỗ 📌 CÒN LẠI — bắt buộc phải là ảnh thật, không thể tạo thay bạn

Vì đây là minh chứng bạn đã thực sự chạy hệ thống, các mục sau **cố tình để trống** và cần ảnh chụp thật từ máy/board của bạn:

- **4.2.1** — ảnh chụp 3 cửa sổ Terminal chạy đồng thời (mô phỏng MQTT).
- **4.2.2** — ảnh mạch thật đã lắp (breadboard, LED, cảm biến) + ảnh Serial Monitor khi board hoạt động.
- **4.4** — ảnh chụp màn hình 4 trang Web đang chạy thật (có dữ liệu thật, không phải ảnh mockup).
- **4.5 / 4.6** — ảnh/kết quả đo minh chứng luồng end-to-end và bảng kết quả kiểm thử thực tế.
- Bản Figma thật (3.5): ảnh mockup đã chèn chỉ là bản tham khảo dựng sẵn — nếu bạn dựng lại UI trong Figma của mình, nên thay bằng ảnh chụp từ Figma thật.

## Việc cần làm trước khi nộp

1. **Mở file .docx bằng Microsoft Word** (không dùng bản PDF xuất sẵn để nộp — đó chỉ là bản xem trước).
2. **Cập nhật Mục lục**: click chuột phải vào bảng Mục lục → chọn **Update Field / Cập nhật trường** (hoặc bôi đen toàn bộ văn bản `Ctrl+A` rồi nhấn `F9`) để số trang và tiêu đề hiển thị đúng — Word cần làm bước này vì Mục lục là trường động, LibreOffice không tự tính khi convert.
3. Điền các thông tin trường/lớp/giảng viên hướng dẫn ở trang bìa (đang để dấu `...`).
4. Thay các đoạn 📌 còn lại (mục trên) bằng ảnh chụp thật của bạn.
5. Điền cột "Kết quả thực tế" ở bảng kiểm thử Chương 4 sau khi tự test hệ thống.
6. Điền 4 link ở phần Phụ lục (GitHub, Figma, API Docs, Video demo nếu có) — **giống hệt link đã điền ở trang Profile của Frontend** (`frontend/src/config/projectLinks.js`) để đồng bộ.
7. Sau khi hoàn thiện, dùng **File → Save As → PDF** trong Word để xuất file PDF cuối cùng nộp bài.
