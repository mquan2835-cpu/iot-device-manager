/*
 * BÀI 2.2 — Lập trình phần cứng thật (ESP32-C3 Super Mini; hỗ trợ cả ESP32 DevKit / NodeMCU ESP8266)
 * ------------------------------------------------------------------------------------------------
 * Thay thế hoàn toàn Terminal 1 (giả lập phần cứng) ở Bài 2.1.
 *
 * Chức năng:
 *  - Kết nối Wi-Fi và MQTT Broker (cùng broker/topic đã dùng ở Bài 2.1 để không phải đổi gì ở Backend).
 *  - SUBSCRIBE home/device/{id}/set    -> bật/tắt LED thật (1 = Đèn, 2 = Quạt, 3 = Điều hòa).
 *  - PUBLISH   home/device/{id}/status -> trạng thái LED thật sau khi xử lý.
 *  - Mỗi 5 giây đọc cảm biến THẬT và PUBLISH:
 *      home/sensor/1/data  nhiệt độ (°C)  — cảm biến I2C
 *      home/sensor/2/data  độ ẩm (%)      — cảm biến I2C (nếu chip có đo độ ẩm)
 *      home/sensor/3/data  ánh sáng (lux) — TEMT6000 (analog)
 *  - Cảm biến nhiệt độ I2C được TỰ NHẬN DIỆN, không cần cài thêm thư viện:
 *      AHT10/AHT20/AHT21 (0x38), SHT30/31/35 (0x44/0x45), HTU21D/SHT21/Si7021 (0x40),
 *      BME280 (0x76/0x77, có độ ẩm), BMP280 (0x76/0x77, KHÔNG có độ ẩm).
 *  - Nếu không thấy cảm biến ở chân SDA/SCL đã khai báo, firmware tự thử đảo SDA/SCL và (với ESP32-C3)
 *    tự dò các chân khác, rồi in ra chân đúng để bạn sửa lại phần khai báo.
 *  - Tự kết nối lại Wi-Fi/MQTT khi rớt mạng, rồi publish lại trạng thái 3 LED để Backend đồng bộ.
 *
 * Thư viện cần cài (Arduino IDE -> Library Manager):
 *   - PubSubClient (Nick O'Leary)
 *   - ArduinoJson  (Benoit Blanchon)
 *   (Wire có sẵn trong gói board; KHÔNG cần thư viện DHT nữa)
 *
 * Board:
 *   - ESP32-C3 Super Mini : chọn "ESP32C3 Dev Module" (hoặc "Nologo ESP32C3 Super Mini" nếu có)
 *                           và BẮT BUỘC Tools -> USB CDC On Boot -> "Enabled", nếu không Serial Monitor sẽ trống.
 *   - ESP32 DevKit        : chọn "ESP32 Dev Module"
 *   - NodeMCU ESP8266     : chọn "NodeMCU 1.0 (ESP-12E Module)"
 */

#if defined(ESP32)
  #include <WiFi.h>
#else
  #include <ESP8266WiFi.h>
#endif

#include <Wire.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ================== CẤU HÌNH — SỬA LẠI CHO ĐÚNG MẠNG CỦA BẠN ==================
const char* WIFI_SSID     = "TEN_WIFI_CUA_BAN";
const char* WIFI_PASSWORD = "MAT_KHAU_WIFI";

const char* MQTT_BROKER   = "broker.hivemq.com"; // đổi thành IP LAN của laptop nếu dùng Mosquitto local
const int   MQTT_PORT     = 1883;
// Client ID phải DUY NHẤT trên broker -> ghép thêm chip ID của chính board vào sau tiền tố này.
const char* MQTT_CLIENT_PREFIX = "esp-iot-node-";

