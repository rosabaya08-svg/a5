import { commerceFilterGroups, commerceSortOptions, mockEmptyStates, productDetailMockSections } from "@/data/mockUiScenarios";
import { MockDetailSections } from "@/components/ui/MockDetailSections";
import { SearchSortFilterPanel } from "@/components/ui/SearchSortFilterPanel";
import { StatePanel } from "@/components/ui/StatePanel";
import { RiskStatusBadge } from "@/components/ui/RiskStatusBadge";

export function MockResponsivePreview() {
  return (
    <section className="grid gap-4">
      <SearchSortFilterPanel
        title="산후조리원 핫딜 상품 제어"
        description="검색, 필터, 정렬을 저장소 연동 전에 확인하는 화면입니다."
        searchPlaceholder="상품명 또는 주문번호 검색"
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
