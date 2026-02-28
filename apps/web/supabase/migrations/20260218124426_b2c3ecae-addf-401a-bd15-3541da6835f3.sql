
-- Clean up duplicate user_income_items (keep the oldest record per user+name)
DELETE FROM user_income_items 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, name) id 
  FROM user_income_items 
  ORDER BY user_id, name, created_at ASC
);

-- Clean up duplicate user_expense_items (keep the oldest record per user+name+category_id)
DELETE FROM user_expense_items 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, name, category_id) id 
  FROM user_expense_items 
  ORDER BY user_id, name, category_id, created_at ASC
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_income_items_user_name ON user_income_items (user_id, name);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_expense_items_user_name_cat ON user_expense_items (user_id, name, category_id);
