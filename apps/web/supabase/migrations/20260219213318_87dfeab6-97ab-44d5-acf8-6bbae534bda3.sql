
-- Update titles and descriptions for all simulators
UPDATE public.pages SET title = 'Valor de mercado (FIPE) e Custo real de propriedade', description = 'Não olhe apenas o preço de compra e venda. Acesse o histórico completo de preços e projete quanto esse veículo realmente custa para o seu bolso.' WHERE slug = 'simulador-fipe';

UPDATE public.pages SET title = 'Financiamento Vs Consórcio', description = 'Descubra qual a melhor forma de pagar. Compare taxas, Custo Efetivo Total (CET) e veja a composição real das parcelas antes de assinar o contrato.', path = '/financiamento-consorcio', slug = 'financiamento-consorcio' WHERE slug = 'simulador-financiamento';

UPDATE public.pages SET title = 'Simulador: Quanto vale sua Hora?', description = 'Descubra o valor real do seu tempo. Uma ferramenta essencial para priorizar tarefas e tomar decisões de como e onde investir o seu tempo.' WHERE slug = 'simulador-custo-hora';

UPDATE public.pages SET title = 'Carro Próprio Vs Alternativas', description = 'Ter um carro na garagem é investimento ou despesa? Entenda o custo de oportunidade e veja se aplicativos ou aluguel valem mais a pena para você.' WHERE slug = 'simulador-custo-oportunidade-carro';

UPDATE public.pages SET title = 'Comparador: Carro A vs B', description = 'Dúvida entre dois modelos? Projete qual deles oferece a melhor eficiência financeira no tempo, considerando todas as despesas atribuídas a eles.' WHERE slug = 'simulador-carro-ab';

UPDATE public.pages SET title = 'Mestre da Negociação: Desconto Justo', description = 'À vista ou parcelado? Calcule o desconto mínimo que você deve exigir para que pagar antecipado seja matematicamente vantajoso.' WHERE slug = 'simulador-desconto-justo';

UPDATE public.pages SET title = 'EconoGraph: Histórico de índices econômicos', description = 'Entenda o passado para não errar no futuro. Visualize a evolução dos índices econômicos e tenha dados reais para projetar suas metas financeiras com segurança.' WHERE slug = 'econograph';

UPDATE public.pages SET title = 'SOS Quitação de dívidas', description = 'Saia do vermelho com estratégia. Simule cenários de portabilidade de dívida e construa um plano de ação real para retomar o controle da sua vida.' WHERE slug = 'renegociacao-dividas';

-- Remove "Comparativo de Carros" (hide it completely)
UPDATE public.pages SET is_active_users = false, is_active_admin = false, show_when_unavailable = false WHERE slug = 'simulador-comparativo-carro';
