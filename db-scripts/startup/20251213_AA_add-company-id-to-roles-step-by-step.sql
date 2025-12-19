-- Migration script to add company_id column to nbnext_roles table
-- Run each step separately in pgAdmin if you encounter transaction errors
-- 
-- If you see "current transaction is aborted" error, run: ROLLBACK; first

-- ============================================
-- STEP 1: Rollback any existing transaction
-- ============================================
ROLLBACK;

-- ============================================
-- STEP 2: Remove existing unique constraint on 'name' column
-- ============================================
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    SELECT tc.constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
        ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'nbnext_roles'
        AND tc.constraint_type = 'UNIQUE'
        AND ccu.column_name = 'name'
        AND tc.table_schema = current_schema()
    LIMIT 1;

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE nbnext_roles DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
        RAISE NOTICE 'Dropped constraint: %', constraint_name_var;
    ELSE
        RAISE NOTICE 'No unique constraint found on name column';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing constraint: %', SQLERRM;
END $$;

-- ============================================
-- STEP 3: Add company_id column
-- ============================================
ALTER TABLE nbnext_roles 
ADD COLUMN IF NOT EXISTS company_id UUID NULL;

-- ============================================
-- STEP 4: Drop existing foreign key constraint if it exists
-- ============================================
ALTER TABLE nbnext_roles
DROP CONSTRAINT IF EXISTS fk_nbnext_roles_company_id;

-- ============================================
-- STEP 5: Add foreign key constraint
-- ============================================
ALTER TABLE nbnext_roles
ADD CONSTRAINT fk_nbnext_roles_company_id
FOREIGN KEY (company_id)
REFERENCES nbnext_company(id)
ON UPDATE CASCADE
ON DELETE CASCADE;

-- ============================================
-- STEP 6: Drop existing index if it exists
-- ============================================
DROP INDEX IF EXISTS nbnext_roles_name_company_id_unique;

-- ============================================
-- STEP 7: Add composite unique index on [name, company_id]
-- ============================================
CREATE UNIQUE INDEX nbnext_roles_name_company_id_unique
ON nbnext_roles(name, company_id);

