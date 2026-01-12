BEGIN;

-- job
CREATE INDEX IF NOT EXISTS idx_job_employer_id ON job(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_status_expires ON job(status, expires_at);

-- job_requirement
CREATE INDEX IF NOT EXISTS idx_jobreq_job_id ON job_requirement(job_id);
CREATE INDEX IF NOT EXISTS idx_jobreq_skill_name ON job_requirement(skill_name);

-- application
CREATE INDEX IF NOT EXISTS idx_app_job_status ON application(job_id, status);
CREATE INDEX IF NOT EXISTS idx_app_candidate_id ON application(candidate_id);

COMMIT;
