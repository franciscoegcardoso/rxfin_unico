/**
 * Normaliza nomes de marcas vindos da API FIPE para matching confiável.
 *
 * Exemplos:
 *   "GM - Chevrolet"   → "CHEVROLET"
 *   "VW - Volkswagen"  → "VOLKSWAGEN"
 *   "CAOA Chery/Chery" → "CAOA CHERY"
 *   "  Toyota  "       → "TOYOTA"
 *   "Citroën"          → "CITROEN"
 */
export function normalizeBrandName(name: string): string {
  if (!name) return "";

  let result = name.toUpperCase().trim();

  // "GM - CHEVROLET" → "CHEVROLET"
  if (result.includes(" - ")) {
    result = result.split(" - ").slice(1).join(" - ").trim();
  }

  // "CAOA CHERY/CHERY" → "CAOA CHERY"
  if (result.includes("/")) {
    result = result.split("/")[0].trim();
  }

  // Remove acentos: "CITROËN" → "CITROEN"
  result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return result;
}
