/**
 * Mapeamento centralizado de categorias de despesa (nome → id).
 */

export const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'Alimentação':    '408a9339-ca72-4d11-bf67-a699ffe57f04',
  'Contas da Casa': '00b13efb-b95e-4aae-8711-11c85812a0ba',
  'Investimentos':  '45fc1ba7-a8c6-49d3-b58e-5fad33a4e6f2',
  'Lazer':          '78aad506-048f-4f5b-9e82-dc3105f4d28c',
  'Pessoal':        '94c7bd64-9d64-4b7f-bb9a-b648df91807f',
  'Pets':           '35db5a0c-9558-4a97-8ecf-77b5aabeec2c',
  'Saúde':          'b6805423-e8d9-4ba1-a41b-f7b179486e6a',
  'Transporte':     '7441af32-6d4b-4c61-b2f0-1fa83c7ee944',
};

export const getCategoryId = (categoryName: string): string | null =>
  EXPENSE_CATEGORY_MAP[categoryName] ?? null;

export const getCategoryName = (categoryId: string): string | null =>
  Object.entries(EXPENSE_CATEGORY_MAP).find(([, id]) => id === categoryId)?.[0] ?? null;
// sync
