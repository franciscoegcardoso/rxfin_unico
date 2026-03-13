export interface CibeliaDataItem {
  label: string;
  value: string;
  highlight: boolean;
}

export interface CibeliaNextStep {
  icon: string;
  text: string;
}

export interface CibeliaStructuredResponse {
  greeting: string | null;
  dataTitle?: string | null;       // título dinâmico da seção de dados (ex: "Resumo do período", "Simuladores disponíveis")
  data: CibeliaDataItem[] | null;
  analysis: string | null;
  nextSteps: CibeliaNextStep[] | null;
  cta: string | null;
  _fallback?: boolean;
}
