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

CREATE TABLE IF NOT EXISTS employer (
  employer_id      BIGSERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS job_requirement (
  requirement_id   BIGSERIAL PRIMARY KEY,
  job_id           BIGINT NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,

  skill_name       VARCHAR(120) NOT NULL,
  skill_level      VARCHAR(40),         -- e.g. Beginner/Intermediate/Advanced
  is_mandatory     BOOLEAN NOT NULL DEFAULT TRUE,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_job_req UNIQUE (job_id, skill_name)
);

CREATE TABLE IF NOT EXISTS application (
  application_id   BIGSERIAL PRIMARY KEY,
  job_id           BIGINT NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,

  candidate_id     BIGINT NOT NULL,

  status           application_status NOT NULL DEFAULT 'Applied',
  applied_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_application_job_candidate UNIQUE (job_id, candidate_id)
);

COMMIT;
