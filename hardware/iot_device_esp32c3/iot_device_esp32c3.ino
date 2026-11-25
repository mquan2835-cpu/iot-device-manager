#include <WiFi.h>
#include <Wire.h>
#include <PubSubClient.h>

const char* ssid        = "TEN_WIFI";
const char* password    = "MAT_KHAU_WIFI";        
const char* mqtt_server = "172.20.10.3";   
const int   mqtt_port   = 1999;               
const char* mqtt_user   = "Do Minh Quan";             
const char* mqtt_pass   = "MAT_KHAU_MQTT";        

#define DEN       3     
#define QUAT      4     
#define DIEU_HOA  7     
#define ANH_SANG  0     
#define SDA_PIN   8     
#define SCL_PIN   9     

WiFiClient espClient;
PubSubClient client(espClient);

bool denBat = false;          
bool quatBat = false;
bool dieuHoaBat = false;

unsigned long lanGuiTruoc = 0;

void batDauCamBien();
bool docNhietDoDoAm(float& nhietDo, float& doAm);

void guiTrangThai(int id, bool bat) {
  String topic   = "home/device/" + String(id) + "/status";
  String payload = "{\"device_id\":" + String(id) + ",\"state\":\"" + (bat ? "ON" : "OFF") + "\"}";
  client.publish(topic.c_str(), payload.c_str());
  Serial.println("Gui: " + topic + " " + payload);
}

void dieuKhien(int id, bool bat) {
  if (id == 1) { digitalWrite(DEN, bat);      denBat = bat; }
  if (id == 2) { digitalWrite(QUAT, bat);     quatBat = bat; }
  if (id == 3) { digitalWrite(DIEU_HOA, bat); dieuHoaBat = bat; }
  guiTrangThai(id, bat);
}

void baoLoi(String loi, String topic) {
  Serial.println(loi);
  String payload = "{\"error\":\"" + loi + "\",\"topic\":\"" + topic + "\"}";
  client.publish("home/device/error", payload.c_str());
}

void nhanLenh(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("Nhan: " + t + " " + msg);

  String lenh = msg;            
  lenh.replace("action", "");   
  lenh.toUpperCase();           

  bool bat;
  if (lenh.indexOf("\"ON\"") >= 0)       bat = true;    
  else if (lenh.indexOf("\"OFF\"") >= 0) bat = false;  
  else {
    baoLoi("Lenh khong hop le, hay nhap lai!", t);
    return;
  }

  if (t == "home/device/1/set")      dieuKhien(1, bat);
  else if (t == "home/device/2/set") dieuKhien(2, bat);
  else if (t == "home/device/3/set") dieuKhien(3, bat);
  else if (t == "home/device/multi/set") {
    
    int viTri = lenh.indexOf("DEVICES");             
    if (viTri < 0) {
      baoLoi("Thieu danh sach devices!", t);
      return;
    }
    String ds = lenh.substring(viTri);             
    bool tatCa = ds.indexOf("ALL") >= 0;           
    int soThietBi = 0;
    if (tatCa || ds.indexOf("1") >= 0) { dieuKhien(1, bat); soThietBi++; }
    if (tatCa || ds.indexOf("2") >= 0) { dieuKhien(2, bat); soThietBi++; }
    if (tatCa || ds.indexOf("3") >= 0) { dieuKhien(3, bat); soThietBi++; }
    if (soThietBi == 0) baoLoi("Khong co thiet bi hop le trong devices!", t);
  }
  else {
    baoLoi("Thiet bi khong ton tai!", t);
    return;
  }
}


void ketNoiMQTT() {
  Serial.print("Ket noi MQTT... ");
  String clientId = "esp32c3-" + String(random(0xffff), HEX);   
  if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
    Serial.println("OK");
    client.subscribe("home/device/+/set");         
    guiTrangThai(1, denBat);                         
    guiTrangThai(2, quatBat);
    guiTrangThai(3, dieuHoaBat);
  } else {
    int rc = client.state();                        
    Serial.print("LOI rc=");
    Serial.print(rc);
    if (rc == -2)     Serial.print(" -> khong toi duoc Broker (sai IP/cong, Broker chua chay, tuong lua chan, khac mang Wi-Fi)");
    else if (rc == -4) Serial.print(" -> Broker khong tra loi (het thoi gian cho)");
    else if (rc == 4)  Serial.print(" -> SAI user hoac password");
    else if (rc == 5)  Serial.print(" -> KHONG DUOC PHEP (thieu/sai tai khoan)");
    Serial.println(". Thu lai sau 3 giay");
    Serial.print("   (Broker: "); Serial.print(mqtt_server); Serial.print(":"); Serial.print(mqtt_port);
    Serial.print(" | IP board: "); Serial.print(WiFi.localIP()); Serial.println(")");
    delay(3000);
  }
}

