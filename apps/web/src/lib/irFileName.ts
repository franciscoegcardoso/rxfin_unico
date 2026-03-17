/**
 * Nome do arquivo no padrão Receita Federal: CPF-IRPF-A-{exercício}-{calendário}-DEC.pdf
 * Apenas formata o texto exibido; não renomeia o arquivo no storage.
 */
export function formatIRFileName(
  anoExercicio: number,
  anoCalendario: number,
  cpf?: string | null
): string {
  const cpfDigits = cpf ? String(cpf).replace(/\D/g, '') : '';
  const prefix = cpfDigits.length === 11 ? cpfDigits : 'SEU-CPF';
  return `${prefix}-IRPF-A-${anoExercicio}-${anoCalendario}-DEC.pdf`;
}
