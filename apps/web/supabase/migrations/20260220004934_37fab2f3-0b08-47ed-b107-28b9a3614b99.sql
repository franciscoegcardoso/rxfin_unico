-- Sincronizar DB com menu atual: mover 'lancamentos' para o grupo 'Menu Principal'
-- pois no menu ele aparece como item principal (via hardcode), mas no DB está no grupo 'Lançamentos'
UPDATE pages 
SET group_id = '6dad9737-aa0d-449c-8587-9aaa6725d2c3',
    order_in_group = 2
WHERE slug = 'lancamentos';