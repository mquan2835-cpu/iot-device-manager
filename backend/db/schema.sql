-- Schema cho đồ án IOT - Bài 1 (chi tiết giải thích xem docs/database-design.md)
CREATE DATABASE IF NOT EXISTS iot_device_manager
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE iot_device_manager;

CREATE TABLE IF NOT EXISTS `User` (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Device` (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    device_type         ENUM('light', 'fan', 'air_conditioner') NOT NULL,
    location            VARCHAR(100) DEFAULT NULL,
    mqtt_topic_control  VARCHAR(150) NOT NULL,
    mqtt_topic_status   VARCHAR(150) NOT NULL,
    current_state       ENUM('ON', 'OFF') NOT NULL DEFAULT 'OFF',
    user_id             INT NOT NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `Sensor` (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    sensor_type     ENUM('temperature', 'humidity', 'light_intensity') NOT NULL,
    unit            VARCHAR(20) NOT NULL,
    mqtt_topic      VARCHAR(150) NOT NULL,
    location        VARCHAR(100) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `DataSensor` (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    sensor_id       INT NOT NULL,
    value           FLOAT NOT NULL,
    recorded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_datasensor_sensor FOREIGN KEY (sensor_id) REFERENCES `Sensor`(id) ON DELETE CASCADE,
    INDEX idx_sensor_time (sensor_id, recorded_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `ActionHistory` (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    device_id       INT NOT NULL,
    user_id         INT NOT NULL,
    action          ENUM('ON', 'OFF') NOT NULL,
    triggered_by    ENUM('user', 'system') NOT NULL DEFAULT 'user',
    status          ENUM('pending', 'success', 'failed', 'timeout') NOT NULL DEFAULT 'pending',
    triggered_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at    DATETIME DEFAULT NULL,
    CONSTRAINT fk_action_device FOREIGN KEY (device_id) REFERENCES `Device`(id) ON DELETE CASCADE,
    CONSTRAINT fk_action_user FOREIGN KEY (user_id) REFERENCES `User`(id) ON DELETE CASCADE,
    INDEX idx_device_time (device_id, triggered_at)
) ENGINE=InnoDB;

-- Seed dữ liệu mẫu: 1 user + 3 "đèn LED" đóng vai Đèn/Quạt/Điều hòa + 3 cảm biến
-- Mật khẩu mặc định: 123456  (hash bcrypt, cost 10)
-- Dùng INSERT IGNORE + id cố định: import lại file này nhiều lần cũng không bị lỗi trùng.
INSERT IGNORE INTO `User` (id, full_name, email, password_hash, role)
VALUES (1, 'Đỗ Minh Quân', 'quan@example.com', '$2a$10$dkvqro.ch2g8.0tkhgRkueeWP.x4IuN41hV9cz8Qk9Yu7ZcDA3YRG', 'admin');
-- Nếu tài khoản đã có từ lần import trước (hash cũ bị sai) thì đặt lại mật khẩu về 123456
UPDATE `User` SET password_hash = '$2a$10$dkvqro.ch2g8.0tkhgRkueeWP.x4IuN41hV9cz8Qk9Yu7ZcDA3YRG' WHERE id = 1 AND email = 'quan@example.com';

INSERT IGNORE INTO `Device` (id, name, device_type, location, mqtt_topic_control, mqtt_topic_status, user_id)
VALUES
(1, 'Đèn phòng khách',    'light',           'Phòng khách', 'home/device/1/set', 'home/device/1/status', 1),
(2, 'Quạt phòng khách',   'fan',             'Phòng khách', 'home/device/2/set', 'home/device/2/status', 1),
(3, 'Điều hòa phòng ngủ', 'air_conditioner', 'Phòng ngủ',   'home/device/3/set', 'home/device/3/status', 1);

INSERT IGNORE INTO `Sensor` (id, name, sensor_type, unit, mqtt_topic, location)
VALUES
(1, 'Cảm biến nhiệt độ', 'temperature',     '°C',  'home/sensor/data', 'Phòng khách'),
(2, 'Cảm biến độ ẩm',    'humidity',        '%',   'home/sensor/data', 'Phòng khách'),
(3, 'Cảm biến ánh sáng', 'light_intensity', 'lux', 'home/sensor/data', 'Phòng khách');
