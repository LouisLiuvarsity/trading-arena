import { createContext, useContext, useState, type ReactNode } from 'react';
import { TRADING_PAIR, type TradingPairConfig } from '@shared/tradingPair';

interface TradingPairContextValue {
  pair: TradingPairConfig;
  setPair: (pair: TradingPairConfig) => void;
}

const TradingPairCtx = createContext<TradingPairContextValue>({
  pair: TRADING_PAIR,
  setPair: () => {},
});

export function TradingPairProvider({ children }: { children: ReactNode }) {
  const [pair, setPair] = useState<TradingPairConfig>(TRADING_PAIR);
  return (
    <TradingPairCtx.Provider value={{ pair, setPair }}>
      {children}
    </TradingPairCtx.Provider>
  );
}

export function useTradingPair(): TradingPairConfig {
  return useContext(TradingPairCtx).pair;
}

export function useSetTradingPair(): (pair: TradingPairConfig) => void {
  return useContext(TradingPairCtx).setPair;
}
