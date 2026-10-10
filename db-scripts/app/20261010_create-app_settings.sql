-- AppSetting -> app_settings (timestamps, underscored:false -> camelCase audit cols)
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(64) PRIMARY KEY,
  value       JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);
