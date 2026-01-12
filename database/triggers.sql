BEGIN;

--general function
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- validate application workflow (Applied -> Shortlisted -> Hired)
-- Rejected allowed from Applied/Shortlisted; no changes after Hired
CREATE OR REPLACE FUNCTION fn_validate_application_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  old_rank INT;
  new_rank INT;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  old_rank :=
    CASE OLD.status
      WHEN 'Applied' THEN 1
      WHEN 'Shortlisted' THEN 2
      WHEN 'Hired' THEN 3
      WHEN 'Rejected' THEN 99
    END;

  new_rank :=
    CASE NEW.status
      WHEN 'Applied' THEN 1
      WHEN 'Shortlisted' THEN 2
      WHEN 'Hired' THEN 3
      WHEN 'Rejected' THEN 99
    END;

  IF NEW.status = 'Rejected' THEN
    IF OLD.status IN ('Applied', 'Shortlisted') THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Invalid transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'Hired' THEN
    RAISE EXCEPTION 'Invalid transition: cannot change status after Hired';
  END IF;

  IF new_rank < old_rank THEN
    RAISE EXCEPTION 'Invalid transition: cannot move backward from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--ensure that can't apply to expired/closed jobs
CREATE OR REPLACE FUNCTION fn_validate_job_open_and_not_expired()
RETURNS TRIGGER AS $$
DECLARE
  v_status job_status;
  v_expires DATE;
BEGIN
  SELECT status, expires_at INTO v_status, v_expires
  FROM job
  WHERE job_id = NEW.job_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Job % not found', NEW.job_id;
  END IF;

  IF v_status <> 'Open' THEN
    RAISE EXCEPTION 'Job % is not open', NEW.job_id;
  END IF;

  IF v_expires < CURRENT_DATE THEN
    RAISE EXCEPTION 'Job % is expired', NEW.job_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at triggers
-- employer
DROP TRIGGER IF EXISTS trg_employer_set_updated_at ON employer;
CREATE TRIGGER trg_employer_set_updated_at
BEFORE UPDATE ON employer
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- job
DROP TRIGGER IF EXISTS trg_job_set_updated_at ON job;
CREATE TRIGGER trg_job_set_updated_at
BEFORE UPDATE ON job
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- job_requirement
DROP TRIGGER IF EXISTS trg_jobreq_set_updated_at ON job_requirement;
CREATE TRIGGER trg_jobreq_set_updated_at
BEFORE UPDATE ON job_requirement
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- application
DROP TRIGGER IF EXISTS trg_application_validate_status ON application;
CREATE TRIGGER trg_application_validate_status
BEFORE UPDATE ON application
FOR EACH ROW EXECUTE FUNCTION fn_validate_application_status_transition();

DROP TRIGGER IF EXISTS trg_application_set_updated_at ON application;
CREATE TRIGGER trg_application_set_updated_at
BEFORE UPDATE ON application
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_application_validate_job ON application;
CREATE TRIGGER trg_application_validate_job
BEFORE INSERT ON application
FOR EACH ROW EXECUTE FUNCTION fn_validate_job_open_and_not_expired();

COMMIT;
