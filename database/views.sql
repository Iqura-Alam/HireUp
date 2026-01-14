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
        'skill_name', r.skill_name,
        'skill_level', r.skill_level,
        'is_mandatory', r.is_mandatory
      )
    ) FILTER (WHERE r.requirement_id IS NOT NULL),
    '[]'::jsonb
  ) AS requirements

FROM job j
JOIN employer e ON e.employer_id = j.employer_id
LEFT JOIN job_requirement r ON r.job_id = j.job_id
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

COMMIT;
