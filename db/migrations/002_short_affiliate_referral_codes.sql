BEGIN;

CREATE TABLE IF NOT EXISTS affiliate_referral_code_aliases (
  code         TEXT PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_affiliate_referral_code_aliases_affiliate
  ON affiliate_referral_code_aliases(affiliate_id);

INSERT INTO affiliate_referral_code_aliases (code, affiliate_id)
SELECT referral_code::text, id
  FROM affiliates
ON CONFLICT (code) DO NOTHING;

ALTER TABLE affiliates ALTER COLUMN referral_code DROP DEFAULT;
ALTER TABLE affiliates
  ALTER COLUMN referral_code TYPE TEXT
  USING referral_code::text;

DO $$
DECLARE
  affiliate_row RECORD;
  short_code TEXT;
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
BEGIN
  FOR affiliate_row IN
    SELECT id
      FROM affiliates
     WHERE referral_code ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    LOOP
      SELECT string_agg(
               substr(alphabet, floor(random() * length(alphabet))::int + 1, 1),
               ''
             )
        INTO short_code
        FROM generate_series(1, 8);

      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM affiliates WHERE UPPER(referral_code) = short_code
      ) AND NOT EXISTS (
        SELECT 1 FROM affiliate_referral_code_aliases WHERE UPPER(code) = short_code
      );
    END LOOP;

    UPDATE affiliates
       SET referral_code = short_code
     WHERE id = affiliate_row.id;
  END LOOP;
END
$$;

COMMIT;
