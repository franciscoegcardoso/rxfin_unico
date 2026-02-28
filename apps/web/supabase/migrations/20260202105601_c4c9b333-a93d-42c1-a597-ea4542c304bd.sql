-- Atualizar títulos e descrições dos simuladores existentes
UPDATE pages SET 
  title = 'Custo do seu carro',
  description = 'Calcule o custo real do seu veículo incluindo depreciação, IPVA e manutenção'
WHERE slug = 'simulador-fipe';

UPDATE pages SET 
  title = 'Financiamento x Consórcio',
  description = 'Compare financiamento e consórcio para tomar a melhor decisão'
WHERE slug = 'simulador-financiamento';

UPDATE pages SET 
  title = 'Custo da sua hora',
  description = 'Descubra quanto vale sua hora de trabalho'
WHERE slug = 'simulador-custo-hora';

UPDATE pages SET 
  title = '% à vista x parcelado: desconto justo',
  description = 'Calcule o desconto mínimo justo para pagamento à vista'
WHERE slug = 'simulador-desconto-justo';

UPDATE pages SET 
  title = 'Custo de oportunidade do carro',
  description = 'Analise o custo de oportunidade do seu veículo'
WHERE slug = 'simulador-custo-oportunidade-carro';

UPDATE pages SET 
  title = 'Carro A x Carro B',
  description = 'Compare dois veículos lado a lado'
WHERE slug = 'simulador-carro-ab';

-- Remover página "Galeria de Simuladores" (é a própria página /simuladores, não deveria estar listada como card)
DELETE FROM pages WHERE slug = 'simuladores' AND category = 'simuladores';

-- Remover "Simulador Dinâmico" (placeholder que não deveria existir)
DELETE FROM pages WHERE slug = 'simulador-dinamico';

-- Adicionar "Carro próprio vs Alternativas" se não existir
INSERT INTO pages (slug, path, title, description, icon, category, access_level, order_index, is_active_users, is_active_admin)
SELECT 'simulador-carro-alternativas', '/simulador-carro-alternativas', 'Carro próprio vs Alternativas', 'Compare ter um carro próprio com usar apps e aluguéis', 'Car', 'simuladores', 'premium', 97, true, true
WHERE NOT EXISTS (SELECT 1 FROM pages WHERE slug = 'simulador-carro-alternativas');

-- Mover EconoGraph para simuladores
UPDATE pages SET 
  category = 'simuladores',
  order_index = 98,
  access_level = 'premium'
WHERE slug = 'econograph';

-- Reordenar todos os simuladores conforme ordem do menu
UPDATE pages SET order_index = 91 WHERE slug = 'simulador-fipe';
UPDATE pages SET order_index = 92 WHERE slug = 'simulador-financiamento';
UPDATE pages SET order_index = 93 WHERE slug = 'simulador-custo-hora';
UPDATE pages SET order_index = 94 WHERE slug = 'simulador-desconto-justo';
UPDATE pages SET order_index = 95 WHERE slug = 'simulador-custo-oportunidade-carro';
UPDATE pages SET order_index = 96 WHERE slug = 'simulador-carro-ab';
UPDATE pages SET order_index = 97 WHERE slug = 'simulador-carro-alternativas';
UPDATE pages SET order_index = 98 WHERE slug = 'econograph';