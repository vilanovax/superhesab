/**
 * Chromium Speculation Rules — prerender likely space navigations on hover
 * (~200ms). Progressive enhancement; Safari/Firefox ignore the script.
 *
 * Scoped to `/spaces/*` entry routes (not settings/board) to avoid burning
 * bandwidth on admin chrome the user rarely opens from home.
 */
export function HomeSpaceSpeculation() {
  const rules = {
    prerender: [
      {
        where: {
          and: [
            { href_matches: "/spaces/*" },
            { not: { href_matches: "/spaces/*/settings*" } },
            { not: { href_matches: "/spaces/*/board*" } },
          ],
        },
        eagerness: "moderate",
      },
    ],
    prefetch: [
      {
        where: {
          and: [
            { href_matches: "/spaces/*" },
            { not: { href_matches: "/spaces/*/settings*" } },
            { not: { href_matches: "/spaces/*/board*" } },
          ],
        },
        eagerness: "moderate",
      },
    ],
  };

  return (
    <script
      type="speculationrules"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(rules) }}
    />
  );
}
