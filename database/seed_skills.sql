-- Seed Skill Categories
INSERT INTO skill_category (category_name) VALUES 
('Languages'), ('Frameworks'), ('Tools'), ('Databases'), ('Soft Skills')
ON CONFLICT (category_name) DO NOTHING;

-- Seed Skills
DO $$
DECLARE
  cat_lang BIGINT;
  cat_frame BIGINT;
  cat_tool BIGINT;
  cat_db BIGINT;
  cat_soft BIGINT;
BEGIN
  SELECT category_id INTO cat_lang FROM skill_category WHERE category_name = 'Languages';
  SELECT category_id INTO cat_frame FROM skill_category WHERE category_name = 'Frameworks';
  SELECT category_id INTO cat_tool FROM skill_category WHERE category_name = 'Tools';
  SELECT category_id INTO cat_db FROM skill_category WHERE category_name = 'Databases';
  SELECT category_id INTO cat_soft FROM skill_category WHERE category_name = 'Soft Skills';

  -- Special "Other" Skill
  INSERT INTO skill (skill_id, skill_name, skill_slug, type) VALUES (0, 'Other', 'other', 'Technical') ON CONFLICT (skill_id) DO NOTHING;

  -- Languages
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('JavaScript', 'javascript', cat_lang, 'Technical'),
  ('Python', 'python', cat_lang, 'Technical'),
  ('Java', 'java', cat_lang, 'Technical'),
  ('C++', 'c-plus-plus', cat_lang, 'Technical'),
  ('Go', 'go', cat_lang, 'Technical'),
  ('Ruby', 'ruby', cat_lang, 'Technical'),
  ('PHP', 'php', cat_lang, 'Technical')
  ON CONFLICT (skill_slug) DO NOTHING;

  -- Frameworks
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('React', 'react', cat_frame, 'Technical'),
  ('Node.js', 'node-js', cat_frame, 'Technical'),
  ('Django', 'django', cat_frame, 'Technical'),
  ('Spring Boot', 'spring-boot', cat_frame, 'Technical'),
  ('Flutter', 'flutter', cat_frame, 'Technical')
  ON CONFLICT (skill_slug) DO NOTHING;

  -- Databases
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('PostgreSQL', 'postgresql', cat_db, 'Technical'),
  ('MySQL', 'mysql', cat_db, 'Technical'),
  ('MongoDB', 'mongodb', cat_db, 'Technical')
  ON CONFLICT (skill_slug) DO NOTHING;
  
  -- Tools
  INSERT INTO skill (skill_name, skill_slug, category_id, type) VALUES 
  ('Docker', 'docker', cat_tool, 'Technical'),
  ('Git', 'git', cat_tool, 'Technical'),
  ('AWS', 'aws', cat_tool, 'Technical')
  ON CONFLICT (skill_slug) DO NOTHING;

END $$;
