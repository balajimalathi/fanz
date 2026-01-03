"use client";

/**
 * Client-side currency detection hook
 * Detects and manages user's currency preference
 */

import { useEffect, useState, useCallback } from "react";

export interface CurrencyPreference {
  currency: string;
  source: "ip" | "browser" | "manual" | null;
  loading: boolean;
}

const CURRENCY_STORAGE_KEY = "user_currency_preference";

/**
 * Hook to detect and manage user's currency preference
 */
export function useCurrencyDetection() {
  const [preference, setPreference] = useState<CurrencyPreference>({
    currency: "USD",
    source: null,
    loading: true,
  });

  /**
   * Detect currency from browser locale
   */
  const detectFromBrowser = useCallback((): string => {
    try {
      const locale = navigator.language || "en-US";
      const formatter = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
      });
      const resolvedOptions = formatter.resolvedOptions();
      return resolvedOptions.currency || "USD";
    } catch {
      return "USD";
    }
  }, []);

  /**
   * Load currency preference from localStorage or detect
   */
  const loadPreference = useCallback(async () => {
    try {
      // Check localStorage first
      const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreference({
          currency: parsed.currency || "USD",
          source: parsed.source || "manual",
          loading: false,
        });
        return;
      }

      // Try to get from server (if user is logged in)
      try {
        const response = await fetch("/api/currency/preference");
        if (response.ok) {
          const data = await response.json();
          if (data.currency) {
            setPreference({
              currency: data.currency,
              source: data.source || "manual",
              loading: false,
            });
            // Store in localStorage
            localStorage.setItem(
              CURRENCY_STORAGE_KEY,
              JSON.stringify({ currency: data.currency, source: data.source })
            );
            return;
          }
        }
      } catch (error) {
        console.error("Error fetching currency preference:", error);
      }

      // Auto-detect from server
      try {
        const detectResponse = await fetch("/api/currency/detect");
        if (detectResponse.ok) {
          const detectData = await detectResponse.json();
          const currency = detectData.currency || detectFromBrowser();
          setPreference({
            currency,
            source: detectData.source || "browser",
            loading: false,
          });
          // Store in localStorage
          localStorage.setItem(
            CURRENCY_STORAGE_KEY,
            JSON.stringify({ currency, source: detectData.source || "browser" })
          );
          return;
        }
      } catch (error) {
        console.error("Error detecting currency:", error);
      }

      // Fallback to browser locale
      const currency = detectFromBrowser();
      setPreference({
        currency,
        source: "browser",
        loading: false,
      });
      localStorage.setItem(
        CURRENCY_STORAGE_KEY,
        JSON.stringify({ currency, source: "browser" })
      );
    } catch (error) {
      console.error("Error loading currency preference:", error);
      setPreference({
        currency: "USD",
        source: null,
        loading: false,
      });
    }
  }, [detectFromBrowser]);

  /**
   * Update currency preference
   */
  const updatePreference = useCallback(
    async (currency: string, source: "ip" | "browser" | "manual" = "manual") => {
      setPreference((prev) => ({ ...prev, loading: true }));

      try {
        // Update on server (if user is logged in)
        try {
          await fetch("/api/currency/preference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currency, source }),
          });
        } catch (error) {
          console.error("Error updating currency preference on server:", error);
        }

        // Update local state and storage
        setPreference({
          currency: currency.toUpperCase(),
          source,
          loading: false,
        });
        localStorage.setItem(
          CURRENCY_STORAGE_KEY,
          JSON.stringify({ currency: currency.toUpperCase(), source })
        );
      } catch (error) {
        console.error("Error updating currency preference:", error);
        setPreference((prev) => ({ ...prev, loading: false }));
      }
    },
    []
  );

  // Load preference on mount
  useEffect(() => {
    loadPreference();
  }, [loadPreference]);

  return {
    currency: preference.currency,
    source: preference.source,
    loading: preference.loading,
    updatePreference,
    reload: loadPreference,
  };
}

