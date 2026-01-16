-- CLEANUP (Reset data for testing)
-- Note: 'NOTICE: truncate cascades...' is normal and expected database behavior.
TRUNCATE TABLE users, employer, job, skill, candidate_profile, application, audit_log CASCADE;

-- 1. Create Candidate via Procedure (Tests sp_register_candidate)
CALL sp_register_candidate('alice_cand', 'alice@example.com', 'hashed_pw_1', 'Alice Wonderland', 'New York', 3);

-- Create Admin & Employer manually (Procedures not defined for these yet)
INSERT INTO users (username, email, password_hash, role) VALUES 
('charlie_admin', 'admin@hireup.com', 'hashed_pw_3', 'Admin'),
('bob_empl', 'bob@company.com', 'hashed_pw_2', 'Employer');

INSERT INTO employer (company_name, industry, email) 
VALUES ('TechCorp', 'Software', 'contact@techcorp.com');

-- 2. Add Skills via Procedure (Tests sp_add_candidate_skill)
DO $$
DECLARE
  v_cand_id BIGINT;
BEGIN
  SELECT user_id INTO v_cand_id FROM users WHERE username='alice_cand';
  
  -- This creates 'PostgreSQL' and 'Node.js' in the skill table too if missing
  CALL sp_add_candidate_skill(v_cand_id, 'PostgreSQL', 'Intermediate');
  CALL sp_add_candidate_skill(v_cand_id, 'Node.js', 'Beginner');
END $$;

-- 3. Create Job
INSERT INTO job (employer_id, title, description, expires_at, status)
VALUES 
(
  (SELECT employer_id FROM employer WHERE company_name='TechCorp'),
  'Backend Developer',
  'Need a Node.js expert',
  CURRENT_DATE + 30,
  'Open'
);

-- Requirement (PostgreSQL & Node.js should exist now from step 2)
INSERT INTO job_requirement (job_id, skill_id, minimum_proficiency)
VALUES
(
  (SELECT job_id FROM job WHERE title='Backend Developer'),
  (SELECT skill_id FROM skill WHERE skill_name='Node.js'),
  'Intermediate'
);

-- 4. Apply for Job (Tests sp_apply_for_job & Audit Trigger)
-- FIXED: Used DO block to avoid "subquery in CALL argument" error
DO $$
DECLARE
  v_cand_id BIGINT;
  v_job_id BIGINT;
BEGIN
  SELECT user_id INTO v_cand_id FROM users WHERE username='alice_cand';
  SELECT job_id INTO v_job_id FROM job WHERE title='Backend Developer';

  CALL sp_apply_for_job(v_cand_id, v_job_id);
END $$;

-- 5. Verification Queries
SELECT '--- CANDIDATE PROFILE ---' as msg;
SELECT * FROM vw_candidate_full_profile;

SELECT '--- AUDIT LOGS ---' as msg;
SELECT * FROM audit_log;

SELECT '--- ACTIVE JOBS ---' as msg;
SELECT * FROM vw_active_jobs;
