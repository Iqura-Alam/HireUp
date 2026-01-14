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

COMMIT;
