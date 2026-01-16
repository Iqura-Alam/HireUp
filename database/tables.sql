BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
    CREATE TYPE application_status AS ENUM ('Applied', 'Shortlisted', 'Hired', 'Rejected');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM ('Open', 'Closed');
  END IF;
END$$;

-- USERS & ROLES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('Candidate', 'Employer', 'Trainer', 'Admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_proficiency') THEN
    CREATE TYPE skill_proficiency AS ENUM ('Beginner', 'Intermediate', 'Advanced');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS users (
  user_id          BIGSERIAL PRIMARY KEY,
  username         VARCHAR(50) NOT NULL UNIQUE,
  email            VARCHAR(100) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  role             user_role NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CANDIDATE MODULE
CREATE TABLE IF NOT EXISTS candidate_profile (
  candidate_id     BIGINT PRIMARY KEY, -- Same as users.user_id for 1:1 mapping
  full_name        VARCHAR(100) NOT NULL,
  dob              DATE,
  location         VARCHAR(120),
  experience_years INT CHECK (experience_years >= 0),
  contact_number   VARCHAR(30),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_candidate_user FOREIGN KEY (candidate_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- SKILL MODULE
CREATE TABLE IF NOT EXISTS skill (
  skill_id         BIGSERIAL PRIMARY KEY,
  skill_name       VARCHAR(100) NOT NULL UNIQUE,
  category         VARCHAR(50),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_skill (
  candidate_skill_id BIGSERIAL PRIMARY KEY,
  candidate_id       BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,
  skill_id           BIGINT NOT NULL REFERENCES skill(skill_id) ON DELETE CASCADE,
  proficiency_level  skill_proficiency NOT NULL DEFAULT 'Beginner',
  
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT uq_candidate_skill UNIQUE (candidate_id, skill_id)
);

-- AUDIT & LOGGING
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id         BIGSERIAL PRIMARY KEY,
  table_name       VARCHAR(50) NOT NULL,
  operation        VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
  record_id        BIGINT,
  old_data         JSONB,
  new_data         JSONB,
  changed_by       BIGINT, -- user_id if available
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EMPLOYER MODULE (Existing)
CREATE TABLE IF NOT EXISTS employer (
  employer_id      BIGSERIAL PRIMARY KEY,
  -- Link employer to user if they have a login
  -- user_id       BIGINT UNIQUE REFERENCES users(user_id), 
  company_name     VARCHAR(120) NOT NULL,
  industry         VARCHAR(80),
  location         VARCHAR(120),
  contact_number   VARCHAR(30),
  email            VARCHAR(120),
  website          VARCHAR(200),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_employer_company UNIQUE (company_name)
);

CREATE TABLE IF NOT EXISTS job (
  job_id           BIGSERIAL PRIMARY KEY,
  employer_id      BIGINT NOT NULL REFERENCES employer(employer_id) ON DELETE CASCADE,

  title            VARCHAR(150) NOT NULL,
  description      TEXT,
  location         VARCHAR(120),
  salary_range     VARCHAR(80),

  expires_at       DATE NOT NULL,
  status           job_status NOT NULL DEFAULT 'Open',

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_job_title_len CHECK (char_length(title) >= 4),
  CONSTRAINT chk_job_expiry_future CHECK (expires_at >= CURRENT_DATE)
);

-- REFACTORED: Link to skill table instead of string
CREATE TABLE IF NOT EXISTS job_requirement (
  requirement_id   BIGSERIAL PRIMARY KEY,
  job_id           BIGINT NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,
  
  skill_id         BIGINT NOT NULL REFERENCES skill(skill_id) ON DELETE CASCADE,
  minimum_proficiency skill_proficiency NOT NULL DEFAULT 'Beginner',
  is_mandatory     BOOLEAN NOT NULL DEFAULT TRUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_job_req UNIQUE (job_id, skill_id)
);

CREATE TABLE IF NOT EXISTS application (
  application_id   BIGSERIAL PRIMARY KEY,
  job_id           BIGINT NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,

  candidate_id     BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,

  status           application_status NOT NULL DEFAULT 'Applied',
  applied_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_application_job_candidate UNIQUE (job_id, candidate_id)
);

COMMIT;
