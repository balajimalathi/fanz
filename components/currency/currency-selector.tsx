"use client";

import { useState } from "react";
import { useCurrencyDetection } from "@/lib/currency/client-detection";
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from "@/lib/currency/currency-config";
import { getCurrencySymbol, formatCurrency } from "@/lib/currency/currency-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencySelectorProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * Currency selector component
 * Allows users to manually select their preferred currency
 */
export function CurrencySelector({ className, showLabel = true }: CurrencySelectorProps) {
  const { currency, updatePreference, loading } = useCurrencyDetection();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCurrencyChange = async (newCurrency: string) => {
    if (!isSupportedCurrency(newCurrency)) {
      return;
    }

    setIsUpdating(true);
    try {
      await updatePreference(newCurrency, "manual");
    } catch (error) {
      console.error("Error updating currency:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={className}>
      {showLabel && (
        <label className="text-sm font-medium mb-2 block">Currency</label>
      )}
      <Select
        value={currency}
        onValueChange={handleCurrencyChange}
        disabled={loading || isUpdating}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select currency">
            {currency && (
              <span>
                {getCurrencySymbol(currency)} {currency}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_CURRENCIES.map((curr) => (
            <SelectItem key={curr} value={curr}>
              <span className="flex items-center gap-2">
                <span>{getCurrencySymbol(curr)}</span>
                <span>{curr}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

