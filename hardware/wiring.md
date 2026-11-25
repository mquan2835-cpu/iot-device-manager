# Bài 2.2 — Sơ đồ đấu nối phần cứng

## Linh kiện cần chuẩn bị

- 1× ESP32-C3 Super Mini (đồ án dùng board này; firmware cũng chạy trên NodeMCU ESP8266 hoặc ESP32 DevKit)
- 3× LED (đóng vai Đèn / Quạt / Điều hòa) + **3× điện trở 220Ω** — bắt buộc có trở, nối thẳng LED vào GPIO sẽ quá dòng. LED trắng/xanh dương ở 3.3V qua 220Ω sẽ khá mờ, có thể giảm trở xuống 100Ω.
- 1× module cảm biến nhiệt độ **I2C** 4 chân (VCC, GND, SCL, SDA). Firmware tự nhận diện: AHT10/AHT20/AHT21, SHT30/31/35, HTU21D/SHT21/Si7021, BME280 (có độ ẩm), BMP280 (không có độ ẩm).
- 1× module cảm biến ánh sáng **TEMT6000** 3 chân (VCC, GND, OUT/SIG) — tín hiệu analog.
- Breadboard + dây cắm

## Bảng đấu nối — ESP32-C3 Super Mini (board dùng trong đồ án)

| Linh kiện | Chân board | Ghi chú |
|---|---|---|
| LED "Đèn" / LED 1 (anode qua trở 220Ω) | GPIO3 | cathode (chân ngắn) về GND |
| LED "Quạt" / LED 2 (anode qua trở 220Ω) | GPIO4 | cathode về GND |
| LED "Điều hòa" / LED 3 (anode qua trở 220Ω) | GPIO7 | cathode về GND |
| Cảm biến nhiệt độ I2C — SDA | GPIO8 | cặp I2C mặc định của ESP32-C3 |
| Cảm biến nhiệt độ I2C — SCL | GPIO9 | |
| Cảm biến nhiệt độ I2C — VCC / GND | 3V3 / GND | |
| TEMT6000 — OUT (SIG) | GPIO0 | **phải là GPIO0..GPIO4** (ADC1); 3 và 4 đã dùng cho LED. GPIO5 là ADC2, không đọc được khi đang bật Wi-Fi |
| TEMT6000 — VCC / GND | 3V3 / GND | **không** dùng 5V (tín hiệu ra sẽ vượt 3.3V) |

Lưu ý riêng cho ESP32-C3 Super Mini:
- **Không cắm LED vào GPIO2, GPIO8, GPIO9** — đây là chân quyết định chế độ khởi động (GPIO8 nối sẵn LED xanh trên board, GPIO9 là nút BOOT). Riêng GPIO8/GPIO9 dùng làm **I2C thì hoàn toàn bình thường**, vì module I2C có điện trở kéo lên giữ 2 chân ở mức cao lúc khởi động.
- Số in trên board chỉ là con số, không có chữ "GPIO". Chân **5** (GPIO5) khác hoàn toàn với chân nguồn **5V**.
- Arduino IDE: chọn board **ESP32C3 Dev Module** (hoặc *Nologo ESP32C3 Super Mini* nếu có), và **Tools → USB CDC On Boot → Enabled**. Quên bước này thì Serial Monitor trống trơn dù board vẫn chạy.
- Upload báo không kết nối được: giữ **BOOT**, bấm-nhả **RESET**, nhả BOOT, rồi Upload lại.
- Firmware tự giảm công suất phát Wi-Fi (`WiFi.setTxPower(WIFI_POWER_8_5dBm)`) vì nhiều board C3 Super Mini có anten kém.
- Nếu đã cắm cảm biến I2C vào chân khác 8/9, firmware **tự dò ra** và in chân đúng trong Serial Monitor; LED và TEMT6000 thì cần sửa các `#define` ở đầu file cho khớp mạch.

## Bảng đấu nối — NodeMCU ESP8266

| Linh kiện | Chân board | Ghi chú |
|---|---|---|
| LED "Đèn" / "Quạt" / "Điều hòa" (qua trở 220Ω) | D5 (GPIO14) / D6 (GPIO12) / D7 (GPIO13) | cathode về GND |
| Cảm biến I2C — SDA / SCL | D2 (GPIO4) / D1 (GPIO5) | cặp I2C mặc định của ESP8266 |
| TEMT6000 — OUT | A0 | chân analog duy nhất của ESP8266 |
| VCC / GND các module | 3V3 / GND | |

Không dùng D3 (GPIO0), D4 (GPIO2), D8 (GPIO15): đây là chân quyết định chế độ khởi động của ESP8266.

## Bảng đấu nối — ESP32 DevKit

| Linh kiện | Chân board |
|---|---|
| LED "Đèn" / "Quạt" / "Điều hòa" (qua trở 220Ω) | GPIO4 / GPIO5 / GPIO18 |
| Cảm biến I2C — SDA / SCL | GPIO21 / GPIO22 |
| TEMT6000 — OUT | GPIO34 (ADC1) |
| VCC / GND các module | 3V3 / GND |