void guiCamBien() {
  float nhietDo, doAm;
  bool docDuoc = docNhietDoDoAm(nhietDo, doAm);          
  int lux = analogReadMilliVolts(ANH_SANG) * 0.2;         

  String payload = "{";
  if (docDuoc)                  payload += "\"temperature\":" + String(nhietDo, 1) + ",";
  if (docDuoc && !isnan(doAm))  payload += "\"humidity\":" + String(doAm, 1) + ",";
  payload += "\"light\":" + String(lux) + "}";

  client.publish("home/sensor/data", payload.c_str());
  Serial.println("Gui: home/sensor/data " + payload);
}

void setup() {
  Serial.begin(115200);
  delay(1500);

  pinMode(DEN, OUTPUT);
  pinMode(QUAT, OUTPUT);
  pinMode(DIEU_HOA, OUTPUT);

  batDauCamBien();                                 

  WiFi.begin(ssid, password);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);              
  WiFi.setSleep(false);              
  Serial.print("Ket noi Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");

  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(nhanLenh);                   
}

void loop() {
  if (!client.connected()) ketNoiMQTT();           
  client.loop();                                  

  if (millis() - lanGuiTruoc >= 5000) {            
    lanGuiTruoc = millis();
    guiCamBien();
  }
}

uint8_t chipAddr = 0;
char    chipType = 0;   
uint16_t T1; int16_t T2, T3; uint8_t H1, H3; int16_t H2, H4, H5; int8_t H6;

bool i2cHas(uint8_t a) { Wire.beginTransmission(a); return Wire.endTransmission() == 0; }
bool i2cCmd(uint8_t a, uint8_t b0, int b1 = -1, int b2 = -1) {
  Wire.beginTransmission(a); Wire.write(b0);
  if (b1 >= 0) Wire.write((uint8_t)b1);
  if (b2 >= 0) Wire.write((uint8_t)b2);
  return Wire.endTransmission() == 0;
}
bool i2cGet(uint8_t a, uint8_t* buf, int n) {
  if (Wire.requestFrom((int)a, n) != n) return false;
  for (int i = 0; i < n; i++) buf[i] = Wire.read();
  return true;
}
bool regGet(uint8_t a, uint8_t reg, uint8_t* buf, int n) {
  Wire.beginTransmission(a); Wire.write(reg);
  if (Wire.endTransmission(false) != 0) return false;
  return i2cGet(a, buf, n);
}

void batDauCamBien() {
  Wire.begin(SDA_PIN, SCL_PIN);
  if (i2cHas(0x38)) {
    chipAddr = 0x38; chipType = 'A';
    delay(40);
    uint8_t st = 0;
    i2cGet(chipAddr, &st, 1);
    if (!(st & 0x08) && !i2cCmd(chipAddr, 0xBE, 0x08, 0x00)) i2cCmd(chipAddr, 0xE1, 0x08, 0x00);
  } else if (i2cHas(0x44) || i2cHas(0x45)) {
    chipAddr = i2cHas(0x44) ? 0x44 : 0x45; chipType = 'S';
  } else if (i2cHas(0x76) || i2cHas(0x77)) {
    chipAddr = i2cHas(0x76) ? 0x76 : 0x77;
    uint8_t id = 0, c[24], h[7];
    regGet(chipAddr, 0xD0, &id, 1);
    chipType = (id == 0x60) ? 'B' : 'P';
    regGet(chipAddr, 0x88, c, 24);
    T1 = c[0] | (c[1] << 8); T2 = c[2] | (c[3] << 8); T3 = c[4] | (c[5] << 8);
    if (chipType == 'B') {
      regGet(chipAddr, 0xA1, &H1, 1);
      regGet(chipAddr, 0xE1, h, 7);
      H2 = h[0] | (h[1] << 8); H3 = h[2];
      H4 = ((int8_t)h[3] << 4) | (h[4] & 0x0F);
      H5 = ((int8_t)h[5] << 4) | (h[4] >> 4);
      H6 = (int8_t)h[6];
      i2cCmd(chipAddr, 0xF2, 0x01);
    }
    i2cCmd(chipAddr, 0xF4, 0x27);
  } else if (i2cHas(0x40)) {
    chipAddr = 0x40; chipType = 'H';
    i2cCmd(chipAddr, 0xFE);
    delay(20);
  }
  const char* name = chipType == 'A' ? "AHT10/AHT20" : chipType == 'S' ? "SHT3x" : chipType == 'H' ? "HTU21D/SHT21" :
                     chipType == 'B' ? "BME280" : chipType == 'P' ? "BMP280 (khong do do am)" : "KHONG TIM THAY - kiem tra day SDA/SCL/VCC/GND";
  Serial.printf("[I2C] Cam bien nhiet do: %s (dia chi 0x%02X, SDA=GPIO%d, SCL=GPIO%d)\n", name, chipAddr, SDA_PIN, SCL_PIN);
}

