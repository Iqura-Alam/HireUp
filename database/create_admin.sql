-- Create a default Admin user
-- Email: admin@hireup.com
-- Password: admin123

INSERT INTO users (username, email, password_hash, role, is_active)
VALUES (
    'admin', 
    'admin@hireup.com', 
    '$2a$10$WdPUCi1kL0mtZj/UQ5m23ubamqtq/2L.vCeHw/PSb9sS1kPNxZ4me', 
    'Admin', 
    TRUE
)
ON CONFLICT (email) DO NOTHING;
