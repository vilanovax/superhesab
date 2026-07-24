import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Custom type scale (`text-caption`, `text-body-sm`, …) must live in the
 * font-size group. Otherwise twMerge treats them as text-color and wipes
 * `text-primary-foreground` / `text-muted-foreground` on dark buttons.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "micro",
            "caption",
            "label",
            "body-sm",
            "body",
            "title",
            "display",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
