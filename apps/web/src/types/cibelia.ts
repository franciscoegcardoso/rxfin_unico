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
  data: CibeliaDataItem[] | null;
  analysis: string | null;
  nextSteps: CibeliaNextStep[] | null;
  cta: string | null;
  _fallback?: boolean;
}
