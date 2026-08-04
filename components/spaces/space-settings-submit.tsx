"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SpaceSettingsSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="h-12 w-full rounded-xl"
      disabled={pending}
    >
      {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
    </Button>
  );
}
