const pool = require('./config/db');

async function fixSchema() {
    try {
        console.log('Checking database schema...');

        // 1. Ensure cv_file column exists and has CORRECT type (BYTEA)
        // If it exists as text, we must convert it.
        await pool.query(`
            DO $$
            BEGIN
                -- Add column if not exists
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'application' AND column_name = 'cv_file') THEN
                    ALTER TABLE application ADD COLUMN cv_file BYTEA;
                ELSE
                    -- If exists, force type to BYTEA
                    ALTER TABLE application ALTER COLUMN cv_file TYPE BYTEA USING cv_file::BYTEA;
                END IF;
            END$$;
        `);
        console.log('Verified column type for cv_file in application table.');

        // 2. Clear old procedures that might be causing overloading conflicts
        // PostgreSql allows overloading, so sp_apply_for_job_custom(..., VARCHAR) 
        // might coexist with sp_apply_for_job_custom(..., BYTEA)
        console.log('Cleaning up and recreating procedures...');
        await pool.query(`
            DROP PROCEDURE IF EXISTS sp_apply_for_job_custom(BIGINT, BIGINT, VARCHAR, BIGINT[], TEXT[]);
            DROP PROCEDURE IF EXISTS sp_apply_for_job_custom(BIGINT, BIGINT, BYTEA, BIGINT[], TEXT[]);
            
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
        `);
        console.log('Procedures recreated successfully.');

        process.exit(0);
    } catch (err) {
        console.error('Error fixing schema:', err);
        process.exit(1);
    }
}

fixSchema();
