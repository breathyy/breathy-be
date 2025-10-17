-- Create patient_credentials table for password-based patient login
CREATE TABLE IF NOT EXISTS patient_credentials (
    user_id UUID PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT patient_credentials_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION
);