## Sơ đồ (mô tả dạng text, ESP32-C3 Super Mini)

```
  GPIO3 ──[220Ω]──►|── GND   (LED Đèn)
  GPIO4 ──[220Ω]──►|── GND   (LED Quạt)
  GPIO7 ──[220Ω]──►|── GND   (LED Điều hòa)

  Module I2C nhiệt độ:  VCC─3V3   GND─GND   SDA─GPIO8   SCL─GPIO9
  TEMT6000:             VCC─3V3   GND─GND   OUT─GPIO0
```

## Kiểm tra mạch trước khi nạp firmware chính

Nạp `hardware/tools/pin_finder/pin_finder.ino` (không cần Wi-Fi). Sketch quét I2C (in địa chỉ + tên chip đoán được), đọc analog để tìm chân TEMT6000 (che tay lên cảm biến), và bật lần lượt từng GPIO để biết LED nào nằm ở chân nào.

## Các bước nạp code

1. Cài Arduino IDE, vào **File > Preferences**, thêm Additional Board URL:
   - ESP32 / ESP32-C3: `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - ESP8266: `https://arduino.esp8266.com/stable/package_esp8266com_index.json`
2. Vào **Tools > Board > Boards Manager**, cài gói tương ứng (**esp32 by Espressif Systems** cho ESP32-C3).
3. Cài thư viện qua Library Manager: **`PubSubClient`** (bản ESP32-C3 chỉ cần thư viện này; bản đa board cần thêm **`ArduinoJson`**). (Không cần thư viện DHT; driver cảm biến I2C đã viết sẵn trong firmware.)
4. Mở **`hardware/iot_device_esp32c3/iot_device_esp32c3.ino`** (bản dành riêng cho ESP32-C3, đúng giao thức Bài 1; chỉ cần thư viện PubSubClient), sửa `WIFI_SSID`, `WIFI_PASSWORD`, `MQTT_BROKER` cho đúng môi trường thật. (`iot_device_node.ino` là bản đa board cũ, dùng khi cắm ESP8266/ESP32 DevKit.)
   - Wi-Fi phải là băng tần **2.4 GHz**.
   - Nếu dùng Mosquitto chạy trên laptop: `MQTT_BROKER` là **IP LAN của laptop** (vd `192.168.1.10`), không phải `localhost`. Mosquitto 2.x mặc định chỉ nghe localhost — thêm `listener 1883` và `allow_anonymous true` vào `mosquitto.conf` rồi khởi động lại.
   - Không cần sửa Client ID: firmware tự ghép chip ID của board (`esp-iot-node-XXXXXX`).
5. Chọn đúng Board + Port, bấm **Upload**.
6. Mở **Serial Monitor** (115200 baud). Thấy lần lượt: dòng `[BOARD]` (bảng chân đang dùng), `[I2C] Cảm biến nhiệt độ: …` (tên chip tìm được), `[TEMT6000] …`, `[WIFI] Đã kết nối`, `[MQTT] … OK`, rồi cứ 5 giây một dòng `[SENSOR] temp=… humidity=… light=…`.
7. Test bằng cách publish lệnh từ Terminal 2 (Bài 2.1) hoặc từ Backend thật ở Bài 3 — cùng chung topic MQTT nên board phản hồi y hệt Terminal 1 đã mô phỏng.

## Topic cảm biến

Board gửi **một bản tin gộp** mỗi 5 giây:

| Topic | Payload ví dụ |
|---|---|
| `home/sensor/data` | `{"temperature":30.5,"humidity":62.0,"light":180}` |

Đơn vị: nhiệt độ °C, độ ẩm %, ánh sáng lux. Ô nào đọc lỗi thì board bỏ ô đó (không gửi số giả); chip BMP280 không có ô `humidity`. Backend tách bản tin thành 3 dòng `DataSensor` theo `sensor_id` (1 = nhiệt độ, 2 = độ ẩm, 3 = ánh sáng).

Giá trị lux của TEMT6000 là **ước tính** (lux ≈ 0.2 × mV theo datasheet), đủ để so sánh sáng/tối; module bão hoà quanh ~650 lux.

## Lưu ý khi chấm điểm / quay video demo

- Quay video: bấm nút trên **Web thật** (Bài 3) → LED thật đổi trạng thái → trang Dashboard cập nhật lại đúng trạng thái → xem lại trong Action History thấy `status = success`. Đây là minh chứng tốt nhất cho luồng end-to-end.
- Nếu Wi-Fi lớp học không cho thiết bị này thấy thiết bị kia (AP Isolation), dùng broker công cộng `broker.hivemq.com` để tất cả (board, backend, laptop demo) đều nối ra Internet thay vì cùng mạng LAN.
