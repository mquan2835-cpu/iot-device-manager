# Bài 2.1 — Mô phỏng hệ thống bằng 3 Terminal (không dùng phần cứng thật)

Mục tiêu: hiểu cơ chế **Publish/Subscribe** qua MQTT Broker bằng cách dùng 3 cửa sổ Terminal đóng vai 3 thành phần trong hệ thống thật, và tái hiện **đủ các nhánh** của Sequence Diagram ở Bài 1 (bật/tắt thành công, timeout khi thiết bị mất kết nối, tự động bật Điều hòa khi quá nóng).

## Vai trò 3 Terminal

| Terminal | Đóng vai | Lệnh chạy | File |
|---|---|---|---|
| **Terminal 1** | Phần cứng (ESP32-C3 + 3 LED + cảm biến nhiệt độ I2C + TEMT6000) | `npm run hardware` | `terminal1_hardware_simulator.js` |
| **Terminal 2** | Backend (nhận lệnh từ "Web", gửi xuống MQTT, chờ phản hồi) | `npm run backend` | `terminal2_backend_simulator.js` |
| **Terminal 3** | Người quan sát Broker — thấy mọi gói tin đi qua | `npm run monitor` *hoặc* `mosquitto_sub` | `terminal3_monitor.js` |

Terminal 1 dùng **đúng bộ topic và payload** của firmware thật ở Bài 2.2; Terminal 2 dùng **đúng logic** của `backend/src/mqtt/mqttClient.js` ở Bài 3 (timeout `ACTION_TIMEOUT_MS`, ngưỡng `TEMP_ALERT_THRESHOLD`). Vì vậy thay Terminal 1 bằng board thật, hoặc thay Terminal 2 bằng Backend thật, hệ thống vẫn chạy y hệt.

## Chuẩn bị Broker

**Khuyến nghị khi demo và chụp ảnh báo cáo — Mosquitto chạy trên máy:**

| Hệ điều hành | Cài đặt |
|---|---|
| Windows | Tải bộ cài tại https://mosquitto.org/download/ , cài xong mở Services và Start dịch vụ *Mosquitto Broker* (hoặc chạy `"C:\Program Files\mosquitto\mosquitto.exe" -v`) |
| Ubuntu/Debian | `sudo apt install -y mosquitto mosquitto-clients && sudo systemctl start mosquitto` |
| macOS | `brew install mosquitto && brew services start mosquitto` |

Sau đó đặt biến môi trường **trong cả 3 cửa sổ** trước khi chạy:

```bash
# macOS / Linux
export BROKER_URL=mqtt://localhost:1883
# Windows PowerShell
$env:BROKER_URL="mqtt://localhost:1883"
# Windows CMD
set BROKER_URL=mqtt://localhost:1883
```

**Cách nhanh không cần cài gì:** bỏ qua bước trên, script mặc định dùng broker công cộng `broker.hivemq.com:1883`. Lưu ý broker công cộng là **dùng chung toàn thế giới** — nếu bạn cùng lớp cũng chạy cùng topic `home/...` cùng lúc thì hai bên sẽ "điều khiển nhầm" thiết bị của nhau, nên khi chụp ảnh báo cáo hãy dùng Mosquitto local.

## Cách chạy (mở đúng 3 cửa sổ Terminal riêng biệt)

Cài thư viện một lần: `cd mqtt-simulation && npm install`

**Terminal 3 (mở trước để không bỏ sót gói tin nào):**
```bash
npm run monitor
# hoặc nếu đã cài mosquitto-clients:
mosquitto_sub -h localhost -p 1883 -t "home/#" -v
```
`home/#` nghĩa là nghe **mọi** topic con của `home/`; `-v` in kèm tên topic.

**Terminal 1 — giả lập phần cứng:**
```bash
npm run hardware
```
Kết nối xong sẽ subscribe `home/device/+/set`, publish trạng thái ban đầu của 3 LED và publish nhiệt độ/độ ẩm mỗi 5 giây. Các lệnh có thể gõ trong cửa sổ này:

| Lệnh | Ý nghĩa |
|---|---|
| `offline` | ngắt kết nối MQTT — giả lập ESP mất Wi-Fi |
| `online` | kết nối lại |
| `temp 33.5` | phát ngay một giá trị nhiệt độ tuỳ ý (để kích hoạt UC07) |
| `status` | xem trạng thái 3 LED |

**Terminal 2 — giả lập Backend:**
```bash
npm run backend
```

| Lệnh | Ý nghĩa |
|---|---|
| `1 ON`, `2 OFF`, `3 ON`… | bật/tắt thiết bị (1=Đèn, 2=Quạt, 3=Điều hòa), giống bấm nút trên Web |
| `status` | xem trạng thái thiết bị mà Backend đang biết |

