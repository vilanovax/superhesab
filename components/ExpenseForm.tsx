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
  FormDescription,
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
import { formatMoney, memberLabel } from "@/lib/format";
import { asMoney, splitEqual } from "@/lib/money";
import {
  expenseSchema,
  type ExpenseFormValues,
} from "@/lib/validations/expense";
import { cn } from "@/lib/utils";

export type ExpenseMember = {
  userId: string;
  name: string | null;
  phone: string;
};

type ExpenseFormProps = {
  spaceId: string;
  currentUserId: string;
  members: ExpenseMember[];
  onSuccess?: () => void;
};

export function ExpenseForm({
  spaceId,
  currentUserId,
  members,
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

  // Keep EQUAL amounts in sync for submit payload (integer-safe remainder)
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
        className="flex flex-col gap-5"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>عنوان</FormLabel>
              <FormControl>
                <Input placeholder="مثلاً ناهار رستوران" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="totalAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>مبلغ کل</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  dir="ltr"
                  min={1}
                  step={1}
                  placeholder="250000"
                  value={field.value || ""}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    field.onChange(Number.isFinite(n) ? Math.trunc(n) : 0);
                  }}
                />
              </FormControl>
              <FormDescription>مبلغ به واحد صحیح (بدون اعشار)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paidById"
          render={({ field }) => (
            <FormItem>
              <FormLabel>پرداخت‌کننده</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
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
            <FormItem>
              <FormLabel>نحوه تسهیم</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "EQUAL", label: "مساوی" },
                    { value: "EXACT", label: "مبلغ دقیق" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(opt.value)}
                    className={cn(
                      "h-12 rounded-lg border text-sm font-medium transition-colors",
                      field.value === opt.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">اعضا</p>
          <ul className="space-y-2">
            {members.map((member, index) => {
              const selected = splits?.[index]?.selected ?? false;
              const equalPos = selectedIndexes.indexOf(index);
              const equalAmount =
                equalPos >= 0 ? equalShares[equalPos] : undefined;

              return (
                <li
                  key={member.userId}
                  className="rounded-lg border border-border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <FormField
                      control={form.control}
                      name={`splits.${index}.selected`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(v) =>
                                field.onChange(v === true)
                              }
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {memberLabel(member)}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    {splitMode === "EQUAL" && selected ? (
                      <span className="ms-auto text-sm text-muted-foreground" dir="ltr">
                        {equalAmount != null ? formatMoney(equalAmount) : "—"}
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
                              dir="ltr"
                              min={0}
                              step={1}
                              className="h-12"
                              value={field.value || ""}
                              onChange={(e) => {
                                const n = e.target.valueAsNumber;
                                field.onChange(
                                  Number.isFinite(n) ? Math.trunc(n) : 0,
                                );
                              }}
                            />
                          </FormControl>
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
            <p
              className={cn(
                "text-sm",
                remaining === 0
                  ? "text-success"
                  : remaining > 0
                    ? "text-muted-foreground"
                    : "text-destructive",
              )}
            >
              باقی‌مانده برای تخصیص:{" "}
              <span dir="ltr">{formatMoney(remaining)}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              مبلغ به‌صورت مساوی بین افراد انتخاب‌شده تقسیم می‌شود.
            </p>
          )}
        </div>

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

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "در حال ثبت…" : "ثبت هزینه"}
        </Button>
      </form>
    </Form>
  );
}
