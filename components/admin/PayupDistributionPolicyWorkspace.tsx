"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { callPayupAdmin } from "@/lib/payup/adminClient";
import { formatCurrency } from "@/lib/utils/format";

const lineTypes = ["PRODUCT_AMOUNT", "A5S_SYSTEM_FEE", "PARTNER_MARGIN", "SHIPPING_FEE", "DISCOUNT_ADJUSTMENT", "ROUNDING_ADJUSTMENT"] as const;
type LineType = (typeof lineTypes)[number];
type PolicyLine = { lineType: LineType; subMerchantId: string; organizationId: string; businessNumber: string; amountPerUnit: number };
type ProductPolicy = { productId: string; productName: string; companyId: string; salePrice: number; policyVersion: number; readiness: string; lines: Record<string, unknown>[]; updatedAt?: string };

function newLine(type: LineType = "PRODUCT_AMOUNT"): PolicyLine {
  return { lineType: type, subMerchantId: "", organizationId: "", businessNumber: "", amountPerUnit: 1 };
}

function csv(filename: string, rows: (string | number)[][]) {
  const quote = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const blob = new Blob(["\uFEFF", rows.map((row) => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}

export function PayupDistributionPolicyWorkspace() {
  const [products, setProducts] = useState<ProductPolicy[]>([]);
  const [productId, setProductId] = useState("");
  const [lines, setLines] = useState<PolicyLine[]>([newLine(), newLine("A5S_SYSTEM_FEE"), newLine("PARTNER_MARGIN")]);
  const [approvalRequestId, setApprovalRequestId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("상품별 PayUp 차액분배 정책을 불러오세요.");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => products.find((product) => product.productId === productId), [productId, products]);
  const sum = useMemo(() => lines.reduce((total, line) => total + Number(line.amountPerUnit || 0), 0), [lines]);

  async function load() {
    setBusy(true);
    const result = await callPayupAdmin<{ list: ProductPolicy[] }>("payupAdminDistributionPolicies", { action: "list", limit: 500 });
    if (result.ok) {
      const list = Array.isArray(result.data.list) ? result.data.list : [];
      setProducts(list);
      if (!productId && list[0]) setProductId(list[0].productId);
      setMessage(`${list.length}개 상품의 분배 준비상태를 불러왔습니다.`);
    } else setMessage(result.error);
    setBusy(false);
  }

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!selected) return;
    const next = (selected.lines ?? []).map((raw) => ({
      lineType: String(raw.line_type ?? raw.lineType ?? "PRODUCT_AMOUNT") as LineType,
      subMerchantId: String(raw.sub_merchant_id ?? raw.subMerchantId ?? ""),
      organizationId: String(raw.organization_id ?? raw.organizationId ?? ""),
      businessNumber: String(raw.business_number ?? raw.businessNumber ?? ""),
      amountPerUnit: Number(raw.amount_per_unit ?? raw.amountPerUnit ?? 1),
    }));
    setLines(next.length ? next : [newLine(), newLine("A5S_SYSTEM_FEE"), newLine("PARTNER_MARGIN")]);
  }, [selected?.productId, selected?.policyVersion]);

  function updateLine(index: number, patch: Partial<PolicyLine>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  }

  async function validate() {
    if (!productId) return setMessage("상품을 선택하세요.");
    setBusy(true);
    const result = await callPayupAdmin<{ salePrice: number; distributionTotal: number; subMerchantCount: number }>("payupAdminDistributionPolicies", { action: "validate", productId, lines });
    setMessage(result.ok ? `검증 성공: 판매가 ${formatCurrency(result.data.salePrice)} = 분배합계 ${formatCurrency(result.data.distributionTotal)} · 수취 하위사업자 ${result.data.subMerchantCount}개` : result.error);
    setBusy(false);
  }

  async function requestApproval() {
    if (!selected) return setMessage("상품을 선택하세요.");
    const payload = { productId, salePrice: selected.salePrice, lines };
    setBusy(true);
    const result = await callPayupAdmin<{ requestId: string }>("payupAdminApprovals", { action: "request", actionType: "DISTRIBUTION_POLICY_CHANGE", targetId: productId, payload, reason: reason || "상품 PayUp 차액분배 정책 변경" });
    if (result.ok) {
      setApprovalRequestId(result.data.requestId);
      setMessage(`2인 승인요청을 생성했습니다: ${result.data.requestId}`);
    } else setMessage(result.error);
    setBusy(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!productId) return setMessage("상품을 선택하세요.");
    setBusy(true);
    const result = await callPayupAdmin<{ policyVersion: number; distributionTotal: number }>("payupAdminDistributionPolicies", { action: "upsert", productId, lines, approvalRequestId, reason });
    if (result.ok) {
      setMessage(`정책 v${result.data.policyVersion} 저장 완료 · 분배합계 ${formatCurrency(result.data.distributionTotal)}`);
      setApprovalRequestId("");
      await load();
    } else setMessage(result.error);
    setBusy(false);
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <h2 className="text-lg font-black">상품별 PayUp 차액분배 정책</h2>
        <p className="mt-2 text-sm font-semibold leading-6">상품 판매가를 공급사 상품대금, 위드커머스 A5S 이용료, A5WS 파트너 차액, 배송비 등으로 나눕니다. 합계가 판매가와 1원이라도 다르면 QR과 최종승인을 차단합니다.</p>
        <p className="mt-1 text-sm font-semibold leading-6">금융 배분 변경은 요청자와 승인자가 다른 2인 승인을 거쳐야 저장됩니다.</p>
      </section>

      <section className="overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 bg-slate-100 px-4 py-3">
          <div><h2 className="font-black">상품 분배 준비현황</h2><p className="mt-1 text-xs font-bold text-slate-500">{products.length}개 상품</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => void load()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-black">새로고침</button><button type="button" onClick={() => csv("payup-product-distribution.csv", [["상품ID", "상품명", "판매가", "정책버전", "준비상태", "수정일"], ...products.map((product) => [product.productId, product.productName, product.salePrice, product.policyVersion, product.readiness, product.updatedAt ?? ""])])} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-black text-white">엑셀 CSV</button></div>
        </div>
        <div className="max-h-[360px] overflow-auto"><table className="min-w-full border-collapse text-xs"><thead className="sticky top-0 bg-[#d9ead3]"><tr>{["행", "상품ID", "상품명", "기업", "판매가", "정책버전", "준비상태", "수정일"].map((label) => <th key={label} className="border p-2">{label}</th>)}</tr></thead><tbody>{products.map((product, index) => <tr key={product.productId} onClick={() => setProductId(product.productId)} className={`cursor-pointer even:bg-slate-50 ${productId === product.productId ? "bg-blue-50" : ""}`}><td className="border bg-slate-100 p-2 text-center">{index + 1}</td><td className="border p-2 font-bold">{product.productId}</td><td className="border p-2">{product.productName}</td><td className="border p-2">{product.companyId}</td><td className="border p-2 text-right font-black">{formatCurrency(product.salePrice)}</td><td className="border p-2 text-center">v{product.policyVersion}</td><td className="border p-2 text-center"><span className={`rounded-full px-2 py-1 font-black ${product.readiness === "CONFIGURED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{product.readiness}</span></td><td className="border p-2">{product.updatedAt}</td></tr>)}</tbody></table></div>
      </section>

      <form onSubmit={save} className="rounded-md border border-slate-300 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]"><label className="grid gap-1 text-xs font-black text-slate-600">상품<select value={productId} onChange={(event) => setProductId(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-sm"><option value="">상품 선택</option>{products.map((product) => <option key={product.productId} value={product.productId}>{product.productName} · {formatCurrency(product.salePrice)}</option>)}</select></label><div className="rounded-md bg-slate-50 p-3"><p className="text-xs font-black text-slate-500">판매가</p><p className="mt-1 text-lg font-black">{formatCurrency(selected?.salePrice ?? 0)}</p></div><div className={`rounded-md p-3 ${sum === (selected?.salePrice ?? 0) ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}><p className="text-xs font-black">분배합계</p><p className="mt-1 text-lg font-black">{formatCurrency(sum)}</p></div></div>
        <div className="mt-4 overflow-auto"><table className="min-w-full border-collapse text-xs"><thead className="bg-[#d9ead3]"><tr>{["행", "분배유형", "subMerchantId", "organizationId", "사업자번호", "단위금액", "삭제"].map((label) => <th key={label} className="border p-2">{label}</th>)}</tr></thead><tbody>{lines.map((line, index) => <tr key={`${index}-${line.lineType}`}><td className="border bg-slate-100 p-2 text-center">{index + 1}</td><td className="border p-1"><select value={line.lineType} onChange={(event) => updateLine(index, { lineType: event.target.value as LineType })} className="h-10 w-full min-w-44 rounded border px-2 font-bold">{lineTypes.map((type) => <option key={type}>{type}</option>)}</select></td><td className="border p-1"><input value={line.subMerchantId} onChange={(event) => updateLine(index, { subMerchantId: event.target.value })} className="h-10 min-w-44 rounded border px-2 font-bold" /></td><td className="border p-1"><input value={line.organizationId} onChange={(event) => updateLine(index, { organizationId: event.target.value })} className="h-10 min-w-44 rounded border px-2" /></td><td className="border p-1"><input value={line.businessNumber} onChange={(event) => updateLine(index, { businessNumber: event.target.value.replace(/[^0-9]/g, "") })} className="h-10 min-w-36 rounded border px-2" /></td><td className="border p-1"><input type="number" min="1" value={line.amountPerUnit} onChange={(event) => updateLine(index, { amountPerUnit: Number(event.target.value) })} className="h-10 min-w-32 rounded border px-2 text-right font-black" /></td><td className="border p-1 text-center"><button type="button" onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded bg-red-50 px-3 py-2 font-black text-red-800">삭제</button></td></tr>)}</tbody></table></div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setLines((current) => [...current, newLine()])} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-black">분배행 추가</button><button type="button" onClick={() => void validate()} disabled={busy} className="rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-black text-blue-900">합계·하위사업자 검증</button></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-xs font-black text-slate-600">변경사유<input value={reason} onChange={(event) => setReason(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-sm" /></label><label className="grid gap-1 text-xs font-black text-slate-600">승인요청 ID<input value={approvalRequestId} onChange={(event) => setApprovalRequestId(event.target.value)} className="h-11 rounded-md border border-slate-300 px-3 text-sm" /></label></div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void requestApproval()} disabled={busy || !selected} className="rounded-md border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900">2인 승인 요청</button><button type="submit" disabled={busy || !selected} className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">분배 정책 저장</button></div>
      </form>
      <p className="rounded-md bg-slate-100 p-3 text-sm font-bold text-slate-700">{busy ? "처리 중..." : message}</p>
    </div>
  );
}
