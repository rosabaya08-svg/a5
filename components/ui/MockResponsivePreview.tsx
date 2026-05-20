import { commerceFilterGroups, commerceSortOptions, mockEmptyStates, productDetailMockSections } from "@/data/mockUiScenarios";
import { MockDetailSections } from "@/components/ui/MockDetailSections";
import { SearchSortFilterPanel } from "@/components/ui/SearchSortFilterPanel";
import { StatePanel } from "@/components/ui/StatePanel";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockResponsivePreview() {
  return (
    <section className="grid gap-4">
      <SearchSortFilterPanel
        title="Closed mall product controls"
        description="Static mock controls for search, filters, and sorting before repository-backed interaction is wired."
        searchPlaceholder="Search mock products or order numbers"
        filterGroups={commerceFilterGroups}
        sortOptions={commerceSortOptions}
      />

      <div className="grid gap-3 lg:grid-cols-3">
        {mockEmptyStates.map((state) => (
          <StatePanel
            key={state.id}
            state={state}
            footer={
              <div className="flex flex-wrap gap-2">
                <RiskStatusBadge status="mock_only" />
                <RiskStatusBadge status="integration_pending" />
              </div>
            }
          />
        ))}
      </div>

      <MockDetailSections sections={productDetailMockSections} />
    </section>
  );
}

