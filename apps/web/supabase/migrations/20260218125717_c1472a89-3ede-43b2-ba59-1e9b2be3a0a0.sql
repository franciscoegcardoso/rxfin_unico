
-- 1. Populate expense_categories from distinct category names in default_expense_items
-- Pick one canonical category_id per category_name (the most used one)
WITH canonical AS (
  SELECT DISTINCT ON (category_name) category_id, category_name
  FROM default_expense_items
  WHERE category_name != category_id  -- skip corrupted rows
  ORDER BY category_name, category_id
)
INSERT INTO expense_categories (id, name, order_index, is_active)
SELECT 
  category_id, 
  category_name,
  ROW_NUMBER() OVER (ORDER BY category_name) * 10 as order_index,
  true
FROM canonical
ON CONFLICT (id) DO NOTHING;

-- 2. Normalize category_ids in default_expense_items to use canonical IDs
WITH canonical AS (
  SELECT id, name FROM expense_categories
)
UPDATE default_expense_items dei
SET category_id = c.id
FROM canonical c
WHERE dei.category_name = c.name
  AND dei.category_id != c.id;

-- 3. Delete the corrupted row where category_name = category_id (a UUID)
DELETE FROM default_expense_items WHERE category_name = category_id AND category_name NOT IN (SELECT name FROM expense_categories);
