-- =========================================================
-- MASTER SCRIPT: SKILLS + BANGLADESH TEST DATA (HASHED PASSWORDS)
-- Password for all users: 1234
-- =========================================================

-- 1. SAFETY RESET
ROLLBACK; 
BEGIN;

-- 2. CLEAN SLATE
TRUNCATE TABLE 
    users, employer, trainer_profile, candidate_profile, 
    job, course, enrollment, audit_log, application, 
    candidate_skill, skill, skill_category 
RESTART IDENTITY CASCADE;

-- =========================================================
-- SECTION A: RE-SEED SKILLS
-- =========================================================
INSERT INTO skill_category (category_name) VALUES 
('Languages'), ('Frameworks'), ('Tools'), ('Databases'), ('Soft Skills');

DO $$
DECLARE
  cat_lang BIGINT; cat_frame BIGINT; cat_tool BIGINT; cat_db BIGINT; cat_soft BIGINT;
BEGIN
  SELECT category_id INTO cat_lang FROM skill_category WHERE category_name = 'Languages';
  SELECT category_id INTO cat_frame FROM skill_category WHERE category_name = 'Frameworks';
  SELECT category_id INTO cat_tool FROM skill_category WHERE category_name = 'Tools';
  SELECT category_id INTO cat_db FROM skill_category WHERE category_name = 'Databases';
  SELECT category_id INTO cat_soft FROM skill_category WHERE category_name = 'Soft Skills';

  -- 1. The "Other" Skill (ID 0)
  INSERT INTO skill (skill_id, skill_name, skill_slug, type) VALUES (0, 'Other', 'other', 'Technical');

  -- 2. Languages
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('JavaScript', 'javascript', cat_lang, 'Technical'),
  ('Python', 'python', cat_lang, 'Technical'),
  ('Java', 'java', cat_lang, 'Technical');

  -- 3. Frameworks
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('React', 'react', cat_frame, 'Technical'),
  ('Django', 'django', cat_frame, 'Technical');

  -- 4. Databases
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('PostgreSQL', 'postgresql', cat_db, 'Technical'),
  ('MySQL', 'mysql', cat_db, 'Technical');

  -- 5. Soft Skills
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('Communication', 'communication', cat_soft, 'Soft'),
  ('Leadership', 'leadership', cat_soft, 'Soft');
END $$;


