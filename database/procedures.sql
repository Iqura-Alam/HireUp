BEGIN;

CREATE OR REPLACE PROCEDURE sp_apply_for_job(
  p_candidate_id BIGINT,
  p_job_id BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO application(job_id, candidate_id, status)
  VALUES (p_job_id, p_candidate_id, 'Applied');
END;
$$;

CREATE OR REPLACE PROCEDURE sp_shortlist_application(
  p_employer_id BIGINT,
  p_application_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT a.job_id INTO v_job_id
  FROM application a
  WHERE a.application_id = p_application_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Application % not found', p_application_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM job j
    WHERE j.job_id = v_job_id AND j.employer_id = p_employer_id
  ) THEN
    RAISE EXCEPTION 'Not authorized: employer % does not own this job', p_employer_id;
  END IF;

  UPDATE application
  SET status = 'Shortlisted'
  WHERE application_id = p_application_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_hire_application(
  p_employer_id BIGINT,
  p_application_id BIGINT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_job_id BIGINT;
BEGIN
  SELECT a.job_id INTO v_job_id
  FROM application a
  WHERE a.application_id = p_application_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Application % not found', p_application_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM job j
    WHERE j.job_id = v_job_id AND j.employer_id = p_employer_id
  ) THEN
    RAISE EXCEPTION 'Not authorized: employer % does not own this job', p_employer_id;
  END IF;

  UPDATE application
  SET status = 'Hired'
  WHERE application_id = p_application_id;
END;
$$;

-- Existing procedures...
COMMIT;

BEGIN;

-- Procedure to register a new candidate (Transactional: User + Profile)
CREATE OR REPLACE PROCEDURE sp_register_candidate(
  p_username VARCHAR,
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_full_name VARCHAR,
  p_location VARCHAR,
  p_experience_years INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_user_id BIGINT;
BEGIN
  -- 1. Insert into users
  INSERT INTO users (username, email, password_hash, role)
  VALUES (p_username, p_email, p_password_hash, 'Candidate')
  RETURNING user_id INTO v_new_user_id;

  -- 2. Insert into candidate_profile
  INSERT INTO candidate_profile (candidate_id, full_name, location, experience_years)
  VALUES (v_new_user_id, p_full_name, p_location, p_experience_years);
  
  -- Commit is handled by the caller or implicit, but within PL/pgSQL usually we let the transaction handle it.
  -- Note: Procedures can control transactions, but nested calls need care.
END;
$$;

-- Procedure to register a new employer (Transactional: User + Profile)
CREATE OR REPLACE PROCEDURE sp_register_employer(
  p_username VARCHAR,
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_company_name VARCHAR,
  p_industry VARCHAR,
  p_location VARCHAR,
  p_contact_number VARCHAR,
  p_website VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_user_id BIGINT;
BEGIN
  -- 1. Insert into users
  INSERT INTO users (username, email, password_hash, role)
  VALUES (p_username, p_email, p_password_hash, 'Employer')
  RETURNING user_id INTO v_new_user_id;

  -- 2. Insert into employer
  INSERT INTO employer (user_id, company_name, industry, location, contact_number, website)
  VALUES (v_new_user_id, p_company_name, p_industry, p_location, p_contact_number, p_website);
END;
$$;

-- Procedure to add or update a candidate skill
CREATE OR REPLACE PROCEDURE sp_add_candidate_skill(
  p_candidate_id BIGINT,
  p_skill_name VARCHAR,
  p_proficiency skill_proficiency
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_skill_id BIGINT;
BEGIN
  -- 1. Find or Create Skill (Simple check)
  SELECT skill_id INTO v_skill_id FROM skill WHERE skill_name = p_skill_name;
  
  IF v_skill_id IS NULL THEN
    INSERT INTO skill(skill_name, category) VALUES (p_skill_name, 'Uncategorized')
    RETURNING skill_id INTO v_skill_id;
  END IF;

  -- 2. Upsert Candidate Skill
  INSERT INTO candidate_skill (candidate_id, skill_id, proficiency_level)
  VALUES (p_candidate_id, v_skill_id, p_proficiency)
  ON CONFLICT (candidate_id, skill_id) 
  DO UPDATE SET proficiency_level = EXCLUDED.proficiency_level, updated_at = now();
END;
$$;

COMMIT;
