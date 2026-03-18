/**
 * Mapeamento estático de tickers cripto → logo URL (CoinGecko CDN)
 * Evita chamadas de API adicionais para os principais ativos.
 */
export const CRYPTO_LOGO_MAP: Record<string, string> = {
  BTC:   'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH:   'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL:   'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  BNB:   'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  USDT:  'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC:  'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  ADA:   'https://assets.coingecko.com/coins/images/975/small/cardano.png',
  XRP:   'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
  DOGE:  'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
  DOT:   'https://assets.coingecko.com/coins/images/12171/small/polkadot.png',
  AVAX:  'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
  MATIC: 'https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png',
  LINK:  'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  LTC:   'https://assets.coingecko.com/coins/images/2/small/litecoin.png',
  UNI:   'https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png',
};