## 3 kịch bản cần chạy và chụp ảnh cho báo cáo

| # | Kịch bản | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| 1 | Bật/tắt thành công (UC03 — nhánh alt) | Terminal 2 gõ `1 ON` | T2 publish `home/device/1/set`; T1 in `digitalWrite(D1, HIGH)` và publish `home/device/1/status`; T2 in ✅ kèm thời gian phản hồi (~200 ms) và `status='success'`; T3 thấy đủ 2 gói tin |
| 2 | Thiết bị mất kết nối (UC03 — nhánh else) | Terminal 1 gõ `offline`, rồi Terminal 2 gõ `3 ON` | Sau 5 giây T2 in ⏰ `TIMEOUT` và `status='timeout'`; T3 chỉ thấy gói `…/set`, không có `…/status`. Gõ `online` ở T1 để board đồng bộ lại trạng thái |
| 3 | Quá nóng, tự bật Điều hòa (UC07) | Terminal 1 gõ `temp 33.5`; sau đó gõ tiếp `temp 34.2` | Lần 1: T2 in ⚠️ cảnh báo và **tự** publish `home/device/3/set` với `triggered_by=system`. Lần 2: Điều hòa đã ON nên T2 chỉ cảnh báo, không gửi lệnh trùng |

Chụp màn hình **cả 3 cửa sổ cùng lúc** sau mỗi kịch bản (xếp 3 cửa sổ cạnh nhau) — đó là minh chứng cho Bài 2.1.

## Topic MQTT sử dụng trong đồ án

| Topic | Chiều | Payload ví dụ | Ý nghĩa |
|---|---|---|---|
| `home/device/{id}/set` | Backend → Hardware | `{"action":"ON"}` | Lệnh điều khiển bật/tắt |
| `home/device/{id}/status` | Hardware → Backend | `{"device_id":1,"state":"ON"}` | Trạng thái thật sau khi xử lý |
| `home/sensor/1/data` | Hardware → Backend | `{"sensor_id":1,"type":"temperature","value":28.4,"unit":"°C"}` | Nhiệt độ |
| `home/sensor/2/data` | Hardware → Backend | `{"sensor_id":2,"type":"humidity","value":63,"unit":"%"}` | Độ ẩm |
| `home/sensor/3/data` | Hardware → Backend | `{"sensor_id":3,"type":"light_intensity","value":320,"unit":"lux"}` | Ánh sáng (TEMT6000) |

## Biến môi trường tuỳ chỉnh

| Biến | Mặc định | Dùng ở |
|---|---|---|
| `BROKER_URL` | `mqtt://broker.hivemq.com:1883` | cả 3 terminal |
| `SENSOR_INTERVAL_MS` | `5000` | Terminal 1 — chu kỳ đọc cảm biến (tăng lên, vd `60000`, nếu log cảm biến làm rối ảnh chụp) |
| `ACTION_TIMEOUT_MS` | `5000` | Terminal 2 — thời gian chờ phản hồi trước khi báo timeout |
| `TEMP_ALERT_THRESHOLD` | `32` | Terminal 2 — ngưỡng nhiệt độ của UC07 |

## Dùng với board thật chạy firmware `iot_ptit_esp32c3` (topic `iot_ptit/...`)

Firmware `hardware/iot_ptit_esp32c3/iot_ptit_esp32c3.ino` dùng bộ topic khác (`iot_ptit/device_control`, `iot_ptit/device_response`, `iot_ptit/data_sensor`, `iot_ptit/device_sync`), nên dùng 2 lệnh riêng:

| Cửa sổ | Lệnh | Vai trò |
|---|---|---|
| Terminal 1 | `npm run hardware:ptit` | **chỉ dùng ở Bài 2.1** — giả lập board (gõ `offline`, `online`, `temp 33.5`, `status`) |
| Terminal 2 | `npm run backend:ptit` | gõ `1 ON`, `2 OFF`, `1 2 ON` (2 đèn), `all ON` (cả 3), `status`, `sensor` (xem 1 lần). Màn hình im, chỉ in kết quả lệnh |
| Terminal 3 | `npm run monitor:ptit` | xem mọi bản tin `iot_ptit/#` |

Bài 2.1: chạy cả 3 cửa sổ, KHÔNG cắm board. Bài 2.2: tắt Terminal 1, cắm board thật (firmware `iot_ptit_esp32c3`) — Terminal 2 và 3 giữ nguyên. Muốn thử tự bật LED khi nóng: `set TEMP_ALERT_THRESHOLD=28` (CMD) rồi `npm run backend:ptit`.
