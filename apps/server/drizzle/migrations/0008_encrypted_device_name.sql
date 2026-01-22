-- Encrypted Device Name
ALTER TABLE "devices" ADD COLUMN "encrypted_device_name" text;
ALTER TABLE "devices" ADD COLUMN "device_name_nonce" text;
-- deviceName is already nullable, no change needed
