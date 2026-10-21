import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export const CURRENCIES = [
  { code: 'USD', symbol: '$',    flag: '🇺🇸', label: 'USD ($)',    rate: 1.0,     locale: 'en-US' },
  { code: 'GBP', symbol: '£',    flag: '🇬🇧', label: 'GBP (£)',    rate: 0.787,   locale: 'en-GB' },
  { code: 'EUR', symbol: '€',    flag: '🇪🇺', label: 'EUR (€)',    rate: 0.894,   locale: 'de-DE' },
  { code: 'INR', symbol: '₹',    flag: '🇮🇳', label: 'INR (₹)',    rate: 94.596,  locale: 'en-IN' },
  { code: 'AED', symbol: 'د.إ', flag: '🇦🇪', label: 'AED (د.إ)', rate: 3.6725,  locale: 'ar-AE' },
  { code: 'AUD', symbol: 'A$',   flag: '🇦🇺', label: 'AUD (A$)',   rate: 1.557,   locale: 'en-AU' },
  { code: 'CAD', symbol: 'C$',   flag: '🇨🇦', label: 'CAD (C$)',   rate: 1.362,   locale: 'en-CA' },
  { code: 'SGD', symbol: 'S$',   flag: '🇸🇬', label: 'SGD (S$)',   rate: 1.298,   locale: 'en-SG' },
];

const COUNTRY_MAP = {
  'United Kingdom': 'GBP', 'UK': 'GBP',
  'India': 'INR',
  'United Arab Emirates': 'AED', 'UAE': 'AED',
  'Germany': 'EUR', 'France': 'EUR', 'Spain': 'EUR', 'Italy': 'EUR', 'Netherlands': 'EUR',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'Singapore': 'SGD',
  'USA': 'USD', 'United States': 'USD',
};

const LS_KEY      = 'vcso-owner-currency';
const LS_BILLING  = 'vcso-billing-details';

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children, clients }) {
  const [code, setCode] = useState(() => {
    // 1. Manual selector override wins
    const saved = localStorage.getItem(LS_KEY);
    if (saved && CURRENCIES.find(c => c.code === saved)) return saved;
    // 2. Preferred currency saved in Billing Details
    try {
      const bd = JSON.parse(localStorage.getItem(LS_BILLING) || '{}');
      if (bd.preferredCurrency && CURRENCIES.find(c => c.code === bd.preferredCurrency))
        return bd.preferredCurrency;
      // 3. Auto-detect from country in Billing Details
      if (bd.country) {
        const detected = COUNTRY_MAP[bd.country];
        if (detected) return detected;
      }
    } catch {}
    return 'USD';
  });

  // Re-sync when Billing Details change (listen to storage events from other tabs)
  useEffect(() => {
    function onStorage(e) {
      if (e.key !== LS_BILLING) return;
      if (localStorage.getItem(LS_KEY)) return; // manual override active
      try {
        const bd = JSON.parse(e.newValue || '{}');
        if (bd.preferredCurrency && CURRENCIES.find(c => c.code === bd.preferredCurrency))
          setCode(bd.preferredCurrency);
        else if (bd.country && COUNTRY_MAP[bd.country])
          setCode(COUNTRY_MAP[bd.country]);
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Auto-detect from client data if no saved preference
  useEffect(() => {
    if (localStorage.getItem(LS_KEY)) return; // manual override wins
    try {
      const bd = JSON.parse(localStorage.getItem(LS_BILLING) || '{}');
      if (bd.preferredCurrency || bd.country) return; // billing details have preference
    } catch {}
    if (!clients || clients.length === 0) return;
    for (const c of clients) {
      const country = c.country || c.companyCountry || '';
      const detected = COUNTRY_MAP[country];
      if (detected) { setCode(detected); break; }
    }
  }, [clients]);

  const setCurrency = useCallback((newCode) => {
    localStorage.setItem(LS_KEY, newCode);
    setCode(newCode);
  }, []);

  /* Call this after saving Billing Details to re-sync the currency */
  const syncFromBillingDetails = useCallback(() => {
    if (localStorage.getItem(LS_KEY)) return; // manual override active
    try {
      const bd = JSON.parse(localStorage.getItem(LS_BILLING) || '{}');
      if (bd.preferredCurrency && CURRENCIES.find(c => c.code === bd.preferredCurrency))
        setCode(bd.preferredCurrency);
      else if (bd.country && COUNTRY_MAP[bd.country])
        setCode(COUNTRY_MAP[bd.country]);
    } catch {}
  }, []);

  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  // fmt converts a USD value to selected currency and formats it.
  // max 2 decimal places, trailing zeros stripped:
  //   317.111111 → $317.11 | 30000 → ₹30,000 | 485.876 → A$485.88
  const fmt = useCallback((n) => {
    const converted = (Number(n) || 0) * currency.rate;
    const opts = { minimumFractionDigits: 0, maximumFractionDigits: 2 };
    if (currency.code === 'INR') {
      return currency.symbol + converted.toLocaleString('en-IN', opts);
    }
    if (currency.code === 'AED') {
      return currency.symbol + ' ' + converted.toLocaleString('en-US', opts);
    }
    return currency.symbol + converted.toLocaleString('en-US', opts);
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ code, currency, setCurrency, syncFromBillingDetails, fmt, currencies: CURRENCIES }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback when used outside provider (e.g. shared components)
    return {
      code: 'USD',
      currency: CURRENCIES[0],
      setCurrency: () => {},
      fmt: n => '$' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
      currencies: CURRENCIES,
    };
  }
  return ctx;
}