bool docNhietDoDoAm(float& temp, float& hum) {
  uint8_t b[8];
  hum = NAN;   
  if (chipType == 'A') {
    if (!i2cCmd(chipAddr, 0xAC, 0x33, 0x00)) return false;
    delay(80);
    if (!i2cGet(chipAddr, b, 6) || (b[0] & 0x80)) return false;
    hum  = (((uint32_t)b[1] << 12) | ((uint32_t)b[2] << 4) | (b[3] >> 4)) * 100.0f / 1048576.0f;
    temp = ((((uint32_t)b[3] & 0x0F) << 16) | ((uint32_t)b[4] << 8) | b[5]) * 200.0f / 1048576.0f - 50.0f;
    return true;
  }
  if (chipType == 'S') {
    if (!i2cCmd(chipAddr, 0x24, 0x00)) return false;
    delay(20);
    if (!i2cGet(chipAddr, b, 6)) return false;
    temp = -45.0f + 175.0f * ((b[0] << 8) | b[1]) / 65535.0f;
    hum  = 100.0f * ((b[3] << 8) | b[4]) / 65535.0f;
    return true;
  }
  if (chipType == 'H') {
    if (!i2cCmd(chipAddr, 0xF3)) return false;
    delay(55);
    if (!i2cGet(chipAddr, b, 3)) return false;
    temp = -46.85f + 175.72f * (((b[0] << 8) | b[1]) & 0xFFFC) / 65536.0f;
    if (!i2cCmd(chipAddr, 0xF5)) return false;
    delay(20);
    if (!i2cGet(chipAddr, b, 3)) return false;
    hum = constrain(-6.0f + 125.0f * (((b[0] << 8) | b[1]) & 0xFFFC) / 65536.0f, 0.0f, 100.0f);
    return true;
  }
  if (chipType == 'B' || chipType == 'P') {
    if (!regGet(chipAddr, 0xF7, b, 8)) return false;
    int32_t adcT = ((int32_t)b[3] << 12) | ((int32_t)b[4] << 4) | (b[5] >> 4);
    int32_t adcH = ((int32_t)b[6] << 8) | b[7];
    int32_t v1 = ((((adcT >> 3) - ((int32_t)T1 << 1))) * ((int32_t)T2)) >> 11;
    int32_t v2 = (((((adcT >> 4) - ((int32_t)T1)) * ((adcT >> 4) - ((int32_t)T1))) >> 12) * ((int32_t)T3)) >> 14;
    int32_t tFine = v1 + v2;
    temp = ((tFine * 5 + 128) >> 8) / 100.0f;
    if (chipType == 'P') return true;
    int32_t v = tFine - 76800;
    v = (((((adcH << 14) - (((int32_t)H4) << 20) - (((int32_t)H5) * v)) + 16384) >> 15) *
         (((((((v * ((int32_t)H6)) >> 10) * (((v * ((int32_t)H3)) >> 11) + 32768)) >> 10) + 2097152) * ((int32_t)H2) + 8192) >> 14));
    v = v - (((((v >> 15) * (v >> 15)) >> 7) * ((int32_t)H1)) >> 4);
    v = v < 0 ? 0 : (v > 419430400 ? 419430400 : v);
    hum = (uint32_t)(v >> 12) / 1024.0f;
    return true;
  }
  return false;  
}
