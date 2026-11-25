# Bài 1 — Sequence Diagram (Biểu đồ tuần tự)

## 1. Luồng chính: Bật/Tắt thiết bị (UC03)

Người dùng bấm nút "Bật đèn" trên Dashboard → lệnh đi từ Frontend xuống Backend, lưu DB, truyền qua MQTT xuống Hardware (NodeMCU), và phản hồi ngược lại để UI cập nhật đúng trạng thái thật.

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Frontend (React)
    participant BE as Backend (Express API)
    participant DB as MySQL (ActionHistory/Device)
    participant MQ as MQTT Broker
    participant HW as NodeMCU (ESP8266/ESP32 + LED)

    U->>FE: Nhấn nút "Bật đèn"
    FE->>FE: Optimistic UI — đổi ngay công tắc sang "ON" + đánh dấu "Đang chờ..."
    FE->>BE: POST /api/devices/1/action { action: "ON" }
    BE->>DB: INSERT ActionHistory(status=pending)
    DB-->>BE: OK (action_id)
    BE->>MQ: PUBLISH home/device/1/set  payload="ON"
    BE-->>FE: 202 Accepted { action_id, status: pending }
    BE->>BE: setTimeout(ACTION_TIMEOUT_MS) — bắt đầu đếm giờ chờ phản hồi

    alt Hardware phản hồi trước khi hết hạn (luồng bình thường)
        MQ->>HW: forward message topic home/device/1/set
        HW->>HW: digitalWrite(LED_PIN, HIGH)
        HW->>MQ: PUBLISH home/device/1/status payload="ON"
        MQ->>BE: forward message topic home/device/1/status
        BE->>BE: clearTimeout (huỷ job chờ, vì đã có phản hồi)
        BE->>DB: UPDATE ActionHistory SET status=success, responded_at=NOW()
        BE->>DB: UPDATE Device SET current_state="ON"
        BE->>FE: Đẩy realtime (WebSocket) { device_id:1, state:"ON" }
        FE-->>U: Chốt công tắc ở trạng thái "ON" (đổi màu xanh, bỏ trạng thái "Đang chờ")
    else Quá ACTION_TIMEOUT_MS không nhận được home/device/1/status (luồng ngoại lệ — ESP mất kết nối Wi-Fi/MQTT)
        Note over BE: Job setTimeout kích hoạt, kiểm tra thấy ActionHistory vẫn đang status=pending
        BE->>DB: UPDATE ActionHistory SET status='timeout'
        BE->>FE: Đẩy realtime (WebSocket) { action_id, device_id:1, status:'timeout' }
        FE->>FE: Khôi phục công tắc về trạng thái TRƯỚC khi bấm (rollback optimistic update)
        FE-->>U: Hiện cảnh báo đỏ "Thiết bị không phản hồi"
    end
```

Nhánh `else` được thiết kế mô phỏng đúng theo hành vi rollback UI chuẩn (giống cách nhiều hệ thống điều khiển thiết bị thực tế xử lý): Frontend không đợi xác nhận mới đổi màu công tắc, mà đổi ngay khi người dùng bấm (optimistic UI) để cảm giác phản hồi tức thời; nếu sau đó phát hiện lệnh bị timeout, Frontend sẽ **tự động trả công tắc về đúng trạng thái trước khi bấm** và hiển thị cảnh báo đỏ, thay vì để công tắc "treo" ở trạng thái sai. Cơ chế này được hiện thực trong `frontend/src/pages/Dashboard.jsx` (hàm `toggleDevice` lưu trạng thái cũ vào `rollbackRef` trước khi optimistic-update, và khôi phục lại khi nhận sự kiện `action:update` với `status: 'timeout'`).

Nhánh `else` ở trên chính là luồng ngoại lệ: nếu sau `ACTION_TIMEOUT_MS` (mặc định 5 giây) Backend không nhận được message trên `home/device/1/status`, job hẹn giờ đã đặt ở bước `setTimeout` sẽ tự kiểm tra và `UPDATE ActionHistory SET status='timeout'`, đồng thời đẩy realtime báo lỗi xuống Frontend. Cơ chế này được hiện thực đúng như vậy trong `backend/src/routes/devices.routes.js`.

## 2. Luồng phụ: Thu thập dữ liệu cảm biến thời gian thực (phục vụ UC02 Dashboard, là nguồn dữ liệu cho UC04)

```mermaid
sequenceDiagram
    participant HW as NodeMCU (DHT11)
    participant MQ as MQTT Broker
    participant BE as Backend (MQTT subscriber)
    participant DB as MySQL (DataSensor)
    participant FE as Frontend (React)
    actor U as Người dùng

    loop mỗi 5 giây
        HW->>HW: đọc DHT11 (temperature, humidity)
        HW->>MQ: PUBLISH home/sensor/1/data { temp, humidity }
    end
    MQ->>BE: forward message
    BE->>DB: INSERT DataSensor(sensor_id, value, recorded_at)
    BE->>FE: Đẩy realtime (WebSocket) sensor mới
    FE-->>U: Cập nhật biểu đồ Dashboard / trang Data Sensor