-- =========================================================
-- SECTION B: REGISTER EMPLOYERS (Password: 1234)
-- =========================================================
-- Fintech
CALL sp_register_employer('hr_bkash', 'careers@bkash.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'bKash Limited', 'Fintech', 'Dhaka', '01700000001', 'bkash.com');
CALL sp_register_employer('hr_nagad', 'talent@nagad.com.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Nagad', 'Fintech', 'Dhaka', '01700000002', 'nagad.com.bd');
CALL sp_register_employer('hr_dbbl', 'hr@dbbl.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Dutch-Bangla Bank', 'Banking', 'Motijheel', '01700000003', 'dutchbanglabank.com');

-- Telco
CALL sp_register_employer('hr_gp', 'careers@grameenphone.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Grameenphone', 'Telco', 'Bashundhara', '01700000004', 'grameenphone.com');
CALL sp_register_employer('hr_robi', 'jobs@robi.com.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Robi Axiata', 'Telco', 'Gulshan', '01800000005', 'robi.com.bd');
CALL sp_register_employer('hr_banglalink', 'hr@banglalink.net', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Banglalink', 'Telco', 'Gulshan', '01900000006', 'banglalink.net');

-- Software & IT
CALL sp_register_employer('hr_bs23', 'talent@brainstation-23.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Brain Station 23', 'Software', 'Mohakhali', '01711111111', 'brainstation-23.com');
CALL sp_register_employer('hr_tigerit', 'careers@tigerit.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'TigerIT Bangladesh', 'Software', 'Banani', '01722222222', 'tigerit.com');
CALL sp_register_employer('hr_therap', 'jobs@therapbd.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Therap BD', 'HealthTech', 'Banani', '01733333333', 'therapbd.com');
CALL sp_register_employer('hr_enosis', 'jobs@enosis.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Enosis Solutions', 'Software', 'Gulshan', '01744444444', 'enosisbd.com');

-- Corporate
CALL sp_register_employer('hr_unilever', 'talent@unilever.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Unilever BD', 'FMCG', 'Gulshan', '01900000001', 'unilever.com.bd');
CALL sp_register_employer('hr_square', 'hr@squaregroup.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Square Pharmaceuticals', 'Pharma', 'Tejgaon', '01755555555', 'squarepharma.com.bd');
CALL sp_register_employer('hr_walton', 'jobs@waltonbd.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Walton Hi-Tech', 'Electronics', 'Bashundhara', '01600000001', 'waltonbd.com');
CALL sp_register_employer('hr_aarong', 'careers@aarong.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Aarong (BRAC)', 'Retail', 'Tejgaon', '01500000001', 'aarong.com');

-- Startup
CALL sp_register_employer('hr_pathao', 'people@pathao.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Pathao', 'Logistics', 'Gulshan', '01999999999', 'pathao.com');


-- =========================================================
-- SECTION C: REGISTER TRAINERS (Password: 1234)
-- =========================================================
CALL sp_register_trainer('tr_10ms', 'partners@10ms.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', '10 Minute School', 'General Ed', '01600000000');
CALL sp_register_trainer('tr_ostad', 'hello@ostad.app', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Ostad', 'Skill Development', '01800000000');
CALL sp_register_trainer('tr_bohubrihi', 'contact@bohubrihi.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Bohubrihi', 'Professional Courses', '01900000000');
CALL sp_register_trainer('tr_creative', 'info@creativeit.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Creative IT Institute', 'Design & Web', '01500000000');
CALL sp_register_trainer('tr_bitm', 'info@bitm.org.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'BITM', 'Technical Training', '01700000000');
CALL sp_register_trainer('tr_interactive', 'support@interactivecares.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Interactive Cares', 'Career Paths', '01300000000');
CALL sp_register_trainer('tr_shikho', 'hr@shikho.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Shikho', 'Academic', '01400000000');
CALL sp_register_trainer('tr_coders', 'support@coderstrust.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'CodersTrust', 'Freelancing', '01900000002');
CALL sp_register_trainer('tr_pondit', 'info@pondit.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Pondit', 'Programming', '01800000002');
CALL sp_register_trainer('tr_ghoori', 'info@ghoorilearning.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Ghoori Learning', 'Skills', '01700000002');


-- =========================================================
-- SECTION D: REGISTER CANDIDATES (Password: 1234)
-- =========================================================
-- Seniors
CALL sp_register_candidate('cand_tanvir', 'tanvir@gmail.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Tanvir', 'Ahmed', 'Mirpur', 'Dhaka', 'BD', 6);
CALL sp_register_candidate('cand_rahim', 'rahim@sust.edu', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Rahim', 'Uddin', 'Sylhet', 'Sylhet', 'BD', 5);
CALL sp_register_candidate('cand_karim', 'karim@gmail.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Karim', 'Chowdhury', 'Dhanmondi', 'Dhaka', 'BD', 8);
CALL sp_register_candidate('cand_dipu', 'dipu@buet.ac.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Dipu', 'Monwar', 'Uttara', 'Dhaka', 'BD', 4);
CALL sp_register_candidate('cand_shakil', 'shakil@gmail.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Shakil', 'Khan', 'Mohammadpur', 'Dhaka', 'BD', 5);

-- Juniors
CALL sp_register_candidate('cand_jesmin', 'jesmin@nsu.edu', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Jesmin', 'Islam', 'Bashundhara', 'Dhaka', 'BD', 1);
CALL sp_register_candidate('cand_mehedi', 'mehedi@ruet.ac.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Mehedi', 'Hasan', 'Rajshahi', 'Rajshahi', 'BD', 2);
CALL sp_register_candidate('cand_fahim', 'fahim@aust.edu', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Fahim', 'Faysal', 'Tejgaon', 'Dhaka', 'BD', 2);
CALL sp_register_candidate('cand_rifat', 'rifat@aiub.edu', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Rifat', 'Dipto', 'Kuril', 'Dhaka', 'BD', 1);
CALL sp_register_candidate('cand_sara', 'sara@bracu.ac.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Sara', 'Zaman', 'Mohakhali', 'Dhaka', 'BD', 1);

-- Business
CALL sp_register_candidate('cand_sadia', 'sadia@gmail.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Sadia', 'Afrin', 'Gulshan', 'Dhaka', 'BD', 3);
CALL sp_register_candidate('cand_kashem', 'kashem@du.ac.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Abul', 'Kashem', 'Chawkbazar', 'Chittagong', 'BD', 5);
CALL sp_register_candidate('cand_nadia', 'nadia@iub.edu.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Nadia', 'Sultana', 'Bashundhara', 'Dhaka', 'BD', 2);
CALL sp_register_candidate('cand_imran', 'imran@jnu.ac.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Imran', 'Nazir', 'Old Dhaka', 'Dhaka', 'BD', 4);
CALL sp_register_candidate('cand_tisha', 'tisha@ewu.edu.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Tisha', 'Kabir', 'Aftabnagar', 'Dhaka', 'BD', 2);

-- Creative
CALL sp_register_candidate('cand_nusrat', 'nusrat@gmail.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Nusrat', 'Jahan', 'Uttara', 'Dhaka', 'BD', 3);
CALL sp_register_candidate('cand_biplob', 'biplob@art.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Biplob', 'Saha', 'Shahbag', 'Dhaka', 'BD', 5);
CALL sp_register_candidate('cand_lamia', 'lamia@content.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Lamia', 'Rahman', 'Banani', 'Dhaka', 'BD', 2);
CALL sp_register_candidate('cand_zara', 'zara@ux.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Zara', 'Khan', 'Dhanmondi', 'Dhaka', 'BD', 4);
CALL sp_register_candidate('cand_rafiq', 'rafiq@video.com', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Rafiq', 'Islam', 'Mirpur', 'Dhaka', 'BD', 3);

-- Freshers
CALL sp_register_candidate('cand_akib', 'akib@nsu.edu', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Akib', 'Zaman', 'Bashundhara', 'Dhaka', 'BD', 0);
CALL sp_register_candidate('cand_mou', 'mou@du.ac.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Mou', 'Akter', 'Azimpur', 'Dhaka', 'BD', 0);
CALL sp_register_candidate('cand_prottoy', 'prottoy@aiub.edu', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Prottoy', 'Roy', 'Kuril', 'Dhaka', 'BD', 0);
CALL sp_register_candidate('cand_samia', 'samia@bracu.ac.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Samia', 'Haque', 'Mogbazar', 'Dhaka', 'BD', 0);
CALL sp_register_candidate('cand_joy', 'joy@diu.edu.bd', '$2a$10$X0Zyd7/Czk/IuQ8/zdnPeO4wUnOP4/lFfC5Vkb0ciRyym9O5MPjeq', 'Joy', 'Sarkar', 'Dhanmondi', 'Dhaka', 'BD', 0);


-- =========================================================
-- SECTION E: ASSIGN SKILLS & POST JOBS
-- =========================================================
DO $$
DECLARE
    -- IDs
    c_tanvir BIGINT; c_rahim BIGINT; c_karim BIGINT; c_jesmin BIGINT; c_akib BIGINT;
    c_sadia BIGINT; c_nusrat BIGINT;
    
    e_bkash BIGINT; e_gp BIGINT; e_bs23 BIGINT; e_unilever BIGINT; e_pathao BIGINT;
    e_walton BIGINT; e_robi BIGINT;
    
    t_10ms BIGINT; t_ostad BIGINT; t_creative BIGINT;
    
    s_python BIGINT; s_java BIGINT; s_react BIGINT; s_sql BIGINT; s_comm BIGINT;
BEGIN
    -- 1. Fetch Users
    SELECT user_id INTO c_tanvir FROM users WHERE username = 'cand_tanvir';
    SELECT user_id INTO c_rahim FROM users WHERE username = 'cand_rahim';
    SELECT user_id INTO c_jesmin FROM users WHERE username = 'cand_jesmin';
    SELECT user_id INTO c_sadia FROM users WHERE username = 'cand_sadia';
    SELECT user_id INTO c_nusrat FROM users WHERE username = 'cand_nusrat';
    SELECT user_id INTO c_akib FROM users WHERE username = 'cand_akib';
    
    SELECT employer_id INTO e_bkash FROM employer WHERE company_name = 'bKash Limited';
    SELECT employer_id INTO e_gp FROM employer WHERE company_name = 'Grameenphone';
    SELECT employer_id INTO e_bs23 FROM employer WHERE company_name = 'Brain Station 23';
    SELECT employer_id INTO e_unilever FROM employer WHERE company_name = 'Unilever BD';
    SELECT employer_id INTO e_pathao FROM employer WHERE company_name = 'Pathao';
    SELECT employer_id INTO e_walton FROM employer WHERE company_name = 'Walton Hi-Tech';
    SELECT employer_id INTO e_robi FROM employer WHERE company_name = 'Robi Axiata';
    
    SELECT trainer_id INTO t_10ms FROM trainer_profile WHERE organization_name = '10 Minute School';
    SELECT trainer_id INTO t_ostad FROM trainer_profile WHERE organization_name = 'Ostad';
    SELECT trainer_id INTO t_creative FROM trainer_profile WHERE organization_name = 'Creative IT Institute';

    -- 2. Fetch Skills
    SELECT skill_id INTO s_python FROM skill WHERE skill_name = 'Python';
    SELECT skill_id INTO s_java FROM skill WHERE skill_name = 'Java';
    SELECT skill_id INTO s_react FROM skill WHERE skill_name = 'React';
    SELECT skill_id INTO s_sql FROM skill WHERE skill_name = 'PostgreSQL';
    SELECT skill_id INTO s_comm FROM skill WHERE skill_name = 'Communication';

    -- 3. Assign Skills
    CALL sp_add_candidate_skill(c_tanvir, s_python, 'Advanced', 5);
    CALL sp_add_candidate_skill(c_tanvir, s_sql, 'Advanced', 5);
    CALL sp_add_candidate_skill(c_rahim, s_java, 'Advanced', 4);
    CALL sp_add_candidate_skill(c_jesmin, s_react, 'Intermediate', 1);
    CALL sp_add_candidate_skill(c_akib, s_python, 'Beginner', 0);
    CALL sp_add_candidate_skill(c_sadia, s_comm, 'Advanced', 3);
    CALL sp_add_candidate_skill(c_nusrat, 0, 'Advanced', 3, 'Figma'); 

    -- 4. Post Jobs
    CALL sp_post_job(e_bkash, 'Principal Engineer', 'Lead payment gateway.', 'Dhaka', '250k-350k', CURRENT_DATE+60, ARRAY[s_java, s_sql], ARRAY['Advanced', 'Advanced']::skill_proficiency[], ARRAY['System Design?']);
    CALL sp_post_job(e_bkash, 'Product Manager', 'Manage features.', 'Dhaka', '120k-180k', CURRENT_DATE+30, ARRAY[s_comm], ARRAY['Advanced']::skill_proficiency[], ARRAY['Lifecycle?']);
    CALL sp_post_job(e_bs23, 'React Developer', 'Frontend for foreign clients.', 'Mohakhali', '50k-80k', CURRENT_DATE+45, ARRAY[s_react], ARRAY['Intermediate']::skill_proficiency[], ARRAY['Portfolio?']);
    CALL sp_post_job(e_gp, 'Core Network Specialist', '4G infra.', 'Bashundhara', '150k+', CURRENT_DATE+20, NULL, NULL, NULL);
    CALL sp_post_job(e_unilever, 'Territory Manager', 'Sales leadership.', 'Khulna', '70k-90k', CURRENT_DATE+15, ARRAY[s_comm], ARRAY['Advanced']::skill_proficiency[], NULL);

    -- 5. Create Courses
    CALL sp_add_course(t_10ms, 'Corporate Grooming', 'Soft skills.', 30, 'Online', 1500, ARRAY[s_comm]);
    CALL sp_add_course(t_ostad, 'Full Stack MERN', 'Web dev bootcamp.', 120, 'Online', 6000, ARRAY[s_react]);
    CALL sp_add_course(t_creative, 'UI/UX Design Masterclass', 'Learn Figma.', 90, 'Offline', 15000, NULL);
END $$;


-- =========================================================
-- SECTION F: INTERACTIONS (Apply, Enroll, Hire)
-- =========================================================
DO $$
DECLARE
    u_jesmin BIGINT; u_akib BIGINT; u_tanvir BIGINT; u_rahim BIGINT; u_nusrat BIGINT; u_sadia BIGINT;
    j_bs23_react BIGINT; j_bkash_princ BIGINT; j_uni_sales BIGINT;
    e_bs23 BIGINT; e_bkash BIGINT;
    c_mern BIGINT; c_ux BIGINT;
    app_id BIGINT;
BEGIN
    -- Fetch
    SELECT user_id INTO u_jesmin FROM users WHERE username = 'cand_jesmin';
    SELECT user_id INTO u_akib FROM users WHERE username = 'cand_akib';
    SELECT user_id INTO u_tanvir FROM users WHERE username = 'cand_tanvir';
    SELECT user_id INTO u_rahim FROM users WHERE username = 'cand_rahim';
    SELECT user_id INTO u_nusrat FROM users WHERE username = 'cand_nusrat';
    SELECT user_id INTO u_sadia FROM users WHERE username = 'cand_sadia';
    
    SELECT job_id INTO j_bs23_react FROM job WHERE title LIKE 'React%';
    SELECT job_id INTO j_bkash_princ FROM job WHERE title LIKE 'Principal%';
    SELECT job_id INTO j_uni_sales FROM job WHERE title LIKE 'Territory%';
    
    SELECT employer_id INTO e_bs23 FROM employer WHERE company_name = 'Brain Station 23';
    SELECT employer_id INTO e_bkash FROM employer WHERE company_name = 'bKash Limited';

    SELECT course_id INTO c_mern FROM course WHERE title LIKE '%MERN%';
    SELECT course_id INTO c_ux FROM course WHERE title LIKE '%UI/UX%';

    -- 1. Job Applications
    CALL sp_apply_for_job(u_jesmin, j_bs23_react);
    CALL sp_apply_for_job(u_akib, j_bs23_react);
    CALL sp_apply_for_job(u_tanvir, j_bs23_react);
    
    -- Shortlist/Reject
    SELECT application_id INTO app_id FROM application WHERE job_id = j_bs23_react AND candidate_id = u_jesmin;
    CALL sp_shortlist_application(e_bs23, app_id);
    
    SELECT application_id INTO app_id FROM application WHERE job_id = j_bs23_react AND candidate_id = u_akib;
    CALL sp_reject_application(e_bs23, app_id);

    -- 2. Hiring (bKash)
    CALL sp_apply_for_job(u_rahim, j_bkash_princ);
    SELECT application_id INTO app_id FROM application WHERE job_id = j_bkash_princ AND candidate_id = u_rahim;
    CALL sp_shortlist_application(e_bkash, app_id);
    CALL sp_hire_application(e_bkash, app_id);

    -- 3. Course Enrollment
    CALL sp_enroll_course(u_nusrat, c_ux);
    CALL sp_enroll_course(u_akib, c_mern);
    
    -- 4. Cross Domain
    CALL sp_apply_for_job(u_sadia, j_uni_sales);
END $$;

COMMIT;