-- Split shared sticker_square into sticker_square_milieu / sticker_square_grande.
-- Data-only migration (no schema change). Safe on an empty DB. Hand-written, no snapshot.
-- Reservations are one row per unit (quantity 1) and not product-specific; per order, the first
-- N_milieu rows (by id) become milieu, the rest grande (N_milieu = that order's milieu units).
-- ACTIVE/RELEASED/CONSUMED state is preserved per row. Movements: any remaining sticker_square
-- is renamed to milieu (SKU attribution unrecoverable; founder corrects via "Hasil opname").
BEGIN;

UPDATE order_items
SET recipe = (recipe - 'sticker_square') || jsonb_build_object('sticker_square_' || product_id, recipe -> 'sticker_square')
WHERE product_id IN ('milieu', 'grande') AND recipe ? 'sticker_square';

DO $$
DECLARE bad int;
BEGIN
  SELECT count(*) INTO bad FROM reservations WHERE item_id = 'sticker_square' AND quantity <> 1;
  IF bad > 0 THEN RAISE EXCEPTION 'sticker_square reservations with quantity <> 1: %', bad; END IF;
  SELECT count(*) INTO bad FROM (
    SELECT r.order_id FROM reservations r WHERE r.item_id = 'sticker_square' GROUP BY r.order_id
    HAVING count(*) <> (SELECT coalesce(sum(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = r.order_id)
  ) x;
  IF bad > 0 THEN RAISE EXCEPTION 'sticker_square reservation row count <> total units for % orders', bad; END IF;
END $$;

WITH numbered AS (
  SELECT r.id, row_number() OVER (PARTITION BY r.order_id ORDER BY r.id) AS rn,
    (SELECT coalesce(sum(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = r.order_id AND oi.product_id = 'milieu') AS n_milieu
  FROM reservations r WHERE r.item_id = 'sticker_square'
)
UPDATE reservations r
SET item_id = CASE WHEN n.rn <= n.n_milieu THEN 'sticker_square_milieu' ELSE 'sticker_square_grande' END
FROM numbered n WHERE r.id = n.id;

UPDATE movements SET item_id = 'sticker_square_milieu' WHERE item_id = 'sticker_square';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM movements WHERE item_id = 'sticker_square')
    OR EXISTS (SELECT 1 FROM reservations WHERE item_id = 'sticker_square')
    OR EXISTS (SELECT 1 FROM order_items WHERE recipe ? 'sticker_square') THEN
    RAISE EXCEPTION 'sticker_square references remain after migration';
  END IF;
END $$;

COMMIT;
