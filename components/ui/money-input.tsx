"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatMoney, parseMoneyInput } from "@/lib/format";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number;
  onValueChange: (value: number) => void;
};

/**
 * Integer money field with live thousand separators (fa-IR).
 * Stores a plain number; displays formatted Persian digits.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, className, onBlur, ...props }, ref) => {
    const [display, setDisplay] = React.useState(
      value > 0 ? formatMoney(value) : "",
    );
    const [focused, setFocused] = React.useState(false);

    React.useEffect(() => {
      if (focused) return;
      setDisplay(value > 0 ? formatMoney(value) : "");
    }, [value, focused]);

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        dir="ltr"
        autoComplete="off"
        className={cn("tabular-nums", className)}
        value={display}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw.trim() === "") {
            setDisplay("");
            onValueChange(0);
            return;
          }
          const parsed = parseMoneyInput(raw);
          setDisplay(formatMoney(parsed));
          onValueChange(parsed);
        }}
        onBlur={(e) => {
          setFocused(false);
          const parsed = parseMoneyInput(e.target.value);
          setDisplay(parsed > 0 ? formatMoney(parsed) : "");
          onValueChange(parsed);
          onBlur?.(e);
        }}
      />
    );
  },
);
MoneyInput.displayName = "MoneyInput";
