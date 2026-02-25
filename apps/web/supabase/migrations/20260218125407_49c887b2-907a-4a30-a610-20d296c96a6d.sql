
-- Remove duplicate default_expense_items, keeping the oldest per (name, category_name)
DELETE FROM default_expense_items
WHERE id NOT IN (
  SELECT DISTINCT ON (name, category_name) id
  FROM default_expense_items
  ORDER BY name, category_name, created_at ASC
);

-- Also add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_default_expense_items_name_cat ON default_expense_items (name, category_name);