// ================== SƠ ĐỒ CHÂN — sửa nếu bạn cắm khác (xem hardware/wiring.md) ==================
// Code tự chọn bảng chân theo board đang chọn trong Tools -> Board của Arduino IDE.
#if defined(CONFIG_IDF_TARGET_ESP32C3)
  #define BOARD_NAME      "ESP32-C3 Super Mini"
  #define LED_LIGHT_PIN   5   // Đèn
  #define LED_FAN_PIN     6   // Quạt
  #define LED_AC_PIN      7   // Điều hòa
  #define I2C_SDA_PIN     8   // SDA cảm biến nhiệt độ (cặp I2C mặc định của ESP32-C3)
  #define I2C_SCL_PIN     9   // SCL cảm biến nhiệt độ
  #define LIGHT_PIN       3   // OUT của TEMT6000 — BẮT BUỘC là GPIO0..GPIO4 (ADC1); GPIO5 là ADC2, không đọc được khi bật Wi-Fi
#elif defined(ESP32)
  #define BOARD_NAME      "ESP32 DevKit"
  #define LED_LIGHT_PIN   4
  #define LED_FAN_PIN     5
  #define LED_AC_PIN      18
  #define I2C_SDA_PIN     21
  #define I2C_SCL_PIN     22
  #define LIGHT_PIN       34  // ADC1 (GPIO32..39); không dùng chân ADC2 khi bật Wi-Fi
#else
  #define BOARD_NAME      "NodeMCU ESP8266"
  #define LED_LIGHT_PIN   14  // D5
  #define LED_FAN_PIN     12  // D6
  #define LED_AC_PIN      13  // D7
  #define I2C_SDA_PIN     4   // D2
  #define I2C_SCL_PIN     5   // D1
  #define LIGHT_PIN       A0  // chân analog duy nhất của ESP8266
#endif

// device_id / sensor_id khớp với dữ liệu seed trong backend/db/schema.sql
#define DEVICE_ID_LIGHT 1
#define DEVICE_ID_FAN   2
#define DEVICE_ID_AC    3
#define SENSOR_ID_TEMP  1
#define SENSOR_ID_HUM   2
#define SENSOR_ID_LUX   3

const unsigned long SENSOR_INTERVAL_MS = 5000;

WiFiClient   espClient;
PubSubClient mqttClient(espClient);

String mqttClientId;
// Trạng thái hiện tại của 3 LED (index = device_id). Tự lưu thay vì digitalRead() chân OUTPUT,
// vì trên một số phiên bản core ESP32, digitalRead() chân OUTPUT luôn trả về LOW.
bool deviceState[4] = {false, false, false, false};
unsigned long lastSensorRead = 0;
unsigned long lastDetectTry = 0;

// ======================================================================================
// 1. CẢM BIẾN NHIỆT ĐỘ I2C — tự nhận diện, driver tối giản không cần thư viện ngoài
// ======================================================================================
enum TempChip { CHIP_NONE, CHIP_AHT, CHIP_SHT3X, CHIP_HTU21, CHIP_BME280, CHIP_BMP280 };
TempChip tempChip = CHIP_NONE;
uint8_t  tempAddr = 0;
int      i2cSda = I2C_SDA_PIN, i2cScl = I2C_SCL_PIN;

const char* chipName(TempChip c) {
  switch (c) {
    case CHIP_AHT:    return "AHT10/AHT20 (nhiệt độ + độ ẩm)";
    case CHIP_SHT3X:  return "SHT3x (nhiệt độ + độ ẩm)";
    case CHIP_HTU21:  return "HTU21D/SHT21/Si7021 (nhiệt độ + độ ẩm)";
    case CHIP_BME280: return "BME280 (nhiệt độ + độ ẩm + áp suất)";
    case CHIP_BMP280: return "BMP280 (nhiệt độ + áp suất, KHÔNG có độ ẩm)";
    default:          return "không tìm thấy";
  }
}

bool i2cPresent(uint8_t a) {
  Wire.beginTransmission(a);
  return Wire.endTransmission() == 0;
}
bool i2cWrite(uint8_t a, const uint8_t* data, uint8_t n) {
  Wire.beginTransmission(a);
  Wire.write(data, n);
  return Wire.endTransmission() == 0;
}
bool i2cRead(uint8_t a, uint8_t* buf, uint8_t n) {
  if (Wire.requestFrom((int)a, (int)n) != n) return false;   // ép kiểu int để tránh lỗi "ambiguous overload" trên core ESP32
  for (uint8_t i = 0; i < n; i++) buf[i] = Wire.read();
  return true;
}
bool i2cReadReg(uint8_t a, uint8_t reg, uint8_t* buf, uint8_t n) {
  Wire.beginTransmission(a);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  return i2cRead(a, buf, n);
}
bool i2cWriteReg(uint8_t a, uint8_t reg, uint8_t val) {
  uint8_t d[2] = {reg, val};
  return i2cWrite(a, d, 2);
}

