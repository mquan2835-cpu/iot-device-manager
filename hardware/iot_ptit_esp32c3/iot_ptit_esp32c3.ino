#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// 1. Cau hinh WiFi & MQTT Broker
const char* ssid = "TEN_WIFI";          
const char* password = "MAT_KHAU_WIFI";  
const char* mqtt_server = "broker.hivemq.com";  
const int mqtt_port = 1883;

// Cac Topic MQTT
const char* TOPIC_DATA_SENSOR     = "iot_ptit/data_sensor";
const char* TOPIC_DEVICE_CONTROL  = "iot_ptit/device_control";
const char* TOPIC_DEVICE_RESPONSE = "iot_ptit/device_response";
const char* TOPIC_DEVICE_SYNC     = "iot_ptit/device_sync";

// 2. Cau hinh chan phan cung theo dung so do mach
#define LDRPIN     A0
#define DHTPIN     D2
#define DHTTYPE    DHT11
#define LED_TEMP   D5   // Device ID 1: LED Nhiet do
#define LED_HUM    D6   // Device ID 2: LED Do am
#define LED_LIGHT  D7   // Device ID 3: LED Anh sang

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSensorTime = 0;

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.print("[MQTT Inbound] Payload: ");
  Serial.println(message);

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, message);
  if (err) {
    Serial.println("[Error] JSON parse failed");
    return;
  }

  int deviceId = doc["deviceId"];
  String action = doc["action"];

  int targetPin = -1;
  if (deviceId == 1) targetPin = LED_TEMP;
  else if (deviceId == 2) targetPin = LED_HUM;
  else if (deviceId == 3) targetPin = LED_LIGHT;

  // Thuc hien bat/tat chan GPIO tuong ung
  if (targetPin != -1) {
    int pinState = (action == "ON") ? HIGH : LOW;
    digitalWrite(targetPin, pinState);
    Serial.printf("[Control] Device %d set to %s (Pin %d)\n", deviceId, action.c_str(), targetPin);

    StaticJsonDocument<200> resDoc;
    resDoc["deviceId"] = deviceId;
    resDoc["action"] = action;
    resDoc["status"] = "SUCCESS";

    char resBuffer[200];
    serializeJson(resDoc, resBuffer);
    client.publish(TOPIC_DEVICE_RESPONSE, resBuffer);
    Serial.println("[MQTT Outbound] Published ACK response");
  }
}

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("[WiFi] Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected! IP: ");
  Serial.println(WiFi.localIP());
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("[MQTT] Connecting Broker...");
    String clientId = "ESP8266Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println(" Success!");
      // Dang ky nhan lenh dieu khien tu topic control
      client.subscribe(TOPIC_DEVICE_CONTROL);
      Serial.print("[MQTT] Subscribed to: ");
      Serial.println(TOPIC_DEVICE_CONTROL);

      // SỬA: Gửi gói tin báo Server đồng bộ lại trạng thái khi vừa cắm nguồn
      client.publish(TOPIC_DEVICE_SYNC, "{\"status\"😕"BOOT\"}");
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(client.state());
      Serial.println(" -> Retrying in 2 seconds...");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Khoi tao cac chan LED la OUTPUT va tat mac dinh
  pinMode(LED_TEMP, OUTPUT);
  pinMode(LED_HUM, OUTPUT);
  pinMode(LED_LIGHT, OUTPUT);

  digitalWrite(LED_TEMP, LOW);
  digitalWrite(LED_HUM, LOW);
  digitalWrite(LED_LIGHT, LOW);

  dht.begin();
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback); // Gan ham callback xu ly bat tat thiet bi
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop(); // Giu ket noi va lang nghe lenh dieu khien lien tuc

  unsigned long now = millis();
  if (now - lastSensorTime > 2000) {
    lastSensorTime = now;

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    int lightRaw = analogRead(LDRPIN);

    if (isnan(temp)) temp = 0.0;
    if (isnan(hum)) hum = 0.0;

    StaticJsonDocument<256> doc;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["light"] = lightRaw;

    char buffer[256];
    serializeJson(doc, buffer);
    client.publish(TOPIC_DATA_SENSOR, buffer);

    Serial.printf("[Sensor 2s] Temp: %.1f C | Hum: %.1f %% | Light: %d\n", temp, hum, lightRaw);
  }
}