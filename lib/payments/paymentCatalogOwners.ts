const paymentCatalogCompanyByProductId: Record<string, string> = {
  "product-test-1004": "company-test-1004",
};

export function resolvePaymentCompanyId(productId: string, fallbackCompanyId: string) {
  return paymentCatalogCompanyByProductId[productId] ?? fallbackCompanyId;
}
