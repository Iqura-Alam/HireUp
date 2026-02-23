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
  
  -- Skill Types
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'skill_type') THEN
    CREATE TYPE skill_type AS ENUM ('Technical', 'Soft', 'Tool', 'Domain');
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
  
  -- Account Status & Health
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified_at TIMESTAMPTZ DEFAULT now(),
  last_login_at    TIMESTAMPTZ,
  
  -- Profile / Soft Delete
  deleted_at       TIMESTAMPTZ,
  
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- CANDIDATE MODULE 
CREATE TABLE IF NOT EXISTS candidate_profile (
  candidate_id     BIGINT PRIMARY KEY, 
  
  -- 1. Identity
  first_name       VARCHAR(50) NOT NULL,
  last_name        VARCHAR(50) NOT NULL,
  -- Auto-generated Full Name (Critical for your Views)
  full_name        VARCHAR(101) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,

  headline         VARCHAR(150),
  summary          TEXT,
  
  -- 2. Localized Address & Contact
  contact_number   VARCHAR(30), 
  city             VARCHAR(100), 
  division         VARCHAR(50),  
  country          VARCHAR(100) DEFAULT 'Bangladesh',
  
  -- 3. Job Preferences
  desired_job_title VARCHAR(100),
  employment_type   VARCHAR(50), 
  work_mode_preference VARCHAR(50), 
  expected_salary_min DECIMAL(12, 2),
  expected_salary_max DECIMAL(12, 2),
  currency          VARCHAR(10) DEFAULT 'BDT',
  notice_period_days INT,
  willing_to_relocate BOOLEAN DEFAULT FALSE,
  
  -- 4. Professional Links
  linkedin_url      VARCHAR(200),
  github_url        VARCHAR(200),
  
  experience_years INT CHECK (experience_years >= 0),
  
  -- Profile Health
  completion_percentage INT DEFAULT 0,
  
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT fk_candidate_user FOREIGN KEY (candidate_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Candidate Education
CREATE TABLE IF NOT EXISTS candidate_education (
    education_id    BIGSERIAL PRIMARY KEY,
    candidate_id    BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,
    institution     VARCHAR(150) NOT NULL,
    degree          VARCHAR(150),
    field_of_study  VARCHAR(100),
    start_date      DATE,
    end_date        DATE, -- Nullable for 'Present'
    grade           VARCHAR(50),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidate Experience
CREATE TABLE IF NOT EXISTS candidate_experience (
    experience_id   BIGSERIAL PRIMARY KEY,
    candidate_id    BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,
    company_name    VARCHAR(150) NOT NULL,
    title           VARCHAR(100) NOT NULL,
    location        VARCHAR(100),
    start_date      DATE NOT NULL,
    end_date        DATE, -- Nullable for 'Present'
    is_current      BOOLEAN DEFAULT FALSE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Candidate Projects
CREATE TABLE IF NOT EXISTS candidate_project (
    project_id      BIGSERIAL PRIMARY KEY,
    candidate_id    BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    project_url     VARCHAR(200),
    tech_stack      TEXT[], -- Array of strings
    start_date      DATE,
    end_date        DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- SKILL MODULE
CREATE TABLE IF NOT EXISTS skill_category (
    category_id     BIGSERIAL PRIMARY KEY,
    category_name   VARCHAR(100) NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill (
  skill_id         BIGSERIAL PRIMARY KEY,
  skill_name       VARCHAR(100) NOT NULL,
  skill_slug       VARCHAR(100) NOT NULL UNIQUE, -- Normalized lowercase
  category_id      BIGINT REFERENCES skill_category(category_id) ON DELETE SET NULL,
  
  description      TEXT,
  type             skill_type DEFAULT 'Technical',
  is_active        BOOLEAN DEFAULT TRUE,
  
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidate_skill (
  candidate_skill_id BIGSERIAL PRIMARY KEY,
  candidate_id       BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,
  skill_id           BIGINT NOT NULL REFERENCES skill(skill_id) ON DELETE CASCADE,
  proficiency_level  skill_proficiency NOT NULL DEFAULT 'Beginner',
  
  years_of_experience NUMERIC(4,1),
  last_used_at       DATE,
  is_primary         BOOLEAN DEFAULT FALSE,
  custom_skill_name  VARCHAR(100), -- For 'Other' skills (skill_id = 0)
  
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
  user_id       BIGINT UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  company_name     VARCHAR(120) NOT NULL,
  industry         VARCHAR(80),
  location         VARCHAR(120),
  contact_number   VARCHAR(30),
  email            VARCHAR(120),
  website          VARCHAR(200),
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
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
  cv_file          BYTEA,
  applied_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_application_job_candidate UNIQUE (job_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS job_question (
    question_id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES job(job_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_answer (
    answer_id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES application(application_id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES job_question(question_id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- trainer and course table created

CREATE TABLE IF NOT EXISTS trainer_profile (
  trainer_id      BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  organization_name VARCHAR(150),
  specialization  VARCHAR(100),
  contact_number  VARCHAR(30),
  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_trainer_user UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS course (
  course_id       BIGSERIAL PRIMARY KEY,
  trainer_id      BIGINT NOT NULL REFERENCES trainer_profile(trainer_id) ON DELETE CASCADE,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  duration_days   INT CHECK (duration_days > 0),
  mode            VARCHAR(50) CHECK (mode IN ('Online', 'Offline')),
  fee             DECIMAL(10, 2) CHECK (fee >= 0),
  average_rating  DECIMAL(3, 2) DEFAULT 0,
  total_reviews   INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_skill (
  course_skill_id BIGSERIAL PRIMARY KEY,
  course_id       BIGINT NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  skill_id        BIGINT NOT NULL REFERENCES skill(skill_id) ON DELETE CASCADE,
  CONSTRAINT uq_course_skill UNIQUE (course_id, skill_id)
);

CREATE TABLE IF NOT EXISTS course_review (
  review_id       BIGSERIAL PRIMARY KEY,
  course_id       BIGINT NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  candidate_id    BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,
  rating          INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_candidate_course_review UNIQUE (candidate_id, course_id)
);

CREATE TABLE IF NOT EXISTS enrollment (
  enrollment_id   BIGSERIAL PRIMARY KEY,
  candidate_id    BIGINT NOT NULL REFERENCES candidate_profile(candidate_id) ON DELETE CASCADE,
  course_id       BIGINT NOT NULL REFERENCES course(course_id) ON DELETE CASCADE,
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status           application_status NOT NULL DEFAULT 'Applied',
  completion_status VARCHAR(50) NOT NULL DEFAULT 'In Progress' CHECK (completion_status IN ('In Progress', 'Completed')),
  CONSTRAINT uq_student_course UNIQUE (candidate_id, course_id)
);



COMMIT;

