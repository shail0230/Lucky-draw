export const SEED_SQL = `INSERT OR IGNORE INTO coupons (code, offer, detail, pool_order)
  SELECT json_extract(value, '$.code'), json_extract(value, '$.offer'),
    json_extract(value, '$.detail'), json_extract(value, '$.poolOrder') FROM json_each(?)`;

export const ALLOCATE_SQL = `UPDATE coupons SET phone = ?, assigned_at = ?
  WHERE code = (SELECT code FROM coupons WHERE phone IS NULL ORDER BY random() LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM coupons WHERE phone = ?) RETURNING *`;
