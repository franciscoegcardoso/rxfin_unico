interface SimulatorsSectionProps {
  appUrl: string;
}

export function SimulatorsSection({ appUrl }: SimulatorsSectionProps) {
  return (
    <section id="simulators" className="py-16 px-4" aria-label="Simuladores">
      <a href={`${appUrl}/simulador-fipe`}>Simular agora</a>
      <a href={`${appUrl}/simuladores`}>Ver simuladores</a>
    </section>
  );
}
