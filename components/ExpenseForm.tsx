"use client";

import { useEffect, useMemo, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExpense } from "@/app/actions/expense";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { memberLabel, type SpaceCurrency } from "@/lib/format";
import { formatCurrency } from "@/lib/formatters";
import { asMoney, splitEqual } from "@/lib/money";
import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense";
import { cn } from "@/lib/utils";

function parseAmountInput(raw: string): number {
  if (raw === "" || raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export type ExpenseMember = {
  userId: string;
  name: string | null;
  phone: string;
  isVirtual?: boolean;
};

type ExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  currency?: SpaceCurrency;
  onSuccess?: () => void;
};

function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-2xl border border-border/60 bg-white/70 p-4 backdrop-blur-sm",
        className,
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function ExpenseForm({
  spaceId,
  currentUserId,
  members,
  currency: _currency = "TOMAN",
  onSuccess,
}: ExpenseFormProps) {
  const [pending, startTransition] = useTransition();

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      spaceId,
      title: "",
      totalAmount: 0,
      paidById: currentUserId,
      splitMode: "EQUAL",
      splits: members.map((m) => ({
        userId: m.userId,
        amount: 0,
        selected: true,
      })),
    },
  });

  const splitMode = useWatch({ control: form.control, name: "splitMode" });
  const totalAmount = useWatch({ control: form.control, name: "totalAmount" });
  const splits = useWatch({ control: form.control, name: "splits" });

  const selectedIndexes = useMemo(
    () =>
      (splits ?? [])
        .map((s, i) => (s.selected ? i : -1))
        .filter((i) => i >= 0),
    [splits],
  );

  const equalShares = useMemo(() => {
    if (!totalAmount || selectedIndexes.length === 0) return [] as number[];
    try {
      return splitEqual(asMoney(totalAmount), selectedIndexes.length);
    } catch {
      return [];
    }
  }, [totalAmount, selectedIndexes.length]);

  useEffect(() => {
    if (splitMode !== "EQUAL") return;
    const current = form.getValues("splits");
    const next = current.map((row, index) => {
      if (!row.selected) return { ...row, amount: 0 };
      const pos = selectedIndexes.indexOf(index);
      return { ...row, amount: equalShares[pos] ?? 0 };
    });
    const changed = next.some((row, i) => row.amount !== current[i]?.amount);
    if (changed) {
      form.setValue("splits", next, { shouldValidate: false });
    }
  }, [splitMode, equalShares, selectedIndexes, form]);

  const exactAllocated = useMemo(() => {
    return (splits ?? [])
      .filter((s) => s.selected)
      .reduce((acc, s) => acc + (Number.isFinite(s.amount) ? s.amount : 0), 0);
  }, [splits]);

  const remaining = (totalAmount || 0) - exactAllocated;
  const selectedCount = selectedIndexes.length;

  function onSubmit(values: ExpenseFormValues) {
    startTransition(async () => {
      const result = await addExpense(values);
      if (!result.ok) {
        form.setError("root", { message: result.error });
        return;
      }
      form.reset({
        spaceId,
        title: "",
        totalAmount: 0,
        paidById: currentUserId,
        splitMode: "EQUAL",
        splits: members.map((m) => ({
          userId: m.userId,
          amount: 0,
          selected: true,
        })),
      });
      onSuccess?.();
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Section title="جزئیات هزینه" hint="عنوان کوتاه و واضح بنویسید">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>عنوان</FormLabel>
                <FormControl>
                  <Input
                    placeholder="مثلاً ناهار رستوران"
                    className="rounded-xl border-border/80 bg-white"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <div className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-highlight/10 p-4">
                <FormLabel className="text-primary">مبلغ کل (تومان)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    placeholder="250000"
                    className="mt-2 h-14 rounded-xl border-primary/20 bg-white text-center text-2xl font-bold tracking-wide text-ink"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value || ""}
                    onChange={(e) =>
                      field.onChange(parseAmountInput(e.target.value))
                    }
                  />
                </FormControl>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatCurrency(totalAmount)}
                </p>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        <Section title="پرداخت و تسهیم">
          <FormField
            control={form.control}
            name="paidById"
            render={({ field }) => (
              <FormItem>
                <FormLabel>پرداخت‌کننده</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="rounded-xl border-border/80 bg-white">
                      <SelectValue placeholder="انتخاب کنید" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {memberLabel(m)}
                        {m.userId === currentUserId ? " (من)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="splitMode"
            render={({ field }) => (
              <FormItem className="pt-1">
                <FormLabel>نحوه تسهیم</FormLabel>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/70 p-1.5">
                  {(
                    [
                      {
                        value: "EQUAL",
                        label: "مساوی",
                        sub: "تقسیم یکسان",
                      },
                      {
                        value: "EXACT",
                        label: "مبلغ دقیق",
                        sub: "سهم دستی",
                      },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        "flex h-14 flex-col items-center justify-center rounded-xl text-sm transition-all",
                        field.value === opt.value
                          ? "bg-primary text-primary-foreground shadow-[0_8px_18px_-8px_rgba(15,92,87,0.65)]"
                          : "bg-transparent text-muted-foreground hover:bg-white/80 hover:text-foreground",
                      )}
                    >
                      <span className="font-semibold">{opt.label}</span>
                      <span
                        className={cn(
                          "text-[11px]",
                          field.value === opt.value
                            ? "text-white/75"
                            : "text-muted-foreground",
                        )}
                      >
                        {opt.sub}
                      </span>
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        <Section
          title="اعضا"
          hint={
            splitMode === "EQUAL"
              ? `${selectedCount} نفر انتخاب شده`
              : "سهم هر نفر را وارد کنید"
          }
        >
          <ul className="space-y-2">
            {members.map((member, index) => {
              const selected = splits?.[index]?.selected ?? false;
              const equalPos = selectedIndexes.indexOf(index);
              const equalAmount =
                equalPos >= 0 ? equalShares[equalPos] : undefined;

              return (
                <li
                  key={member.userId}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    selected
                      ? "border-primary/25 bg-primary/[0.04]"
                      : "border-border/70 bg-white/80 opacity-70",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FormField
                      control={form.control}
                      name={`splits.${index}.selected`}
                      render={({ field }) => (
                        <FormItem className="flex flex-1 flex-row items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(v) =>
                                field.onChange(v === true)
                              }
                              className="size-5 rounded-md data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                            />
                          </FormControl>
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(member.name || member.phone)}`}
                              alt=""
                              width={32}
                              height={32}
                              className="size-8 shrink-0 rounded-full bg-secondary"
                            />
                            <FormLabel className="truncate font-medium">
                              {memberLabel(member)}
                              {member.userId === currentUserId ? (
                                <span className="ms-1 text-xs font-normal text-primary">
                                  من
                                </span>
                              ) : null}
                            </FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                    {splitMode === "EQUAL" && selected ? (
                      <span className="shrink-0 rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-ink tabular-nums">
                        {equalAmount != null
                          ? formatCurrency(equalAmount)
                          : "—"}
                      </span>
                    ) : null}
                  </div>

                  {splitMode === "EXACT" && selected ? (
                    <FormField
                      control={form.control}
                      name={`splits.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              className="h-12 rounded-xl border-primary/20 bg-white text-base font-semibold"
                              placeholder="سهم به تومان"
                              name={field.name}
                              ref={field.ref}
                              onBlur={field.onBlur}
                              value={field.value || ""}
                              onChange={(e) =>
                                field.onChange(parseAmountInput(e.target.value))
                              }
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(field.value)}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          {splitMode === "EXACT" ? (
            <div
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm",
                remaining === 0
                  ? "bg-success-soft text-success"
                  : remaining > 0
                    ? "bg-muted text-muted-foreground"
                    : "bg-destructive-soft text-destructive",
              )}
            >
              <span>باقی‌مانده</span>
              <span className="font-bold tabular-nums">
                {formatCurrency(remaining)}
              </span>
            </div>
          ) : (
            <p className="rounded-xl bg-accent/60 px-3 py-2 text-xs leading-relaxed text-accent-foreground">
              مبلغ به‌صورت مساوی بین افراد انتخاب‌شده تقسیم می‌شود
              {totalAmount > 0 && selectedCount > 0
                ? ` — حدود ${formatCurrency(Math.floor(totalAmount / selectedCount))} برای هر نفر.`
                : "."}
            </p>
          )}
        </Section>

        {form.formState.errors.root?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.root.message}
          </p>
        ) : null}
        {form.formState.errors.splits?.message ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.splits.message}
          </p>
        ) : null}
        {typeof form.formState.errors.splits?.root?.message === "string" ? (
          <p className="text-sm text-destructive" role="alert">
            {form.formState.errors.splits.root.message}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-1 border-t border-border/50 bg-gradient-to-t from-[#eef5f4] via-[#eef5f4]/95 to-transparent pb-1 pt-3">
          <Button
            type="submit"
            className="h-14 w-full rounded-2xl text-base font-semibold shadow-[0_12px_28px_-10px_rgba(15,92,87,0.55)]"
            disabled={pending}
          >
            {pending ? "در حال ثبت…" : "ثبت هزینه"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
