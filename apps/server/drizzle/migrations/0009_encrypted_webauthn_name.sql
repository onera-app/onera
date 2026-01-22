-- Encrypted WebAuthn Credential Name
-- Add encrypted columns for passkey name

ALTER TABLE "webauthn_credentials" ADD COLUMN "encrypted_name" text;
ALTER TABLE "webauthn_credentials" ADD COLUMN "name_nonce" text;
-- name is already nullable, no change needed
