const defaultPublicOrigin = "https://signage-ai-a5.co.kr";

type ProductUrlFieldOptions = {
  origin?: string;
  businessNo?: string;
  sellerBusinessNo?: string;
  businessNoNormalized?: string;
};

function normalizeOrigin(value?: string) {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  return trimmed || defaultPublicOrigin;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value.trim());
}

export function normalizeStorefrontBusinessNo(value?: string) {
  return String(value ?? "").replace(/\D/g, "");
}

function resolveProductUrlOptions(originOrOptions?: string | ProductUrlFieldOptions): ProductUrlFieldOptions {
  if (typeof originOrOptions === "object" && originOrOptions) return originOrOptions;
  return { origin: originOrOptions };
}

export function buildBusinessBrandPath(businessNo: string) {
  const normalized = normalizeStorefrontBusinessNo(businessNo);
  return normalized ? `/a5mall/${encodePathSegment(normalized)}/` : "";
}

export function buildBusinessProductPath(businessNo: string, productId: string) {
  const brandPath = buildBusinessBrandPath(businessNo);
  return brandPath ? `${brandPath}${encodePathSegment(productId)}/` : "";
}

export function buildProductUrlFields(
  productId: string,
  originOrOptions: string | ProductUrlFieldOptions | undefined = process.env.NEXT_PUBLIC_A5_PUBLIC_ORIGIN,
) {
  const options = resolveProductUrlOptions(originOrOptions);
  const encodedProductId = encodePathSegment(productId);
  const tabletPath = `/tablet/products/${encodedProductId}/`;
  const mobilePath = `/m/shop/product/${encodedProductId}/`;
  const publicOrigin = normalizeOrigin(options.origin);
  const businessNo = normalizeStorefrontBusinessNo(options.businessNo ?? options.sellerBusinessNo ?? options.businessNoNormalized);
  const businessBrandPath = businessNo ? buildBusinessBrandPath(businessNo) : "";
  const businessProductPath = businessNo ? buildBusinessProductPath(businessNo, productId) : "";

  return {
    public_path: tabletPath,
    tablet_path: tabletPath,
    mobile_path: mobilePath,
    canonical_url: `${publicOrigin}${tabletPath}`,
    product_url: `${publicOrigin}${tabletPath}`,
    ad_target_path: tabletPath,
    mobile_ad_target_path: mobilePath,
    ...(businessNo
      ? {
          business_brand_path: businessBrandPath,
          businessBrandPath,
          business_product_path: businessProductPath,
          businessProductPath,
          business_brand_url: `${publicOrigin}${businessBrandPath}`,
          businessBrandUrl: `${publicOrigin}${businessBrandPath}`,
          business_product_url: `${publicOrigin}${businessProductPath}`,
          businessProductUrl: `${publicOrigin}${businessProductPath}`,
          a5mall_brand_path: businessBrandPath,
          a5mall_product_path: businessProductPath,
        }
      : {}),
    url_version: businessNo ? 2 : 1,
  };
}

export function productTabletPath(product: { id: string; publicPath?: string; public_path?: string; tabletPath?: string; tablet_path?: string }) {
  return product.tabletPath || product.tablet_path || product.publicPath || product.public_path || buildProductUrlFields(product.id).tablet_path;
}

export function productMobilePath(product: { id: string; mobilePath?: string; mobile_path?: string }) {
  return product.mobilePath || product.mobile_path || buildProductUrlFields(product.id).mobile_path;
}

export function productBusinessProductPath(product: {
  id: string;
  businessProductPath?: string;
  business_product_path?: string;
  a5mallProductPath?: string;
  a5mall_product_path?: string;
  sellerBusinessNo?: string;
  seller_business_no?: string;
  sellerBusinessNoNormalized?: string;
  seller_business_no_normalized?: string;
  companyBusinessNo?: string;
  company_business_no?: string;
  companyBusinessNoNormalized?: string;
  company_business_no_normalized?: string;
}) {
  const existing = product.businessProductPath || product.business_product_path || product.a5mallProductPath || product.a5mall_product_path;
  if (existing) return existing;

  const businessNo = normalizeStorefrontBusinessNo(
    product.sellerBusinessNoNormalized ??
      product.seller_business_no_normalized ??
      product.sellerBusinessNo ??
      product.seller_business_no ??
      product.companyBusinessNoNormalized ??
      product.company_business_no_normalized ??
      product.companyBusinessNo ??
      product.company_business_no,
  );

  return businessNo ? buildBusinessProductPath(businessNo, product.id) : productTabletPath(product);
}
