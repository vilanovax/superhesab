"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  formatMoney,
  interpretMoneyInput,
  type MoneyInputInterpret,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type MoneyInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: number;
  onValueChange: (value: number) => void;
};

const PARSE_ERROR_FA: Record<
  Extract<MoneyInputInterpret, { status: "error" }>["code"],
  string
> = {
  negative: "مبلغ نمی‌تواند منفی باشد.",
  decimal: "مبلغ باید عدد صحیح باشد. اعشار وارد نکنید.",
  invalid: "مبلغ نامعتبر است.",
  too_large: "مبلغ بیش از سقف مجاز (۲٬۱۴۷٬۴۸۳٬۶۴۷) است.",
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
    const [parseError, setParseError] = React.useState<string | null>(null);

    React.useEffect(() => {
      if (focused) return;
      setDisplay(value > 0 ? formatMoney(value) : "");
    }, [value, focused]);

    function applyRaw(raw: string) {
      if (raw.trim() === "") {
        setDisplay("");
        setParseError(null);
        onValueChange(0);
        return;
      }
      const parsed = interpretMoneyInput(raw);
      if (parsed.status === "empty") {
        setDisplay("");
        setParseError(null);
        onValueChange(0);
        return;
      }
      if (parsed.status === "error") {
        setDisplay(raw);
        setParseError(PARSE_ERROR_FA[parsed.code]);
        onValueChange(0);
        return;
      }
      setParseError(null);
      setDisplay(formatMoney(parsed.value));
      onValueChange(parsed.value);
    }

    return (
      <div className="space-y-1">
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          dir="ltr"
          autoComplete="off"
          aria-invalid={parseError ? true : props["aria-invalid"]}
          className={cn(
            "tabular-nums text-end placeholder:font-normal",
            className,
          )}
          value={display}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onChange={(e) => applyRaw(e.target.value)}
          onBlur={(e) => {
            setFocused(false);
            applyRaw(e.target.value);
            onBlur?.(e);
          }}
        />
        {parseError ? (
          <p className="text-caption text-destructive" role="alert">
            {parseError}
          </p>
        ) : null}
      </div>
    );
  },
);
MoneyInput.displayName = "MoneyInput";
