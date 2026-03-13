// Componente provisório para etapas 1-6 enquanto não são implementadas
export const StepPlaceholder = ({ stepNumber }: { stepNumber: number }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] text-muted-foreground">
    <p className="text-lg font-medium">Etapa {stepNumber}</p>
    <p className="text-sm">Em construção</p>
  </div>
);
