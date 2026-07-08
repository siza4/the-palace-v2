ALTER TABLE members
ADD COLUMN IF NOT EXISTS royal_office text DEFAULT 'Observer';


ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'ACTIVE';