// --- BME280 / BMP280: hệ số hiệu chuẩn đọc từ chip ---
uint16_t dig_T1; int16_t dig_T2, dig_T3;
uint8_t  dig_H1, dig_H3; int16_t dig_H2, dig_H4, dig_H5; int8_t dig_H6;

bool bmeInit(bool hasHumidity) {
  uint8_t c[24];
  if (!i2cReadReg(tempAddr, 0x88, c, 24)) return false;
  dig_T1 = c[0] | (c[1] << 8);
  dig_T2 = (int16_t)(c[2] | (c[3] << 8));
  dig_T3 = (int16_t)(c[4] | (c[5] << 8));
  if (hasHumidity) {
    uint8_t h[7];
    if (!i2cReadReg(tempAddr, 0xA1, &dig_H1, 1)) return false;
    if (!i2cReadReg(tempAddr, 0xE1, h, 7)) return false;
    dig_H2 = (int16_t)(h[0] | (h[1] << 8));
    dig_H3 = h[2];
    dig_H4 = (int16_t)(((int8_t)h[3] << 4) | (h[4] & 0x0F));
    dig_H5 = (int16_t)(((int8_t)h[5] << 4) | (h[4] >> 4));
    dig_H6 = (int8_t)h[6];
    i2cWriteReg(tempAddr, 0xF2, 0x01);       // độ ẩm oversampling x1 (phải ghi TRƯỚC thanh ghi 0xF4)
  }
  i2cWriteReg(tempAddr, 0xF5, 0xA0);         // standby 1000 ms
  return i2cWriteReg(tempAddr, 0xF4, 0x27);  // nhiệt độ x1, áp suất x1, chế độ đo liên tục
}

bool bmeRead(float& t, float& h) {
  uint8_t d[8];
  if (!i2cReadReg(tempAddr, 0xF7, d, 8)) return false;
  int32_t adcT = ((int32_t)d[3] << 12) | ((int32_t)d[4] << 4) | (d[5] >> 4);
  int32_t adcH = ((int32_t)d[6] << 8) | d[7];
  // Công thức bù nhiệt độ theo datasheet Bosch
  int32_t var1 = ((((adcT >> 3) - ((int32_t)dig_T1 << 1))) * ((int32_t)dig_T2)) >> 11;
  int32_t var2 = (((((adcT >> 4) - ((int32_t)dig_T1)) * ((adcT >> 4) - ((int32_t)dig_T1))) >> 12) * ((int32_t)dig_T3)) >> 14;
  int32_t tFine = var1 + var2;
  t = ((tFine * 5 + 128) >> 8) / 100.0f;
  if (tempChip != CHIP_BME280) { h = NAN; return true; }
  // Công thức bù độ ẩm theo datasheet Bosch
  int32_t v = tFine - 76800;
  v = (((((adcH << 14) - (((int32_t)dig_H4) << 20) - (((int32_t)dig_H5) * v)) + 16384) >> 15) *
       (((((((v * ((int32_t)dig_H6)) >> 10) * (((v * ((int32_t)dig_H3)) >> 11) + 32768)) >> 10) + 2097152) *
         ((int32_t)dig_H2) + 8192) >> 14));
  v = v - (((((v >> 15) * (v >> 15)) >> 7) * ((int32_t)dig_H1)) >> 4);
  v = v < 0 ? 0 : (v > 419430400 ? 419430400 : v);
  h = (uint32_t)(v >> 12) / 1024.0f;
  return true;
}

