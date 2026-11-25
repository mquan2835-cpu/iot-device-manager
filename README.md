# Đồ án IOT và Ứng dụng — Hệ thống quản lý thiết bị điện thông minh

Sinh viên: **Đỗ Minh Quân**
Stack: Node.js + Express + MySQL + MQTT (Backend) · React + Vite (Frontend) · NodeMCU ESP8266/ESP32 (Hardware)

Dự án mô phỏng 3 thiết bị điện trong nhà (Đèn / Quạt / Điều hòa) bằng 3 LED, điều khiển và giám sát qua giao thức MQTT, đúng với 4 bài yêu cầu của học phần.

## Cấu trúc thư mục

```
iot-device-manager/
├── docs/                    # Bài 1: Usecase, ERD, Sequence Diagram, API Docs
│   ├── usecases.md
│   ├── database-design.md
│   └── api-docs/{openapi.yaml, postman_collection.json}
├── design/                  # Bài 1: UI mockup (5 màn hình) — xem mục "Về UI/Figma" bên dưới
├── mqtt-simulation/         # Bài 2.1: mô phỏng MQTT bằng 3 Terminal (hardware / backend / monitor)
├── hardware/                # Bài 2.2: code Arduino cho ESP8266/ESP32 + sơ đồ đấu nối
├── backend/                 # Bài 3: REST API + MQTT + Socket.io + MySQL
├── frontend/                # Bài 3: giao diện React (Dashboard/Data Sensor/Action History/Profile)
└── report/                  # Báo cáo Bài 1, Bài 2 và Bài 4 (xem report/README.md)
```

## Thứ tự chạy thử toàn bộ hệ thống

1. **Cơ sở dữ liệu**: tạo MySQL DB bằng `backend/db/schema.sql`.
2. **Backend**: `cd backend && npm install && cp .env.example .env` (điền thông tin DB) `&& npm start`.
3. **Frontend**: `cd frontend && npm install && cp .env.example .env && npm run dev` → mở `http://localhost:5173`.
4. **Phần cứng**:
   - Chưa có board sẵn sàng? Chạy mô phỏng theo `mqtt-simulation/README.md` (Bài 2.1) — hệ thống Backend/Frontend vẫn hoạt động bình thường vì dùng chung topic MQTT.
   - Có board thật? Nạp `hardware/iot_device_node/iot_device_node.ino` theo hướng dẫn `hardware/wiring.md` (Bài 2.2).
5. Đăng nhập Frontend bằng tài khoản đã seed: `quan@example.com` / `123456`.

## Về UI/Figma (quan trọng — đọc trước khi nộp bài)

Phiên làm việc này **không có quyền truy cập tài khoản Figma thật** của bạn, nên không thể tạo trực tiếp file `.fig`. Thay vào đó, đã dựng sẵn bản mockup UI có độ hoàn thiện cao (5 màn hình: Login, Dashboard, Data Sensor, Action History, Profile) dưới dạng canvas thiết kế tương tác — bạn có thể xem, chỉnh sửa trực tiếp từng phần tử và xuất PNG/PDF ngay trong đó. Việc bạn cần làm:

1. Mở link canvas thiết kế đã publish trong hội thoại này (card "IoT Smart Home UI Mockup") để xem/chỉnh sửa.
2. Dựng lại (hoặc xuất ảnh rồi import) thành file Figma thật trong tài khoản Figma của bạn, publish link, dùng link đó điền vào:
   - `frontend/src/config/projectLinks.js` (trường `figma`)
   - `report/BaoCao_DoAnIOT.docx` phần Phụ lục

## Checklist trước khi nộp bài (Bài 4 yêu cầu)

- [ ] Đã tạo Figma thật từ bản mockup, có link chia sẻ được.
- [ ] Đã push code lên GitHub (repo public hoặc cấp quyền cho giảng viên).
- [ ] Đã deploy/host tài liệu API Docs (Swagger UI hoặc Postman public doc) và lấy link.
- [ ] Đã điền đủ 4 link (GitHub, Figma, API Docs, Báo cáo PDF) vào **cả hai chỗ**:
  - `frontend/src/config/projectLinks.js` → hiển thị trên trang Profile của Web
  - `report/BaoCao_DoAnIOT.docx` → phần Phụ lục
- [ ] Đã cập nhật Mục lục trong Word (xem `report/README.md`) và chèn đủ ảnh minh chứng vào các chỗ đánh dấu 📌.
- [ ] Đã xuất báo cáo cuối cùng ra PDF từ Word (không nộp bản PDF preview đã có sẵn trong repo).
- [ ] Đã test luồng end-to-end thật: bấm nút trên Web → LED đổi trạng thái → Dashboard cập nhật → Action History ghi nhận `success`.

## Tài liệu tham khảo nhanh

| Bài | Nội dung | Thư mục/File |
|---|---|---|
| Bài 1 | Usecase | `docs/usecases.md` |
| Bài 1 | Database Design | `docs/database-design.md` |
| Bài 1 | Sequence Diagram | `docs/sequence-diagrams.md` |
| Bài 1 | UI Design | `design/` (xem mục trên) |
| Bài 1 | API Docs | `docs/api-docs/` |
| Bài 2.1 | Mô phỏng MQTT 3 Terminal | `mqtt-simulation/` |
| Bài 2.2 | Code Arduino + sơ đồ đấu nối | `hardware/` |
| Bài 2 | Báo cáo riêng Bài 2 | `report/BaoCao_Bai2_GiaoTiepMQTT_DoMinhQuan.docx` |
| Bài 3 | Backend | `backend/` |
| Bài 3 | Frontend | `frontend/` |
| Bài 4 | Báo cáo 5 chương | `report/` |
