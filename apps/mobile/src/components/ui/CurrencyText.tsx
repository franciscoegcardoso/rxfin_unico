import { Text, TextStyle } from 'react-native'
import { theme } from '../../lib/theme'

interface Props {
  valor: number
  style?: TextStyle
  positivo?: boolean  // força verde
  negativo?: boolean  // força vermelho
  automatico?: boolean // verde se > 0, vermelho se < 0
  tamanho?: number
  negrito?: boolean
}

export function CurrencyText({ valor, style, positivo, negativo, automatico, tamanho = 14, negrito = false }: Props) {
  const formatado = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  let cor = theme.textPrimary
  if (positivo) cor = theme.income
  else if (negativo) cor = theme.expense
  else if (automatico) cor = valor >= 0 ? theme.income : theme.expense

  return (
    <Text style={[{ fontSize: tamanho, color: cor, fontWeight: negrito ? '700' : '400' }, style]}>
      {formatado}
    </Text>
  )
}