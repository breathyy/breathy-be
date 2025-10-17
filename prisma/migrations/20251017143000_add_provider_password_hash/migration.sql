ALTER TABLE doctor_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE hospital_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
