BEGIN;

-- job
CREATE INDEX IF NOT EXISTS idx_job_employer_id ON job(employer_id);
CREATE INDEX IF NOT EXISTS idx_job_status_expires ON job(status, expires_at);

-- job_requirement
CREATE INDEX IF NOT EXISTS idx_jobreq_job_id ON job_requirement(job_id);
CREATE INDEX IF NOT EXISTS idx_jobreq_skill_id ON job_requirement(skill_id);

-- application
CREATE INDEX IF NOT EXISTS idx_app_job_status ON application(job_id, status);
CREATE INDEX IF NOT EXISTS idx_app_candidate_id ON application(candidate_id);
 
 -- Profile Completion Partial Index
 CREATE INDEX IF NOT EXISTS idx_complete_profiles ON candidate_profile (candidate_id) WHERE completion_percentage = 100;
 
 -- Full Text Search Indexes
 CREATE INDEX IF NOT EXISTS idx_experience_desc_gin ON candidate_experience USING gin(to_tsvector('english', description));
 CREATE INDEX IF NOT EXISTS idx_project_desc_gin ON candidate_project USING gin(to_tsvector('english', description));

COMMIT;
