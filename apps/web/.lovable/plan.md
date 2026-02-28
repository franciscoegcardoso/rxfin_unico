

## Corrigir mapeamento de `fipe_id` em `public/marcas.json`

### Causa raiz
Os `fipe_id` no JSON não correspondem aos IDs reais da API FIPE. Quando o usuário seleciona "Jeep" (API retorna `codigo: "29"`), o `getBrandByFipeId("29")` encontra KIA (que tem `fipe_id: "29"` no JSON), exibindo o logo errado.

### Arquivo a alterar: `public/marcas.json`

Atualizar os seguintes `fipe_id`:

| Marca | Atual → Correto |
|---|---|
| Chrysler | 16 → 12 |
| Citroën | 17 → 13 |
| Dodge | 18 → 17 |
| Jaguar | 27 → 28 |
| Jeep | 28 → 29 |
| Kia | 29 → 31 |
| Land Rover | 31 → 33 |
| Lexus | 33 → 34 |
| Maserati | 34 → 36 |
| Mazda | 35 → 38 |
| Mercedes-Benz | 37 → 39 |
| Mini | 39 → 156 |
| Mitsubishi | 40 → 41 |
| Porsche | 46 → 47 |
| RAM | 47 → 185 |
| SEAT | 51 → 52 |
| Subaru | 53 → 54 |
| Suzuki | 54 → 55 |
| Volvo | 60 → 58 |
| Lamborghini | 30 → 171 |
| BYD | 218 → 238 |
| Chery | 219 → 161 |
| CAOA Chery | 220 → 245 |
| JAC | 217 → 177 |
| GWM | 227 → 240 |
| Yamaha | 121 → 101 |
| Kawasaki | 113 → 85 |
| Harley-Davidson | 110 → 77 |
| Ducati | 106 → 74 |
| Triumph | 119 → 100 |
| KTM | 114 → 87 |
| Scania | 209 → 114 |
| Iveco | 206 → 208 |
| MAN | 207 → 184 |
| DAF | 204 → 197 |

Tesla mantida com ID 224 (placeholder).

### Marcas multi-tipo (carros + caminhões/motos)
IDs mapeados para **carros** (tipo principal). Para motos/caminhões, o fallback `getBrandByName(fb.nome)` em `brand-search-select.tsx` já resolve pelo nome, então o logo aparece corretamente mesmo com ID diferente.

### Nenhuma alteração de código
O mecanismo `getBrandByFipeId() || getBrandByName()` já está correto. Apenas os dados precisam ser corrigidos.

