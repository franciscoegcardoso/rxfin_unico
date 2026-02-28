
-- Remove inactive duplicate income defaults and "teste" items
DELETE FROM default_income_items 
WHERE id IN (
  'fa40376a-bdfe-48e1-b138-76d498f6eb26',
  'e9178b23-745c-491d-b90a-e754e4a1901c',
  '2b9665d5-6ea1-4d13-a780-aa3a2f39ac48',
  '6ba5d1c3-7b95-42eb-9ca2-1812abbce0e1',
  'inc-1770388046655',
  'inc-1770817958045'
);
