BEGIN;

-- Active jobs: Open and not expired
-- Includes requirements as JSON array built from job_requirement table
CREATE OR REPLACE VIEW vw_active_jobs AS
SELECT
  j.job_id,
  j.title,
  j.description,
  j.location,
  j.salary_range,
  j.expires_at,
  j.status,
  j.created_at,
  e.employer_id,
  e.company_name,
  e.industry,

  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'skill_name', s.skill_name,
        'minimum_proficiency', r.minimum_proficiency,
        'is_mandatory', r.is_mandatory
      )
    ) FILTER (WHERE r.requirement_id IS NOT NULL),
    '[]'::jsonb
  ) AS requirements

FROM job j
JOIN employer e ON e.employer_id = j.employer_id
LEFT JOIN job_requirement r ON r.job_id = j.job_id
LEFT JOIN skill s ON s.skill_id = r.skill_id
WHERE j.status = 'Open'
  AND j.expires_at >= CURRENT_DATE
GROUP BY
  j.job_id, e.employer_id;

-- Employer dashboard: counts
CREATE OR REPLACE VIEW vw_employer_dashboard AS
SELECT
  e.employer_id,
  e.company_name,

  COUNT(DISTINCT j.job_id) AS total_jobs,
  COUNT(DISTINCT j.job_id)
    FILTER (WHERE j.status = 'Open' AND j.expires_at >= CURRENT_DATE) AS active_jobs,

  COUNT(a.application_id) AS total_applications,
  COUNT(a.application_id) FILTER (WHERE a.status = 'Applied') AS applied_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'Shortlisted') AS shortlisted_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'Hired') AS hired_count,
  COUNT(a.application_id) FILTER (WHERE a.status = 'Rejected') AS rejected_count

FROM employer e
LEFT JOIN job j ON j.employer_id = e.employer_id
LEFT JOIN application a ON a.job_id = j.job_id
GROUP BY e.employer_id, e.company_name;

-- Candidate Full Profile View
CREATE OR REPLACE VIEW vw_candidate_full_profile AS
SELECT
  u.user_id,
  u.email,
  u.role,
  c.full_name,
  c.dob,
  c.city,
  c.division,
  c.country,
  c.experience_years,
  c.contact_number,
  
  -- Aggregated Skills
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'skill_name', s.skill_name,
        'category', sc.category_name,
        'proficiency', cs.proficiency_level
      )
    ) FILTER (WHERE s.skill_id IS NOT NULL),
    '[]'::jsonb
  ) AS skills

FROM users u
JOIN candidate_profile c ON c.candidate_id = u.user_id
LEFT JOIN candidate_skill cs ON cs.candidate_id = c.candidate_id
LEFT JOIN skill s ON s.skill_id = cs.skill_id
LEFT JOIN skill_category sc ON s.category_id = sc.category_id
GROUP BY u.user_id, c.candidate_id;

-- Candidate Applications View
CREATE OR REPLACE VIEW vw_candidate_applications AS
SELECT
  a.application_id,
  a.status AS application_status,
  a.applied_at,
  
  j.job_id,
  j.title AS job_title,
  j.location AS job_location,
  j.salary_range,
  j.status AS job_status,
  
  e.employer_id,
  e.company_name

FROM application a
JOIN job j ON j.job_id = a.job_id
JOIN employer e ON e.employer_id = j.employer_id;

-- Top Skills View (Analytics)
CREATE OR REPLACE VIEW vw_top_skills AS
SELECT
  s.skill_name,
  sc.category_name as category,
  COUNT(jr.requirement_id) AS demand_count
FROM skill s
LEFT JOIN skill_category sc ON s.category_id = sc.category_id
JOIN job_requirement jr ON jr.skill_id = s.skill_id
JOIN job j ON j.job_id = jr.job_id
WHERE j.status = 'Open' AND j.expires_at >= CURRENT_DATE
GROUP BY s.skill_id, s.skill_name, sc.category_name
ORDER BY demand_count DESC;


-- views for trainer and admin

-- vw_course_enrollments to show course + enrolled candidates
CREATE OR REPLACE VIEW vw_course_enrollments AS
SELECT 
    c.course_id,
    c.title,
    c.trainer_id,
    cp.full_name AS candidate_name,
    cp.candidate_id,
    e.enrolled_at,
    e.completion_status
FROM course c
JOIN enrollment e ON c.course_id = e.course_id
JOIN candidate_profile cp ON cp.candidate_id = e.candidate_id;

-- vw_popular_courses to order courses by enrollments
CREATE OR REPLACE VIEW vw_popular_courses AS
SELECT 
    c.title,
    t.organization_name,
    COUNT(e.enrollment_id) AS enrollment_count
FROM course c
JOIN trainer_profile t ON c.trainer_id = t.trainer_id
LEFT JOIN enrollment e ON c.course_id = e.course_id
GROUP BY c.course_id, t.organization_name
ORDER BY enrollment_count DESC;

-- vw_trainer_dashboard 
CREATE OR REPLACE VIEW vw_trainer_dashboard AS
SELECT
    c.trainer_id,
    COUNT(DISTINCT c.course_id) AS total_courses,
    COUNT(e.enrollment_id) AS total_students,
    COUNT(CASE WHEN e.completion_status = 'Completed' THEN 1 END) AS completed_students
FROM course c
LEFT JOIN enrollment e ON c.course_id = e.course_id
GROUP BY c.trainer_id;

COMMIT;

