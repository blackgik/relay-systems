'use client';

import React, { createContext, useContext, useMemo } from 'react';

const getSymbol = (code: string): string => {
  try {
    return (0)
      .toLocaleString('en', {
        style: 'currency',
        currency: code,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
      .replace(/[\d,.\s]/g, '')
      .trim();
  } catch {
    return code;
  }
};

type CurrencyContextValue = {
  code: string;
  symbol: string;
};

const CurrencyContext = createContext<CurrencyContextValue>({ code: 'NGN', symbol: '₦' });

export const CurrencyProvider = ({
  children,
  code = 'NGN',
}: {
  children: React.ReactNode;
  code?: string;
}) => {
  const value = useMemo(() => ({ code, symbol: getSymbol(code) }), [code]);
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = () => useContext(CurrencyContext);