bool ahtRead(float& t, float& h) {
  const uint8_t trig[3] = {0xAC, 0x33, 0x00};
  if (!i2cWrite(tempAddr, trig, 3)) return false;
  delay(80);
  uint8_t b[6];
  if (!i2cRead(tempAddr, b, 6)) return false;
  if (b[0] & 0x80) {                           // cảm biến vẫn đang đo -> chờ thêm rồi đọc lại
    delay(40);
    if (!i2cRead(tempAddr, b, 6) || (b[0] & 0x80)) return false;
  }
  uint32_t rawH = ((uint32_t)b[1] << 12) | ((uint32_t)b[2] << 4) | (b[3] >> 4);
  uint32_t rawT = (((uint32_t)b[3] & 0x0F) << 16) | ((uint32_t)b[4] << 8) | b[5];
  h = rawH * 100.0f / 1048576.0f;
  t = rawT * 200.0f / 1048576.0f - 50.0f;
  return true;
}

bool sht3xRead(float& t, float& h) {
  const uint8_t cmd[2] = {0x24, 0x00};         // đo 1 lần, độ lặp cao, không clock stretching
  if (!i2cWrite(tempAddr, cmd, 2)) return false;
  delay(20);
  uint8_t b[6];
  if (!i2cRead(tempAddr, b, 6)) return false;
  t = -45.0f + 175.0f * ((b[0] << 8) | b[1]) / 65535.0f;
  h = 100.0f * ((b[3] << 8) | b[4]) / 65535.0f;
  return true;
}

bool htu21Read(float& t, float& h) {
  uint8_t b[3];
  uint8_t cmd = 0xF3;                          // đo nhiệt độ, chế độ không giữ bus
  if (!i2cWrite(tempAddr, &cmd, 1)) return false;
  delay(55);
  if (!i2cRead(tempAddr, b, 3)) return false;
  t = -46.85f + 175.72f * (((b[0] << 8) | b[1]) & 0xFFFC) / 65536.0f;
  cmd = 0xF5;                                  // đo độ ẩm
  if (!i2cWrite(tempAddr, &cmd, 1)) return false;
  delay(20);
  if (!i2cRead(tempAddr, b, 3)) return false;
  h = -6.0f + 125.0f * (((b[0] << 8) | b[1]) & 0xFFFC) / 65536.0f;
  h = constrain(h, 0.0f, 100.0f);
  return true;
}

void startI2C(int sda, int scl) {
#if defined(ESP32)
  Wire.end();
#endif
  Wire.begin(sda, scl);
#if defined(ESP32)
  Wire.setTimeOut(50);
#endif
  i2cSda = sda;
  i2cScl = scl;
}

// Thử nhận diện chip trên bus I2C hiện tại
bool identifyChip() {
  tempChip = CHIP_NONE;
  if (i2cPresent(0x38)) {
    tempAddr = 0x38;
    delay(40);
    uint8_t st = 0;
    i2cRead(tempAddr, &st, 1);
    if (!(st & 0x08)) {                                 // chưa hiệu chuẩn -> gửi lệnh khởi tạo
      const uint8_t init20[3] = {0xBE, 0x08, 0x00};     // AHT20/AHT21
      const uint8_t init10[3] = {0xE1, 0x08, 0x00};     // AHT10
      if (!i2cWrite(tempAddr, init20, 3)) i2cWrite(tempAddr, init10, 3);
      delay(10);
    }
    tempChip = CHIP_AHT;
    return true;
  }
  const uint8_t shtAddrs[2] = {0x44, 0x45};
  for (uint8_t a : shtAddrs) {
    if (i2cPresent(a)) { tempAddr = a; tempChip = CHIP_SHT3X; return true; }
  }
  const uint8_t bmeAddrs[2] = {0x76, 0x77};
  for (uint8_t a : bmeAddrs) {
    if (!i2cPresent(a)) continue;
    uint8_t id = 0;
    tempAddr = a;
    i2cReadReg(a, 0xD0, &id, 1);
    if (id == 0x60) tempChip = CHIP_BME280;
    else if (id == 0x58 || id == 0x56 || id == 0x57) tempChip = CHIP_BMP280;
    else continue;
    if (bmeInit(tempChip == CHIP_BME280)) return true;
    tempChip = CHIP_NONE;
  }
  if (i2cPresent(0x40)) {
    tempAddr = 0x40;
    uint8_t rst = 0xFE;                                 // soft reset
    i2cWrite(tempAddr, &rst, 1);
    delay(20);
    tempChip = CHIP_HTU21;
    return true;
  }
  return false;
}

