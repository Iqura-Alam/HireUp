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

-- users
DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- candidate_profile
DROP TRIGGER IF EXISTS trg_candidate_profile_set_updated_at ON candidate_profile;
CREATE TRIGGER trg_candidate_profile_set_updated_at
BEFORE UPDATE ON candidate_profile
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- skill 
DROP TRIGGER IF EXISTS trg_skill_set_updated_at ON skill;
CREATE TRIGGER trg_skill_set_updated_at
BEFORE UPDATE ON skill
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- candidate_skill
DROP TRIGGER IF EXISTS trg_candidate_skill_set_updated_at ON candidate_skill;
CREATE TRIGGER trg_candidate_skill_set_updated_at
BEFORE UPDATE ON candidate_skill
FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- AUDIT LOG TRIGGER
CREATE OR REPLACE FUNCTION fn_audit_application_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log(table_name, operation, record_id, new_data, changed_by)
  VALUES (
    'application',
    'INSERT',
    NEW.application_id,
    jsonb_build_object(
      'job_id', NEW.job_id,
      'candidate_id', NEW.candidate_id,
      'status', NEW.status
    ),
    NEW.candidate_id 
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_application_audit ON application;
CREATE TRIGGER trg_application_audit
AFTER INSERT ON application
FOR EACH ROW EXECUTE FUNCTION fn_audit_application_insert();


-- triggers for trainer and admin

-- to update candidate skills when course is completed
CREATE OR REPLACE FUNCTION fn_trg_course_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    r_skill RECORD;
BEGIN
    IF OLD.completion_status <> 'Completed' AND NEW.completion_status = 'Completed' THEN
        -- Loop through skills taught in the course
        FOR r_skill IN 
            SELECT skill_id FROM course_skill WHERE course_id = NEW.course_id
        LOOP
            -- Upsert skill for candidate
            INSERT INTO candidate_skill (candidate_id, skill_id, proficiency_level)
            VALUES (NEW.candidate_id, r_skill.skill_id, 'Beginner') -- Default to Beginner on completion
            ON CONFLICT (candidate_id, skill_id) 
            DO UPDATE SET proficiency_level = 'Intermediate'; -- Upgrade if already exists (simple logic)
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_completion ON enrollment;
CREATE TRIGGER trg_course_completion
AFTER UPDATE ON enrollment
FOR EACH ROW
EXECUTE FUNCTION fn_trg_course_completion();

-- auditing od enrollment
CREATE OR REPLACE FUNCTION fn_trg_audit_course()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Using existing audit_log table
    INSERT INTO audit_log (table_name, operation, record_id, new_data, changed_by)
    VALUES (
        'enrollment', 
        'ENROLL', 
        NEW.enrollment_id, 
        jsonb_build_object('candidate_id', NEW.candidate_id, 'course_id', NEW.course_id),
        NEW.candidate_id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_course ON enrollment;
CREATE TRIGGER trg_audit_course
AFTER INSERT ON enrollment
FOR EACH ROW
EXECUTE FUNCTION fn_trg_audit_course();

COMMIT;

