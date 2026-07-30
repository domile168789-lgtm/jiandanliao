CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  phone VARCHAR(32) NOT NULL UNIQUE,
  nickname VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS user_credentials (
  user_id VARCHAR(64) PRIMARY KEY,
  password_hash VARCHAR(255) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_devices (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  platform VARCHAR(32) NOT NULL,
  device_id VARCHAR(128) NOT NULL,
  refresh_token VARCHAR(512) NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uniq_user_device (user_id, device_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(16) NOT NULL,
  title VARCHAR(128) NULL,
  last_message VARCHAR(256) NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS conversation_members (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'MEMBER',
  joined_at DATETIME NOT NULL,
  UNIQUE KEY uniq_conv_user (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  sender_id VARCHAR(64) NOT NULL,
  type VARCHAR(16) NOT NULL,
  status VARCHAR(16) NOT NULL,
  body JSON NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_messages_conv_time ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS message_receipts (
  id VARCHAR(64) PRIMARY KEY,
  message_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  type VARCHAR(16) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PUBLISHED',
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_announcements_status_created_at ON announcements (status, created_at);

CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(64) PRIMARY KEY,
  reporter_user_id VARCHAR(64) NOT NULL,
  target_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_reports_status_created_at ON reports (status, created_at);

CREATE TABLE IF NOT EXISTS admin_actions (
  id VARCHAR(64) PRIMARY KEY,
  admin_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS branding_configs (
  id VARCHAR(64) PRIMARY KEY,
  platform_group VARCHAR(16) NOT NULL UNIQUE,
  project_name VARCHAR(128) NOT NULL DEFAULT '柬单聊',
  logo_url VARCHAR(512) NULL,
  theme_asset_url VARCHAR(512) NULL,
  holiday_theme_asset_url VARCHAR(512) NULL,
  updated_by VARCHAR(64) NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS group_product_orders (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  buyer_user_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(128) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PAID',
  refund_status VARCHAR(24) NOT NULL DEFAULT 'NONE',
  refund_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_group_product_orders_conv_time
  ON group_product_orders (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS group_bot_alerts (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NULL,
  trigger_type VARCHAR(32) NOT NULL,
  trigger_keyword VARCHAR(64) NULL,
  content VARCHAR(512) NOT NULL,
  target_roles JSON NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_group_bot_alerts_conv_time
  ON group_bot_alerts (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS group_bot_alert_deliveries (
  id VARCHAR(64) PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL,
  target_role VARCHAR(32) NOT NULL,
  target_user_id VARCHAR(64) NOT NULL,
  delivered_conversation_id VARCHAR(64) NOT NULL,
  delivered_message_id VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL
);

CREATE INDEX idx_group_bot_alert_deliveries_alert
  ON group_bot_alert_deliveries (alert_id, created_at);

CREATE TABLE IF NOT EXISTS activity_campaigns (
  id VARCHAR(64) PRIMARY KEY,
  activity_type VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  content TEXT NOT NULL,
  cover_url VARCHAR(512) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  start_at DATETIME NULL,
  end_at DATETIME NULL,
  config_json JSON NOT NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE INDEX idx_activity_campaigns_status_created_at
  ON activity_campaigns (status, created_at);
