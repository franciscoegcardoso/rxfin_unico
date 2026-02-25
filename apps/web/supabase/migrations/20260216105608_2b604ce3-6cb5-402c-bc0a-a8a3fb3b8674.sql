
-- 1. Create new "Controles" group
INSERT INTO page_groups (id, name, slug, icon, order_index)
VALUES ('f1a2b3c4-d5e6-7890-abcd-ef1234567890', 'Controles', 'controles', 'ClipboardList', 2)
ON CONFLICT (slug) DO NOTHING;

-- 2. Shift existing groups order_index to make room
-- Planejamento was 2, move to 3; Simuladores 3->4; Configurações 4->5; Administração 5->6
UPDATE page_groups SET order_index = 6 WHERE slug = 'administracao';
UPDATE page_groups SET order_index = 5 WHERE slug = 'configuracoes';
UPDATE page_groups SET order_index = 4 WHERE slug = 'simuladores';
UPDATE page_groups SET order_index = 3 WHERE slug = 'planejamento';
UPDATE page_groups SET order_index = 2 WHERE slug = 'controles';

-- 3. Move "Meu IR" from menu-principal to planejamento
UPDATE pages 
SET group_id = 'ad467023-9cd7-4186-81fe-81f7756c31d4', order_in_group = 8
WHERE slug = 'meu-ir';

-- 4. Move "Gestão de Veículos" from lancamentos to planejamento
UPDATE pages 
SET group_id = 'ad467023-9cd7-4186-81fe-81f7756c31d4', order_in_group = 9
WHERE slug = 'gestao-veiculos';

-- 5. Move Registro de Compras, Pacotes de Orçamento, Presentes, Sonhos to new "Controles" group
UPDATE pages 
SET group_id = 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', order_in_group = 0
WHERE slug = 'registro-compras';

UPDATE pages 
SET group_id = 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', order_in_group = 1
WHERE slug = 'pacotes-orcamento';

UPDATE pages 
SET group_id = 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', order_in_group = 2
WHERE slug = 'presentes';

UPDATE pages 
SET group_id = 'f1a2b3c4-d5e6-7890-abcd-ef1234567890', order_in_group = 3
WHERE slug = 'sonhos';
