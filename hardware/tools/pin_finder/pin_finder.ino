/*
 * PIN FINDER — sketch chẩn đoán cho ESP32-C3 Super Mini
 * ------------------------------------------------------
 * Dùng khi đã lắp mạch nhưng chưa chắc từng linh kiện đang cắm vào GPIO nào.
 * Sketch KHÔNG dùng Wi-Fi/MQTT, chỉ in kết quả ra Serial Monitor (115200 baud):
 *   Bước 1: tìm các chân có điện trở kéo lên bên ngoài (dấu hiệu dây SDA/SCL của module I2C)
 *   Bước 2: quét I2C trên các cặp chân đó -> in địa chỉ + đoán tên cảm biến
 *   Bước 3: đọc analog GPIO0..GPIO5 trong 10 giây -> lấy tay che cảm biến ánh sáng, chân nào đổi giá trị là chân OUT
 *   Bước 4: lần lượt bật từng GPIO trong 2 giây -> ghi lại LED nào sáng ở GPIO nào
 *
 * Arduino IDE: board "ESP32C3 Dev Module", Tools -> USB CDC On Boot -> Enabled.
 * Bấm nút RST trên board để chạy lại từ đầu.
 */
#include <Wire.h>

const int PINS[] = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 21};   // các GPIO có chân cắm trên Super Mini
const int N = sizeof(PINS) / sizeof(PINS[0]);
const int ADC_PINS[] = {0, 1, 2, 3, 4, 5};
const int NADC = sizeof(ADC_PINS) / sizeof(ADC_PINS[0]);

bool pulledUp[22];
bool usedByI2C[22];

const char* guessChip(uint8_t a) {
  switch (a) {
    case 0x23: case 0x5C: return "BH1750 (cảm biến ánh sáng)";
    case 0x38: return "AHT10 / AHT20 / AHT21 (nhiệt độ + độ ẩm)";
    case 0x40: return "HTU21D / SHT21 / Si7021 (nhiệt độ + độ ẩm)";
    case 0x44: case 0x45: return "SHT30 / SHT31 / SHT35 (nhiệt độ + độ ẩm)";
    case 0x76: case 0x77: return "BMP280 / BME280 (áp suất + nhiệt độ; BME280 có thêm độ ẩm)";
    case 0x10: return "VEML7700 (ánh sáng)";
    case 0x29: case 0x39: case 0x49: return "TSL2561 / TSL2591 (ánh sáng)";
    case 0x3C: case 0x3D: return "màn hình OLED SSD1306";
    default: return "chưa rõ — gửi địa chỉ này cho Claude";
  }
}

int scanPair(int sda, int scl) {
  int found = 0;
  if (!Wire.begin(sda, scl, 100000)) return 0;
  Wire.setTimeOut(20);
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.printf("   -> THẤY thiết bị I2C địa chỉ 0x%02X với SDA=GPIO%d, SCL=GPIO%d : %s\n", a, sda, scl, guessChip(a));
      usedByI2C[sda] = usedByI2C[scl] = true;
      found++;
    }
  }
  Wire.end();
  pinMode(sda, INPUT);
  pinMode(scl, INPUT);
  return found;
}

void setup() {
  Serial.begin(115200);
  delay(2500);
  Serial.println("\n================ PIN FINDER — ESP32-C3 Super Mini ================");

  // ---- Bước 1: chân nào bị kéo lên từ bên ngoài? ----
  Serial.println("\n[BƯỚC 1] Chân có điện trở kéo lên bên ngoài (thường là SDA/SCL của module I2C):");
  int cand[22]; int nc = 0;
  for (int i = 0; i < N; i++) {
    int p = PINS[i];
    pinMode(p, INPUT_PULLDOWN);
    delay(5);
    pulledUp[p] = (digitalRead(p) == HIGH);
    pinMode(p, INPUT);
    if (pulledUp[p]) { cand[nc++] = p; Serial.printf("   GPIO%d\n", p); }
  }
  if (nc == 0) Serial.println("   (không có chân nào)");

  // ---- Bước 2: quét I2C ----
  Serial.println("\n[BƯỚC 2] Quét I2C trên các cặp chân ứng viên (+ cặp mặc định SDA=8, SCL=9):");
  int total = 0;
  for (int i = 0; i < nc; i++)
    for (int j = 0; j < nc; j++)
      if (i != j) total += scanPair(cand[i], cand[j]);
  if (!(pulledUp[8] && pulledUp[9])) total += scanPair(8, 9);
  if (total == 0) Serial.println("   Không thấy thiết bị I2C nào (module có thể là loại analog/digital 1 dây, hoặc sai dây VCC/GND).");

  // ---- Bước 3: analog ----
  Serial.println("\n[BƯỚC 3] Đọc analog GPIO0..GPIO5 trong 10 giây (0..4095).");
  Serial.println("         -> TỪ GIÂY THỨ 3 ĐẾN GIÂY THỨ 7: lấy tay CHE KÍN cảm biến ánh sáng, sau đó bỏ tay ra.");
  Serial.println("         Chân nào có giá trị thay đổi mạnh khi che tay chính là chân OUT của cảm biến ánh sáng.");
  for (int t = 0; t < 20; t++) {
    Serial.printf("   t=%4.1fs |", t * 0.5);
    for (int k = 0; k < NADC; k++) {
      int p = ADC_PINS[k];
      if (usedByI2C[p]) { Serial.printf(" G%d=  I2C |", p); continue; }
      Serial.printf(" G%d=%4d |", p, analogRead(p));
    }
    Serial.println(t >= 6 && t < 14 ? "  <- đang che" : "");
    delay(500);
  }

  // ---- Bước 4: tìm LED ----
  Serial.println("\n[BƯỚC 4] Lần lượt bật từng GPIO trong 2 giây — hãy nhìn và GHI LẠI LED nào sáng ở GPIO nào:");
  for (int i = 0; i < N; i++) {
    int p = PINS[i];
    if (usedByI2C[p]) { Serial.printf("   GPIO%-2d : bỏ qua (đang là dây I2C)\n", p); continue; }
    pinMode(p, OUTPUT);
    digitalWrite(p, HIGH);
    Serial.printf("   GPIO%-2d : đang BẬT ... LED nào sáng?\n", p);
    delay(2000);
    digitalWrite(p, LOW);
    pinMode(p, INPUT);
    delay(400);
  }
  Serial.println("\n================ XONG — copy toàn bộ log này gửi cho Claude, kèm ghi chú LED nào sáng ở GPIO nào ================");
  Serial.println("Bấm nút RST để chạy lại.");
}

void loop() {}
