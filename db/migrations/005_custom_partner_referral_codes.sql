BEGIN;

UPDATE partners
   SET partner_code = UPPER(partner_code)
 WHERE partner_code <> UPPER(partner_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'partners_partner_code_format_check'
       AND conrelid = 'partners'::regclass
  ) THEN
    ALTER TABLE partners
      ADD CONSTRAINT partners_partner_code_format_check
      CHECK (partner_code ~ '^[A-Z0-9]{3,20}$');
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS partners_partner_code_case_insensitive_unique
  ON partners (LOWER(partner_code));

COMMIT;