```

## 3. Luồng tra cứu dữ liệu cảm biến theo thời gian (UC04 — trang Data Sensor)

Khác với luồng thu thập realtime ở mục 2 (đẩy dữ liệu mới xuống ngay khi có), luồng này là người dùng **chủ động truy vấn lại** dữ liệu đã lưu theo bộ lọc (cảm biến, khoảng thời gian) để xem biểu đồ/bảng lịch sử.

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Frontend (trang Data Sensor)
    participant BE as Backend (Express API)
    participant DB as MySQL (DataSensor)

    U->>FE: Chọn cảm biến + khoảng thời gian (from, to)
    FE->>BE: GET /api/sensors?sensor_id=1&from=...&to=...
    BE->>DB: SELECT * FROM DataSensor WHERE sensor_id=? AND recorded_at BETWEEN ? AND ?
    alt Có dữ liệu
        DB-->>BE: danh sách bản ghi (value, recorded_at)
        BE-->>FE: 200 OK [ {value, recorded_at}, ... ]
        FE-->>U: Vẽ line chart + bảng dữ liệu chi tiết
    else Không có dữ liệu trong khoảng đã chọn
        DB-->>BE: rows = []
        BE-->>FE: 200 OK []
        FE-->>U: Hiển thị "Không có dữ liệu"
    end
```

## 4. Luồng tra cứu lịch sử hành động (UC05 — trang Action History)

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Frontend (trang Action History)
    participant BE as Backend (Express API)
    participant DB as MySQL (ActionHistory ⋈ Device ⋈ User)

    U->>FE: Chọn bộ lọc (thiết bị / khoảng thời gian) hoặc để trống = tất cả
    FE->>BE: GET /api/actions?device_id=&from=&to=
    BE->>DB: SELECT a.*, d.name, u.full_name FROM ActionHistory a JOIN Device d JOIN User u WHERE ...
    DB-->>BE: danh sách bản ghi (kèm triggered_by: user/system)
    BE-->>FE: 200 OK [ {device_name, action, triggered_by, status, triggered_at}, ... ]
    FE-->>U: Hiển thị bảng: thời gian, thiết bị, hành động, người thực hiện, nguồn, trạng thái
    Note over FE,U: Realtime: khi có action:update mới qua Socket.io, FE tự gọi lại API để bảng luôn mới nhất
```

## 5. Luồng cảnh báo & tự động xử lý khi vượt ngưỡng (UC07 — bonus)

Khác với UC03 (người dùng chủ động bấm nút), luồng này do chính **Backend** phát hiện và tự sinh ra lệnh điều khiển — thể hiện `ActionHistory.triggered_by = 'system'`.

```mermaid
sequenceDiagram
    participant HW as NodeMCU (DHT11)
    participant MQ as MQTT Broker
    participant BE as Backend (MQTT subscriber)
    participant DB as MySQL (DataSensor/ActionHistory/Device)
    participant FE as Frontend (Dashboard)
    actor U as Người dùng

    HW->>MQ: PUBLISH home/sensor/1/data { value: 33.5 }
    MQ->>BE: forward message
    BE->>DB: INSERT DataSensor(sensor_id=1, value=33.5)
    BE->>BE: So sánh value với TEMP_ALERT_THRESHOLD (mặc định 32°C)

    alt value > threshold VÀ Điều hòa đang OFF
        BE->>DB: INSERT ActionHistory(device_id=3, action=ON, triggered_by='system', status=pending)
        BE->>MQ: PUBLISH home/device/3/set payload="ON"
        MQ->>HW: forward message
        HW->>HW: digitalWrite(AC_LED_PIN, HIGH)
        HW->>MQ: PUBLISH home/device/3/status payload="ON"
        MQ->>BE: forward message
        BE->>DB: UPDATE ActionHistory SET status=success
        BE->>DB: UPDATE Device SET current_state=ON
        BE->>FE: emit alert:threshold { auto_action: true, message } + device:update
        FE-->>U: Hiện banner cảnh báo đỏ "Nhiệt độ vượt ngưỡng - đã tự động bật Điều hòa"
    else value > threshold NHƯNG Điều hòa đã ON sẵn
        BE->>FE: emit alert:threshold { auto_action: false, message }
        FE-->>U: Chỉ hiện banner cảnh báo, không đổi trạng thái nút
    else value trong ngưỡng an toàn
        Note over BE: Không làm gì thêm
    end
```

**Trường hợp lỗi**: nếu Hardware không phản hồi `home/device/3/status` trong `ACTION_TIMEOUT_MS`, lệnh tự động này cũng bị đánh dấu `status='timeout'` giống hệt cơ chế của UC03.

## 6. Luồng đăng nhập (UC01) — tham chiếu ngắn gọn

```mermaid
sequenceDiagram
    actor U as Người dùng
    participant FE as Frontend
    participant BE as Backend
    participant DB as MySQL (User)

    U->>FE: Nhập email/password
    FE->>BE: POST /api/auth/login
    BE->>DB: SELECT * FROM User WHERE email=?
    DB-->>BE: user row (password_hash)
    BE->>BE: bcrypt.compare(password, password_hash)
    BE-->>FE: 200 OK { token: JWT }
    FE-->>U: Chuyển hướng vào Dashboard
```