bool isReservedPin(int p) {
  return p == LED_LIGHT_PIN || p == LED_FAN_PIN || p == LED_AC_PIN || p == LIGHT_PIN;
}

void printFound() {
  Serial.printf("[I2C] Cảm biến nhiệt độ: %s, địa chỉ 0x%02X, SDA=GPIO%d, SCL=GPIO%d\n",
                chipName(tempChip), tempAddr, i2cSda, i2cScl);
}

// Tìm cảm biến: chân đã khai báo -> đảo SDA/SCL -> (ESP32-C3) dò các chân có điện trở kéo lên bên ngoài
void detectTempSensor() {
  startI2C(I2C_SDA_PIN, I2C_SCL_PIN);
  if (identifyChip()) { printFound(); return; }

  startI2C(I2C_SCL_PIN, I2C_SDA_PIN);
  if (identifyChip()) {
    Serial.printf("[I2C] Dây SDA/SCL đang cắm NGƯỢC so với khai báo — code vẫn chạy được.\n");
    printFound();
    return;
  }

#if defined(CONFIG_IDF_TARGET_ESP32C3)
  const int cand[] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21};
  int pulled[13];
  int n = 0;
  Wire.end();
  for (int p : cand) {
    if (isReservedPin(p)) continue;
    pinMode(p, INPUT_PULLDOWN);
    delay(2);
    if (digitalRead(p) == HIGH) pulled[n++] = p;        // module I2C có điện trở kéo lên -> chân đọc HIGH
    pinMode(p, INPUT);
  }
  for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
      if (i == j) continue;
      startI2C(pulled[i], pulled[j]);
      if (identifyChip()) {
        Serial.printf("[I2C] Cảm biến đang cắm ở chân KHÁC khai báo. Nên sửa I2C_SDA_PIN=%d, I2C_SCL_PIN=%d ở đầu code.\n", i2cSda, i2cScl);
        printFound();
        return;
      }
    }
  }
#endif

  startI2C(I2C_SDA_PIN, I2C_SCL_PIN);
  Serial.printf("[I2C] KHÔNG tìm thấy cảm biến nhiệt độ (SDA=GPIO%d, SCL=GPIO%d). Kiểm tra dây VCC (3V3), GND, SDA, SCL. Thử lại sau 10 giây.\n",
                I2C_SDA_PIN, I2C_SCL_PIN);
}

bool readTempHum(float& t, float& h) {
  h = NAN;
  switch (tempChip) {
    case CHIP_AHT:    return ahtRead(t, h);
    case CHIP_SHT3X:  return sht3xRead(t, h);
    case CHIP_HTU21:  return htu21Read(t, h);
    case CHIP_BME280:
    case CHIP_BMP280: return bmeRead(t, h);
    default:          return false;
  }
}

// ======================================================================================
// 2. CẢM BIẾN ÁNH SÁNG TEMT6000 (analog)
// ======================================================================================
// TEMT6000 là phototransistor nối với điện trở 10kΩ trên module: I(µA) = U(mV) / 10.
// Theo datasheet, khoảng 2 lux cho mỗi µA  =>  lux ≈ 0.2 × U(mV). Đây là giá trị ƯỚC TÍNH, đủ để so sánh
// sáng/tối; module bão hoà quanh ~650 lux khi điện áp ra chạm 3.3V.
float readLux() {
  const int SAMPLES = 10;
  float mv = 0;
#if defined(ESP32)
  for (int i = 0; i < SAMPLES; i++) { mv += analogReadMilliVolts(LIGHT_PIN); delay(2); }
  mv /= SAMPLES;
#else
  for (int i = 0; i < SAMPLES; i++) { mv += analogRead(LIGHT_PIN); delay(2); }
  mv = mv / SAMPLES * 3300.0f / 1023.0f;   // NodeMCU: A0 có cầu chia áp, 0..1023 tương ứng 0..3.3V
#endif
  return mv * 0.2f;
}

