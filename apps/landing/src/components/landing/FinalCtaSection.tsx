interface FinalCtaSectionProps {
  appUrl: string;
}

export function FinalCtaSection({ appUrl }: FinalCtaSectionProps) {
  return (
    <section id="final-cta" className="py-16 px-4" aria-label="Cadastre-se">
      <a href={`${appUrl}/auth`}>Cadastrar</a>
    </section>
  );
}
