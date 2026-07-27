export const A5_SOURCE_PROJECT = "a5-closed-mall";
export const A5_COMPANY_SOURCE_SITE = "a5-company";
export const A5_CLOSED_MALL_SOURCE_SITE = "a5-closed-mall";
export const A5_SITE_SCOPE = "a5";

export type A5MemberType = "company" | "guest" | "nursery" | "tablet";

export function a5MemberDocumentFields(input: {
  sourceSite: string;
  memberType: A5MemberType;
  ownerUid?: string | null;
  created?: boolean;
}) {
  return {
    sourceProject: A5_SOURCE_PROJECT,
    source_project: A5_SOURCE_PROJECT,
    sourceSite: input.sourceSite,
    source_site: input.sourceSite,
    site_scope: A5_SITE_SCOPE,
    memberType: input.memberType,
    member_type: input.memberType,
    ...(input.ownerUid ? { ownerUid: input.ownerUid, owner_uid: input.ownerUid } : {}),
    ...(input.created ? { createdBySite: input.sourceSite, created_by_site: input.sourceSite } : {}),
    lastUpdatedBySite: input.sourceSite,
    last_updated_by_site: input.sourceSite,
  };
}

export function a5CompanyAuthClaims(input: { companyId: string; businessNo?: string; ownerUid?: string }) {
  return {
    role: "COMPANY_ADMIN",
    company_id: input.companyId,
    ...(input.businessNo ? { business_no: input.businessNo } : {}),
    site_scope: A5_SITE_SCOPE,
    source_project: A5_SOURCE_PROJECT,
    source_site: A5_COMPANY_SOURCE_SITE,
    member_type: "company",
    ...(input.ownerUid ? { owner_uid: input.ownerUid } : {}),
  } as const;
}
