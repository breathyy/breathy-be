CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE case_status AS ENUM (
  'IN_CHATBOT',
  'WAITING_DOCTOR',
  'MILD',
  'MODERATE',
  'SEVERE'
);

CREATE TYPE severity_level AS ENUM (
  'MILD',
  'MODERATE',
  'SEVERE'
);

CREATE TYPE sputum_category AS ENUM (
  'GREEN',
  'BLOOD_TINGED',
  'VISCOUS',
  'CLEAR',
  'UNKNOWN'
);

CREATE TYPE chat_message_type AS ENUM (
  'text',
  'image'
);

CREATE TYPE image_source_type AS ENUM (
  'ACS',
  'MANUAL'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(32) UNIQUE NOT NULL,
  display_name VARCHAR(120),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE doctor_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  full_name VARCHAR(160) NOT NULL,
  email VARCHAR(160) UNIQUE,
  specialty VARCHAR(120),
  role VARCHAR(40) NOT NULL DEFAULT 'DOCTOR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(160) NOT NULL,
  address TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  contact_number VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hospital_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals (id) ON DELETE CASCADE,
  role VARCHAR(40) NOT NULL DEFAULT 'HOSPITAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctor_users (id) ON DELETE SET NULL,
  status case_status NOT NULL DEFAULT 'IN_CHATBOT',
  severity_score NUMERIC(4,2),
  severity_class severity_level,
  sputum_category sputum_category NOT NULL DEFAULT 'UNKNOWN',
  start_date DATE,
  end_date DATE,
  triage_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  blob_name TEXT NOT NULL,
  blob_url TEXT NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT,
  source image_source_type NOT NULL DEFAULT 'ACS',
  qc_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  quality_metrics JSONB NOT NULL DEFAULT '{}',
  markers JSONB NOT NULL DEFAULT '{}',
  s_i NUMERIC(4,2),
  vision_ran_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  fever_status BOOLEAN,
  onset_days INTEGER,
  dyspnea BOOLEAN,
  comorbidity BOOLEAN,
  severity_symptom NUMERIC(4,2),
  raw_text JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  task_type VARCHAR(40) NOT NULL,
  instruction TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (case_id, day_index, task_type)
);

CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES hospitals (id) ON DELETE CASCADE,
  summary TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  message_type chat_message_type NOT NULL,
  content TEXT,
  blob_ref TEXT,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cases_user_id ON cases (user_id);
CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_created_at ON cases (created_at);
CREATE INDEX idx_images_case_id ON images (case_id);
CREATE INDEX idx_symptoms_case_id ON symptoms (case_id);
CREATE INDEX idx_daily_tasks_case_id ON daily_tasks (case_id);
CREATE INDEX idx_referrals_case_id ON referrals (case_id);
CREATE INDEX idx_chat_messages_case_id ON chat_messages (case_id);
