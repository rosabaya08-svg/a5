import { companyProductCategories } from "@/data/companyProductCategories";

function normalizeCategory(value: string) {
  return value.trim();
}

function decodeRouteId(routeId: string) {
  try {
    return decodeURIComponent(routeId);
  } catch {
    return routeId;
  }
}

export function categoryRouteIdForLabel(label: string) {
  const normalized = normalizeCategory(label);
  const match = companyProductCategories.find(
    (category) => normalizeCategory(category.label) === normalized || category.id === normalized || category.code === normalized,
  );

  return match?.id ?? encodeURIComponent(normalized || "all");
}

export function categoryLabelForRouteId(routeId: string, knownLabels: string[] = []) {
  const decoded = decodeRouteId(routeId);
  const official = companyProductCategories.find((category) => category.id === decoded || category.code === decoded || category.label === decoded);
  if (official) return official.label;

  const known = knownLabels.find((label) => categoryRouteIdForLabel(label) === routeId || normalizeCategory(label) === decoded);
  return known ?? decoded;
}

export function categoryTabletPathFromLabel(label: string) {
  return `/tablet/products/categories/${categoryRouteIdForLabel(label)}/`;
}

export function categoryMobilePathFromLabel(label: string) {
  return `/m/shop/categories/${categoryRouteIdForLabel(label)}/`;
}
