import React, { createContext, useContext, useCallback, useState } from "react";
import { TradingData } from "../hooks/useTradingData";

// ✅ Context API seguindo as regras React do Playbooks

interface Portfolio {
  id: string;
  name: string;
  totalValue: number;
  positions: TradingData[];
  lastUpdate: Date;
}

interface TradingContextType {
  // Estado
  portfolio: Portfolio | null;
  selectedSymbol: string | null;
  favorites: string[];

  // Ações
  setPortfolio: (portfolio: Portfolio) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  addToFavorites: (symbol: string) => void;
  removeFromFavorites: (symbol: string) => void;
  isFavorite: (symbol: string) => boolean;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

// ✅ Hook customizado para usar o contexto
export function useTradingContext(): TradingContextType {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error("useTradingContext must be used within TradingProvider");
  }
  return context;
}

// ✅ Provider seguindo composição ao invés de herança
interface TradingProviderProps {
  children: React.ReactNode;
  initialPortfolio?: Portfolio | null;
}

export function TradingProvider({
  children,
  initialPortfolio = null,
}: TradingProviderProps) {
  const [portfolio, setPortfolioState] = useState<Portfolio | null>(
    initialPortfolio,
  );
  const [selectedSymbol, setSelectedSymbolState] = useState<string | null>(
    null,
  );
  const [favorites, setFavorites] = useState<string[]>([]);

  // ✅ useCallback para otimização de performance
  const setPortfolio = useCallback((newPortfolio: Portfolio) => {
    setPortfolioState(newPortfolio);
  }, []);

  const setSelectedSymbol = useCallback((symbol: string | null) => {
    setSelectedSymbolState(symbol);
  }, []);

  const addToFavorites = useCallback((symbol: string) => {
    setFavorites((prev) => {
      if (!prev.includes(symbol)) {
        return [...prev, symbol];
      }
      return prev;
    });
  }, []);

  const removeFromFavorites = useCallback((symbol: string) => {
    setFavorites((prev) => prev.filter((fav) => fav !== symbol));
  }, []);

  const isFavorite = useCallback(
    (symbol: string) => {
      return favorites.includes(symbol);
    },
    [favorites],
  );

  // ✅ Valor do contexto memoizado
  const contextValue = React.useMemo(
    () => ({
      portfolio,
      selectedSymbol,
      favorites,
      setPortfolio,
      setSelectedSymbol,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
    }),
    [
      portfolio,
      selectedSymbol,
      favorites,
      setPortfolio,
      setSelectedSymbol,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
    ],
  );

  return (
    <TradingContext.Provider value={contextValue}>
      {children}
    </TradingContext.Provider>
  );
}

// ✅ Hook para ações específicas do portfolio
export function usePortfolioActions() {
  const { portfolio, setPortfolio } = useTradingContext();

  const updatePosition = useCallback(
    (symbol: string, newData: TradingData) => {
      if (!portfolio) return;

      const updatedPositions = portfolio.positions.map((position) =>
        position.symbol === symbol ? newData : position,
      );

      const updatedPortfolio: Portfolio = {
        ...portfolio,
        positions: updatedPositions,
        totalValue: updatedPositions.reduce((sum, pos) => sum + pos.price, 0),
        lastUpdate: new Date(),
      };

      setPortfolio(updatedPortfolio);
    },
    [portfolio, setPortfolio],
  );

  const addPosition = useCallback(
    (newPosition: TradingData) => {
      if (!portfolio) return;

      const updatedPortfolio: Portfolio = {
        ...portfolio,
        positions: [...portfolio.positions, newPosition],
        totalValue: portfolio.totalValue + newPosition.price,
        lastUpdate: new Date(),
      };

      setPortfolio(updatedPortfolio);
    },
    [portfolio, setPortfolio],
  );

  const removePosition = useCallback(
    (symbol: string) => {
      if (!portfolio) return;

      const positionToRemove = portfolio.positions.find(
        (pos) => pos.symbol === symbol,
      );
      if (!positionToRemove) return;

      const updatedPortfolio: Portfolio = {
        ...portfolio,
        positions: portfolio.positions.filter((pos) => pos.symbol !== symbol),
        totalValue: portfolio.totalValue - positionToRemove.price,
        lastUpdate: new Date(),
      };

      setPortfolio(updatedPortfolio);
    },
    [portfolio, setPortfolio],
  );

  return {
    updatePosition,
    addPosition,
    removePosition,
  };
}