// ======================================================================================
// 3. WI-FI / MQTT
// ======================================================================================
void setupWifi() {
  Serial.printf("\n[WIFI] Đang kết nối tới %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
#if defined(CONFIG_IDF_TARGET_ESP32C3)
  // Nhiều board ESP32-C3 Super Mini có anten kém: phát công suất tối đa lại KHÔNG vào được Wi-Fi.
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
#endif
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.printf("\n[WIFI] Đã kết nối! IP: %s\n", WiFi.localIP().toString().c_str());
}

String buildClientId() {
#if defined(ESP32)
  uint32_t chipId = (uint32_t)(ESP.getEfuseMac() & 0xFFFFFF);
#else
  uint32_t chipId = ESP.getChipId();
#endif
  char buf[16];
  snprintf(buf, sizeof(buf), "%06X", (unsigned int)chipId);
  return String(MQTT_CLIENT_PREFIX) + buf;
}

int pinForDevice(int deviceId) {
  if (deviceId == DEVICE_ID_LIGHT) return LED_LIGHT_PIN;
  if (deviceId == DEVICE_ID_FAN)   return LED_FAN_PIN;
  if (deviceId == DEVICE_ID_AC)    return LED_AC_PIN;
  return -1;
}

void publishStatus(int deviceId, bool isOn) {
  char topic[40];
  snprintf(topic, sizeof(topic), "home/device/%d/status", deviceId);
  StaticJsonDocument<128> doc;
  doc["device_id"] = deviceId;
  doc["state"] = isOn ? "ON" : "OFF";
  char payload[128];
  serializeJson(doc, payload);
  mqttClient.publish(topic, payload);
  Serial.printf("[MQTT] Publish %s -> %s\n", topic, payload);
}

void publishSensor(int sensorId, const char* type, float value, const char* unit) {
  char topic[40];
  snprintf(topic, sizeof(topic), "home/sensor/%d/data", sensorId);
  StaticJsonDocument<160> doc;
  doc["sensor_id"] = sensorId;
  doc["type"] = type;
  doc["value"] = roundf(value * 10) / 10.0f;   // làm tròn 1 chữ số thập phân
  doc["unit"] = unit;
  char payload[160];
  serializeJson(doc, payload);
  mqttClient.publish(topic, payload);
}

// Xử lý khi nhận được lệnh điều khiển từ Backend (topic home/device/{id}/set)
void onMqttMessage(char* topic, byte* payloadRaw, unsigned int length) {
  String topicStr = String(topic);
  String payload;
  for (unsigned int i = 0; i < length; i++) payload += (char)payloadRaw[i];
  Serial.printf("[MQTT] Nhận: %s -> %s\n", topicStr.c_str(), payload.c_str());

  int idStart = topicStr.indexOf("device/") + 7;
  int idEnd   = topicStr.indexOf("/set");
  if (idStart < 7 || idEnd < 0) return;
  int deviceId = topicStr.substring(idStart, idEnd).toInt();

  // Payload có thể là JSON {"action":"ON"} hoặc chuỗi thô "ON"/"OFF"
  String action = payload;
  StaticJsonDocument<128> doc;
  if (deserializeJson(doc, payload) == DeserializationError::Ok && doc["action"].is<const char*>()) {
    action = doc["action"].as<const char*>();
  }
  action.trim();
  action.toUpperCase();

  int pin = pinForDevice(deviceId);
  if (pin == -1) {
    Serial.printf("[WARN] device_id %d không hợp lệ\n", deviceId);
    return;
  }
  if (action != "ON" && action != "OFF") {
    Serial.printf("[WARN] Lệnh không hợp lệ '%s' -> bỏ qua\n", action.c_str());
    return;
  }

  bool turnOn = (action == "ON");
  digitalWrite(pin, turnOn ? HIGH : LOW);   // <-- điều khiển LED thật
  deviceState[deviceId] = turnOn;
  Serial.printf("[LED] device_id=%d -> %s\n", deviceId, turnOn ? "ON" : "OFF");
  publishStatus(deviceId, turnOn);          // phản hồi trạng thái thật về Backend
}

void reconnectMqtt() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Đang kết nối broker...");
    if (mqttClient.connect(mqttClientId.c_str())) {
      Serial.printf(" OK (clientId=%s)\n", mqttClientId.c_str());
      mqttClient.subscribe("home/device/1/set");
      mqttClient.subscribe("home/device/2/set");
      mqttClient.subscribe("home/device/3/set");
      Serial.println("[MQTT] Đã subscribe home/device/{1,2,3}/set");
      // Mỗi lần (re)connect: báo trạng thái hiện tại của cả 3 LED để Backend đồng bộ lại
      publishStatus(DEVICE_ID_LIGHT, deviceState[DEVICE_ID_LIGHT]);
      publishStatus(DEVICE_ID_FAN,   deviceState[DEVICE_ID_FAN]);
      publishStatus(DEVICE_ID_AC,    deviceState[DEVICE_ID_AC]);
    } else {
      Serial.printf(" thất bại, rc=%d. Thử lại sau 2s\n", mqttClient.state());
      delay(2000);
    }
  }
}

