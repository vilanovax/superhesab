import { getTemplate } from "@/lib/templates/registry";
import type { SpaceTabsProps } from "@/components/spaces/space-tabs-types";

/**
 * Server gate — dynamically imports only the client entry for this template
 * so TRIP never pulls BUILDING/FAMILY panel modules into its client graph.
 */
export async function SpaceTabsGate(props: SpaceTabsProps) {
  const features = getTemplate(props.spaceType ?? "TRIP").features;

  if (features.buildingCharges) {
    const { BuildingSpaceTabs } = await import(
      "@/components/spaces/building-space-tabs"
    );
    return <BuildingSpaceTabs {...props} />;
  }

  if (features.incomeExpense && !features.settlements) {
    const { FamilySpaceTabs } = await import(
      "@/components/spaces/family-space-tabs"
    );
    return <FamilySpaceTabs {...props} />;
  }

  const { TripSpaceTabs } = await import(
    "@/components/spaces/trip-space-tabs"
  );
  return <TripSpaceTabs {...props} />;
}
