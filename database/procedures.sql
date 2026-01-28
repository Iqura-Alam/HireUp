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

  -- Close the job
  UPDATE job
  SET status = 'Closed'
  WHERE job_id = v_job_id;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_reject_application(
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
  SET status = 'Rejected'
  WHERE application_id = p_application_id;
END;
$$;


COMMIT;

BEGIN;

-- Procedure to register a new candidate 
CREATE OR REPLACE PROCEDURE sp_register_candidate(
  p_username VARCHAR,
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_first_name VARCHAR,
  p_last_name VARCHAR,
  p_city VARCHAR,       
  p_division VARCHAR,   
  p_country VARCHAR,    
  p_experience_years INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_user_id BIGINT;
BEGIN
  -- Insert into users
  INSERT INTO users (username, email, password_hash, role)
  VALUES (p_username, p_email, p_password_hash, 'Candidate')
  RETURNING user_id INTO v_new_user_id;

  -- Insert into candidate_profile
  INSERT INTO candidate_profile (
      candidate_id, 
      first_name, 
      last_name, 
      city, 
      division, 
      country, 
      experience_years
  )
  VALUES (
      v_new_user_id, 
      p_first_name, 
      p_last_name, 
      p_city, 
      p_division, 
      p_country, 
      p_experience_years
  );
END;
$$;

-- Procedure to register a new employer
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
  -- into users
  INSERT INTO users (username, email, password_hash, role)
  VALUES (p_username, p_email, p_password_hash, 'Employer')
  RETURNING user_id INTO v_new_user_id;

  -- Insert into employer
  INSERT INTO employer (user_id, company_name, industry, location, contact_number, website, email)
  VALUES (v_new_user_id, p_company_name, p_industry, p_location, p_contact_number, p_website, p_email);
END;
$$;

-- Procedure to add or update a candidate skill
CREATE OR REPLACE PROCEDURE sp_add_candidate_skill(
  p_candidate_id BIGINT,
  p_skill_id BIGINT,
  p_proficiency skill_proficiency,
  p_years_exp NUMERIC DEFAULT 0,
  p_custom_name VARCHAR DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Validation (Simple)
  IF p_skill_id = 0 AND p_custom_name IS NULL THEN
     RAISE EXCEPTION 'Custom skill name required for "Other" skill';
  END IF;

  -- 2. Upsert Candidate Skill
  INSERT INTO candidate_skill (candidate_id, skill_id, proficiency_level, years_of_experience, custom_skill_name)
  VALUES (p_candidate_id, p_skill_id, p_proficiency, p_years_exp, p_custom_name)
  ON CONFLICT (candidate_id, skill_id) 
  DO UPDATE SET 
      proficiency_level = EXCLUDED.proficiency_level, 
      years_of_experience = EXCLUDED.years_of_experience,
      custom_skill_name = EXCLUDED.custom_skill_name,
      updated_at = now();
END;
$$;


-- trainer and admin procedures created

-- trainer creates a course + skills
CREATE OR REPLACE PROCEDURE sp_add_course(
    p_trainer_id BIGINT,
    p_title VARCHAR,
    p_description TEXT,
    p_duration_days INT,
    p_mode VARCHAR,
    p_fee DECIMAL,
    p_skill_ids BIGINT[] -- Array of skill_ids
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_course_id BIGINT;
    v_skill_id BIGINT;
BEGIN
    -- Insert Course
    INSERT INTO course (trainer_id, title, description, duration_days, mode, fee)
    VALUES (p_trainer_id, p_title, p_description, p_duration_days, p_mode, p_fee)
    RETURNING course_id INTO v_course_id;

    -- Insert Skills
    IF p_skill_ids IS NOT NULL THEN
        FOREACH v_skill_id IN ARRAY p_skill_ids
        LOOP
            INSERT INTO course_skill (course_id, skill_id)
            VALUES (v_course_id, v_skill_id);
        END LOOP;
    END IF;
END;
$$;



-- candidate enrolls in a course
CREATE OR REPLACE PROCEDURE sp_enroll_course(
    p_candidate_id BIGINT,
    p_course_id BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- unique enrollment checking
    IF EXISTS (SELECT 1 FROM enrollment WHERE candidate_id = p_candidate_id AND course_id = p_course_id) THEN
        RAISE EXCEPTION 'Candidate already enrolled in this course.';
    END IF;

    INSERT INTO enrollment (candidate_id, course_id, status)
    VALUES (p_candidate_id, p_course_id, 'Applied');
END;
$$;


-- trainer manages enrollment status
CREATE OR REPLACE PROCEDURE sp_manage_enrollment(
    p_enrollment_id BIGINT,
    p_status application_status
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE enrollment
    SET status = p_status,
        updated_at = now()
    WHERE enrollment_id = p_enrollment_id;
END;
$$;

-- Update existing course
CREATE OR REPLACE PROCEDURE sp_update_course(
    p_course_id BIGINT,
    p_title VARCHAR,
    p_description TEXT,
    p_duration_days INT,
    p_mode VARCHAR,
    p_fee DECIMAL,
    p_skill_ids BIGINT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_skill_id BIGINT;
BEGIN
    UPDATE course
    SET title = p_title,
        description = p_description,
        duration_days = p_duration_days,
        mode = p_mode,
        fee = p_fee,
        updated_at = now()
    WHERE course_id = p_course_id;

    -- Update Skills
    DELETE FROM course_skill WHERE course_id = p_course_id;
    IF p_skill_ids IS NOT NULL THEN
        FOREACH v_skill_id IN ARRAY p_skill_ids
        LOOP
            INSERT INTO course_skill (course_id, skill_id)
            VALUES (p_course_id, v_skill_id);
        END LOOP;
    END IF;
END;
$$;


-- Delete course
CREATE OR REPLACE PROCEDURE sp_delete_course(
    p_course_id BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Cascade will handle course_skill, enrollment, and course_prerequisite
    DELETE FROM course WHERE course_id = p_course_id;
END;
$$;


-- trainer can mark whether the enrollment is complete
CREATE OR REPLACE PROCEDURE sp_complete_course(
    p_enrollment_id BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE enrollment
    SET completion_status = 'Completed'
    WHERE enrollment_id = p_enrollment_id;
END;
$$;

-- candidate report can be generated via JSON
CREATE OR REPLACE FUNCTION sp_generate_candidate_report(p_candidate_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'candidate', (
            SELECT jsonb_build_object(
                'candidate_id', cp.candidate_id,
                'first_name', cp.first_name,
                'last_name', cp.last_name,
                'full_name', cp.full_name,
                'email', u.email,
                'city', cp.city,
                'division', cp.division,
                'country', cp.country,
                'experience_years', cp.experience_years
            )
            FROM candidate_profile cp
            JOIN users u ON u.user_id = cp.candidate_id
            WHERE cp.candidate_id = p_candidate_id
        ),
        'skills', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'skill_name', COALESCE(cs.custom_skill_name, s.skill_name),
                    'proficiency', cs.proficiency_level,
                    'years', cs.years_of_experience
                )
            ), '[]'::jsonb)
            FROM candidate_skill cs
            JOIN skill s ON s.skill_id = cs.skill_id
            WHERE cs.candidate_id = p_candidate_id
        ),
        'enrollments', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'course_title', c.title,
                    'status', e.completion_status,
                    'enrolled_at', e.enrolled_at,
                    'skills_covered', (
                        SELECT jsonb_agg(s.skill_name)
                        FROM course_skill cs
                        JOIN skill s ON s.skill_id = cs.skill_id
                        WHERE cs.course_id = c.course_id
                    )
                )
            ), '[]'::jsonb)
            FROM enrollment e
            JOIN course c ON c.course_id = e.course_id
            WHERE e.candidate_id = p_candidate_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- sp_register_trainer
CREATE OR REPLACE PROCEDURE sp_register_trainer(
  p_username VARCHAR,
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_organization_name VARCHAR,
  p_specialization VARCHAR,
  p_contact_number VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_user_id BIGINT;
BEGIN
  -- Insert into users
  INSERT INTO users (username, email, password_hash, role)
  VALUES (p_username, p_email, p_password_hash, 'Trainer')
  RETURNING user_id INTO v_new_user_id;

  -- Insert into trainer_profile
  INSERT INTO trainer_profile (user_id, organization_name, specialization, contact_number)
  VALUES (v_new_user_id, p_organization_name, p_specialization, p_contact_number);
END;
$$;

-- fn_recommend_courses
CREATE OR REPLACE FUNCTION fn_recommend_courses(p_candidate_id BIGINT)
RETURNS TABLE (
    course_id BIGINT,
    title VARCHAR,
    missing_skills TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH candidate_missing_skills AS (
        SELECT DISTINCT jr.skill_id
        FROM job_requirement jr
        WHERE jr.skill_id NOT IN (
            SELECT cs.skill_id FROM candidate_skill cs WHERE cs.candidate_id = p_candidate_id
        )
    )
    SELECT 
        c.course_id,
        c.title,
        ARRAY_AGG(s.skill_name) AS missing_skills_taught
    FROM course c
    JOIN course_skill cs ON c.course_id = cs.course_id
    JOIN skill s ON s.skill_id = cs.skill_id
    JOIN candidate_missing_skills cms ON cms.skill_id = cs.skill_id
    GROUP BY c.course_id, c.title;
END;
$$;

-- fn_top_skills
CREATE OR REPLACE FUNCTION fn_top_skills()
RETURNS TABLE (
    skill_name VARCHAR,
    demand_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT s.skill_name, COUNT(jr.job_id) as demand_count
    FROM skill s
    JOIN job_requirement jr ON s.skill_id = jr.skill_id
    GROUP BY s.skill_name
    ORDER BY demand_count DESC
    LIMIT 10;
END;
$$;

COMMIT;


-- Update employer profile
CREATE OR REPLACE PROCEDURE sp_update_employer_profile(
    p_user_id BIGINT,
    p_company_name VARCHAR,
    p_industry VARCHAR,
    p_location VARCHAR,
    p_contact_number VARCHAR,
    p_website VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE employer
    SET 
        company_name = p_company_name,
        industry = p_industry,
        location = p_location,
        contact_number = p_contact_number,
        website = p_website,
        updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Post a new job
CREATE OR REPLACE PROCEDURE sp_post_job(
    p_employer_id BIGINT,
    p_title VARCHAR,
    p_description TEXT,
    p_location VARCHAR,
    p_salary_range VARCHAR,
    p_expires_at DATE,
    p_skill_ids BIGINT[], -- Array of skill_ids
    p_min_proficiencies skill_proficiency[], -- Array of proficiencies corresponding to skills
    p_questions TEXT[] -- Array of questions
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_job_id BIGINT;
    i INT;
    v_question_text TEXT;
BEGIN
    -- Insert Job
    INSERT INTO job (employer_id, title, description, location, salary_range, expires_at)
    VALUES (p_employer_id, p_title, p_description, p_location, p_salary_range, p_expires_at)
    RETURNING job_id INTO v_job_id;

    -- Insert Job Requirements
    IF p_skill_ids IS NOT NULL THEN
        FOR i IN 1 .. array_length(p_skill_ids, 1)
        LOOP
            INSERT INTO job_requirement (job_id, skill_id, minimum_proficiency)
            VALUES (v_job_id, p_skill_ids[i], p_min_proficiencies[i]);
        END LOOP;
    END IF;

    -- Insert Job Questions
    IF p_questions IS NOT NULL THEN
        FOREACH v_question_text IN ARRAY p_questions
        LOOP
            INSERT INTO job_question (job_id, question_text)
            VALUES (v_job_id, v_question_text);
        END LOOP;
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_apply_for_job_custom(
    p_candidate_id BIGINT,
    p_job_id BIGINT,
    p_cv_file BYTEA,
    p_question_ids BIGINT[],
    p_answers TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_application_id BIGINT;
    i INT;
BEGIN
    INSERT INTO application(job_id, candidate_id, status, cv_file)
    VALUES (p_job_id, p_candidate_id, 'Applied', p_cv_file)
    RETURNING application_id INTO v_application_id;

    IF p_question_ids IS NOT NULL THEN
        FOR i IN 1 .. array_length(p_question_ids, 1)
        LOOP
            INSERT INTO application_answer (application_id, question_id, answer_text)
            VALUES (v_application_id, p_question_ids[i], p_answers[i]);
        END LOOP;
    END IF;
END;
$$;