void readAndPublishSensors() {
  float lux = readLux();
  publishSensor(SENSOR_ID_LUX, "light_intensity", lux, "lux");

  float t, h;
  if (tempChip == CHIP_NONE || !readTempHum(t, h)) {
    Serial.printf("[SENSOR] Không đọc được cảm biến nhiệt độ | light=%.0f lux -> đã publish ánh sáng\n", lux);
    return;
  }
  publishSensor(SENSOR_ID_TEMP, "temperature", t, "°C");
  if (!isnan(h)) {
    publishSensor(SENSOR_ID_HUM, "humidity", h, "%");
    Serial.printf("[SENSOR] temp=%.1f°C humidity=%.0f%% light=%.0f lux -> đã publish MQTT\n", t, h, lux);
  } else {
    Serial.printf("[SENSOR] temp=%.1f°C (chip không đo độ ẩm) light=%.0f lux -> đã publish MQTT\n", t, lux);
  }
}

// ======================================================================================
void setup() {
  Serial.begin(115200);
  delay(1500);   // chờ cổng USB ổn định (ESP32-C3 dùng USB trực tiếp), để không mất các dòng log đầu
  Serial.printf("\n[BOARD] %s | LED Den=GPIO%d, Quat=GPIO%d, Dieu hoa=GPIO%d | I2C SDA=GPIO%d, SCL=GPIO%d | TEMT6000=GPIO%d\n",
                BOARD_NAME, LED_LIGHT_PIN, LED_FAN_PIN, LED_AC_PIN, I2C_SDA_PIN, I2C_SCL_PIN, LIGHT_PIN);

  pinMode(LED_LIGHT_PIN, OUTPUT);
  pinMode(LED_FAN_PIN, OUTPUT);
  pinMode(LED_AC_PIN, OUTPUT);
  digitalWrite(LED_LIGHT_PIN, LOW);
  digitalWrite(LED_FAN_PIN, LOW);
  digitalWrite(LED_AC_PIN, LOW);

  detectTempSensor();
  lastDetectTry = millis();
  Serial.printf("[TEMT6000] Ánh sáng hiện tại ~%.0f lux (che tay lên cảm biến, số này phải giảm mạnh)\n", readLux());

  setupWifi();
  mqttClientId = buildClientId();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWifi();
  }
  if (!mqttClient.connected()) {
    reconnectMqtt();
  }
  mqttClient.loop();

  unsigned long now = millis();
  // Chưa thấy cảm biến nhiệt độ (vd lỏng dây lúc khởi động) -> cứ 10 giây thử nhận diện lại một lần
  if (tempChip == CHIP_NONE && now - lastDetectTry >= 10000) {
    lastDetectTry = now;
    detectTempSensor();
  }
  if (now - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = now;
    readAndPublishSensors();
  }
}
