"use client";

import { useEffect, useMemo, useState } from "react";
import { getFirebaseAdminAuthClient } from "@/lib/firebase/client";
import { getPaymentEndpointReadiness } from "@/lib/payments/paymentEndpoints";
import type { Company, PgMerchantStatus, PgProvider } from "@/types/commerce";

type PgGatewaySettingsPanelProps = {
  companies: Company[];
  requestedCompanyId?: string;
  onRefresh?: () => Promise<void>;
};

type MerchantRow = {
  id: string;
  companyId: string;
  companyName: string;
  businessNo: string;
  representativeName: string;
  managerName: string;
  contactPhone: string;
  contactEmail: string;
  provider: PgProvider;
  environment: "test" | "production";
  merchantId: string;
  authKey: string;
  authKeyRef: string;
  status: PgMerchantStatus;
  saveMessage: string;
  saveState: "idle" | "saving" | "saved" | "error";
  credentialStorageLabel: string;
  credentialReady: boolean;
  encryptedSecretStored: boolean;
  providerCalled: boolean;
  connectionCode: string;
  connectionTestedAt: string;
  transactionCount: number;
};

const statusOptions: Array<{ value: PgMerchantStatus; label: string }> = [
  { value: "not_applied", label: "미입력" },
  { value: "in_review", label: "검토중" },
  { value: "mid_issued", label: "키 입력" },
  { value: "active", label: "사용 가능" },
  { value: "blocked", label: "차단" },
];

function normalizeBusinessNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function emptyRow(): MerchantRow {
  return {
    id: `new-${Date.now()}`,
    companyId: "",
    companyName: "",
    businessNo: "",
    representativeName: "",
    managerName: "",
    contactPhone: "",
    contactEmail: "",
    provider: "payup",
    environment: "production",
    merchantId: "",
    authKey: "",
    authKeyRef: "",
    status: "active",
    saveMessage: "",
    saveState: "idle",
    credentialStorageLabel: "인증키 미저장",
    credentialReady: false,
    encryptedSecretStored: false,
    providerCalled: false,
    connectionCode: "",
    connectionTestedAt: "",
    transactionCount: 0,
  };
}

function companyToRow(company: Company): MerchantRow {
  return {
    id: company.id,
    companyId: company.id,
    companyName: company.name,
    businessNo: company.businessRegistrationNumberNormalized || company.businessRegistrationNumber || "",
    representativeName: company.representativeName || "",
    managerName: company.managerName || "",
    contactPhone: company.publicContactPhone || "",
    contactEmail: company.publicEmail || "",
    provider: company.pgProfile?.provider === "payup" ? "payup" : "payup",
    environment: "production",
    merchantId: company.pgProfile?.merchantId || "",
    authKey: "",
    authKeyRef: "",
    status: company.pgProfile?.merchantStatus || "not_applied",
    saveMessage: "",
    saveState: "idle",
    credentialStorageLabel: company.pgProfile?.credentialStorageLabel || "인증키 미저장",
    credentialReady: company.pgProfile?.credentialReady === true,
    encryptedSecretStored: company.pgProfile?.encryptedSecretStored === true,
    providerCalled: company.pgProfile?.lastConnectionTest?.providerCalled === true,
    connectionCode: company.pgProfile?.lastConnectionTest?.code || "",
    connectionTestedAt: company.pgProfile?.lastConnectionTest?.testedAt || "",
    transactionCount: company.pgProfile?.transactions?.total || 0,
  };
}

function inputClass(extra = "") {
  return `h-10 w-full rounded-sm border border-slate-200 bg-white px-2 text-sm font-normal text-slate-950 outline-none focus:border-blue-500 ${extra}`;
}

function cellClass(extra = "") {
  return `border-b border-r border-slate-200 px-2 py-2 align-top ${extra}`;
}

async function postAdminFunction(url: string, payload: Record<string, unknown>) {
  if (!url) throw new Error("관리자 PG 저장 함수 주소가 설정되지 않았습니다.");

  const auth = getFirebaseAdminAuthClient();
  const idToken = await auth?.currentUser?.getIdToken();
  if (!idToken) throw new Error("최고관리자 로그인이 필요합니다.");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error?.message || data?.message || "PG 설정 저장에 실패했습니다.");
  }

  return data;
}

export function PgGatewaySettingsPanel({ companies, requestedCompanyId = "", onRefresh }: PgGatewaySettingsPanelProps) {
  const [rows, setRows] = useState<MerchantRow[]>(() => {
    const initialRows = companies.map(companyToRow);
    return initialRows.length ? initialRows : [emptyRow()];
  });
  const [selectedRowId, setSelectedRowId] = useState(rows[0]?.id ?? "");
  const [credentialDialogRowId, setCredentialDialogRowId] = useState("");
  const endpoints = useMemo(() => getPaymentEndpointReadiness().endpoints, []);
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? rows[0];
  const credentialDialogRow = rows.find((row) => row.id === credentialDialogRowId);

  useEffect(() => {
    if (!companies.length) return;
    setRows(companies.map(companyToRow));
    const requestedExists = requestedCompanyId && companies.some((company) => company.id === requestedCompanyId);
    setSelectedRowId((current) => requestedExists ? requestedCompanyId : companies.some((company) => company.id === current) ? current : companies[0]?.id || "");
  }, [companies, requestedCompanyId]);

  function updateRow(rowId: string, patch: Partial<MerchantRow>) {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const next = { ...row, ...patch, saveMessage: "", saveState: "idle" as const };
        if (patch.businessNo !== undefined && !row.companyId) {
          const normalized = normalizeBusinessNo(patch.businessNo);
          next.companyId = normalized ? `business-${normalized}` : "";
        }
        return next;
      }),
    );
  }

  async function saveRow(rowId: string) {
    const row = rows.find((item) => item.id === rowId);
    if (!row) return;

    const businessNo = normalizeBusinessNo(row.businessNo);
    const companyId = row.companyId.trim() || (businessNo ? `business-${businessNo}` : "");
    if (!companyId || !row.merchantId.trim()) {
      updateRow(rowId, {
        saveState: "error",
        saveMessage: "업체 코드, 업체명, 가맹점 ID는 필수입니다.",
      });
      return;
    }

    setRows((current) => current.map((item) => (item.id === rowId ? { ...item, saveState: "saving", saveMessage: "저장 중입니다." } : item)));

    try {
      await postAdminFunction(endpoints.adminPgCredentialSave, {
        companyId,
        provider: row.provider,
        environment: row.environment,
        mid: row.merchantId.trim(),
        secretKey: row.authKey.trim() || undefined,
        secretKeyRef: row.authKeyRef.trim() || undefined,
        status: row.status,
      });

      setRows((current) =>
        current.map((item) =>
          item.id === rowId
            ? {
                ...item,
                companyId,
                businessNo,
                authKey: "",
                saveState: "saved",
                saveMessage: "저장되었습니다. 업체 정보와 PG 키가 결제 루프에 연결됩니다.",
              }
            : item,
        ),
      );
      await onRefresh?.();
    } catch (error) {
      setRows((current) =>
        current.map((item) =>
          item.id === rowId
            ? {
                ...item,
                saveState: "error",
                saveMessage: error instanceof Error ? error.message : "저장에 실패했습니다.",
              }
            : item,
        ),
      );
    }
  }

  async function testRow(rowId: string) {
    const row = rows.find((item) => item.id === rowId);
    if (!row) return;

    const companyId = row.companyId.trim() || (normalizeBusinessNo(row.businessNo) ? `business-${normalizeBusinessNo(row.businessNo)}` : "");
    if (!companyId) {
      updateRow(rowId, { saveState: "error", saveMessage: "먼저 업체 코드를 입력해야 합니다." });
      return;
    }

    setRows((current) => current.map((item) => (item.id === rowId ? { ...item, saveState: "saving", saveMessage: "연결 확인 중입니다." } : item)));
    try {
      await postAdminFunction(endpoints.adminPgConnectionTest, { companyId });
      updateRow(rowId, { saveState: "saved", saveMessage: "실제 비과금 PayUp 연결 확인을 통과했습니다." });
      await onRefresh?.();
    } catch (error) {
      updateRow(rowId, { saveState: "error", saveMessage: error instanceof Error ? error.message : "연결 확인에 실패했습니다." });
    }
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-blue-700">PG 가맹점 관리</p>
            <h2 className="mt-1 text-2xl font-normal text-slate-950">업체 정보와 Payup 인증키 입력</h2>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
              등록된 업체가 없으면 새 행을 추가해서 사업자번호, 업체명, 가맹점 ID, 인증키를 입력하세요. 저장하면 업체 정보와 결제 키가 함께 연결됩니다.
            </p>
          </div>
          <button type="button" disabled className="hidden">
            업체 행 추가
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[1380px] w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs font-normal text-slate-600">
            <tr>
              <th className="border-b border-r border-slate-200 px-2 py-2 text-right">번호</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">업체 코드</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">업체명</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">사업자등록번호</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">대표자</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">가맹점 ID</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">인증키</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">환경</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">상태</th>
              <th className="border-b border-r border-slate-200 px-2 py-2">저장 결과</th>
              <th className="border-b border-slate-200 px-2 py-2">작업</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className={selectedRowId === row.id ? "bg-blue-50/60" : "hover:bg-slate-50"}>
                <td className={cellClass("text-right text-slate-500")}>{index + 1}</td>
                <td className={cellClass()}>
                  <input value={row.companyId} readOnly aria-readonly="true" className={inputClass("bg-slate-50")} placeholder="business-사업자번호" />
                </td>
                <td className={cellClass()}>
                  <input value={row.companyName} readOnly aria-readonly="true" className={inputClass("bg-slate-50")} placeholder="업체명" />
                </td>
                <td className={cellClass()}>
                  <input value={row.businessNo} readOnly aria-readonly="true" className={inputClass("bg-slate-50")} placeholder="숫자만 입력" />
                </td>
                <td className={cellClass()}>
                  <input value={row.representativeName || "확인 전"} readOnly aria-readonly="true" className={inputClass("bg-slate-50")} />
                </td>
                <td className={cellClass()}>
                  <input value={row.merchantId} onChange={(event) => updateRow(row.id, { merchantId: event.target.value })} className={inputClass()} placeholder="Payup 가맹점 ID" />
                </td>
                <td className={cellClass("min-w-[190px]")}>
                  <div className="grid gap-1">
                    <input
                      type="password"
                      value={row.authKey}
                      onChange={(event) => updateRow(row.id, { authKey: event.target.value })}
                      className={inputClass()}
                      placeholder={row.encryptedSecretStored ? "새 인증키 입력 시 교체" : "인증키 입력"}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setCredentialDialogRowId(row.id)}
                      className="rounded-sm border border-blue-200 bg-blue-50 px-2 py-1.5 text-xs font-normal text-blue-800"
                    >
                      인증키 확인 · {row.encryptedSecretStored ? "암호화 저장됨" : "미저장"}
                    </button>
                  </div>
                </td>
                <td className={cellClass()}>
                  <select value={row.environment} onChange={(event) => updateRow(row.id, { environment: event.target.value as "test" | "production" })} className={inputClass()}>
                    <option value="production">운영</option>
                    <option value="test">테스트</option>
                  </select>
                </td>
                <td className={cellClass()}>
                  <select value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value as PgMerchantStatus })} className={inputClass()}>
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={cellClass("min-w-[220px]")}>
                  <p
                    className={`text-xs font-normal leading-5 ${
                      row.saveState === "error" ? "text-red-700" : row.saveState === "saved" ? "text-emerald-700" : "text-slate-500"
                    }`}
                  >
                    {row.saveMessage || "대기"}
                  </p>
                </td>
                <td className="border-b border-slate-200 px-2 py-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setSelectedRowId(row.id)} className="rounded-sm border border-slate-200 px-3 py-2 text-xs font-normal text-slate-700">
                      상세
                    </button>
                    <button type="button" onClick={() => saveRow(row.id)} disabled={row.saveState === "saving"} className="rounded-sm bg-slate-950 px-3 py-2 text-xs font-normal text-white disabled:opacity-50">
                      저장
                    </button>
                    <button type="button" onClick={() => testRow(row.id)} disabled={row.saveState === "saving"} className="rounded-sm bg-emerald-600 px-3 py-2 text-xs font-normal text-white disabled:opacity-50">
                      확인
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {credentialDialogRow ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation" onMouseDown={() => setCredentialDialogRowId("")}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="credential-status-title"
            className="w-full max-w-lg rounded-md bg-white p-6 shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-normal tracking-[0.14em] text-blue-700">PAYUP 인증키 확인</p>
            <h3 id="credential-status-title" className="mt-1 text-xl font-normal text-slate-950">
              {credentialDialogRow.companyName || "업체명 미입력"}
            </h3>
            <div className="mt-4 grid gap-3">
              <div className={`rounded-md border p-4 ${credentialDialogRow.encryptedSecretStored ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
                <p className="text-sm font-normal">인증키 저장 상태</p>
                <p className="mt-1 text-lg font-normal">
                  {credentialDialogRow.encryptedSecretStored ? "암호화 저장됨" : "미저장"}
                </p>
              </div>
              <dl className="grid gap-2 rounded-md bg-slate-50 p-4 text-sm text-slate-700">
                <div className="flex justify-between gap-4"><dt>환경</dt><dd>{credentialDialogRow.environment === "production" ? "운영" : "테스트"}</dd></div>
                <div className="flex justify-between gap-4"><dt>결제 사용 준비</dt><dd>{credentialDialogRow.credentialReady ? "준비됨" : "확인 필요"}</dd></div>
                <div className="flex justify-between gap-4"><dt>실제 PayUp 호출</dt><dd>{credentialDialogRow.providerCalled ? "확인됨" : "미확인"}</dd></div>
                <div className="flex justify-between gap-4"><dt>최근 연결 결과</dt><dd>{credentialDialogRow.connectionCode || "검사 전"}</dd></div>
              </dl>
              <p className="rounded-md bg-slate-100 p-3 text-sm leading-6 text-slate-700">
                인증키 원문은 서버에서 암호화되어 브라우저로 다시 전송되지 않습니다. 목록의 빈 입력칸은 교체용이며, 새 키를 입력하지 않고 저장하면 기존 암호화 키를 유지합니다.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void testRow(credentialDialogRow.id)}
                disabled={credentialDialogRow.saveState === "saving" || !credentialDialogRow.encryptedSecretStored}
                className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-normal text-white disabled:opacity-50"
              >
                비과금 연결 확인
              </button>
              <button type="button" onClick={() => setCredentialDialogRowId("")} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-normal text-white">
                닫기
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedRow ? (
        <div className="grid gap-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
          <div>
            <p className="text-xs font-normal tracking-[0.14em] text-blue-700">선택 업체 상세</p>
            <h3 className="mt-1 text-xl font-normal text-slate-950">{selectedRow.companyName || "업체명 미입력"}</h3>
            <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
              담당자 연락처와 이메일은 결제 운영, 주문 문의, 비회원 조회 안내에 함께 사용할 수 있습니다.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-sm bg-slate-50 p-3 text-xs text-slate-700">인증키 상태<br /><strong>{selectedRow.credentialStorageLabel}</strong></div>
            <div className="rounded-sm bg-slate-50 p-3 text-xs text-slate-700">결제 거래 기록<br /><strong>{selectedRow.transactionCount}건</strong></div>
            <div className="rounded-sm bg-slate-50 p-3 text-xs text-slate-700">실제 PayUp 호출<br /><strong>{selectedRow.providerCalled ? "확인됨" : "미확인"}</strong></div>
            <div className="rounded-sm bg-slate-50 p-3 text-xs text-slate-700">최근 연결 결과<br /><strong>{selectedRow.connectionCode || "검사 전"}</strong></div>
            <label className="grid gap-1 text-xs font-normal text-slate-600">
              담당자명
              <input value={selectedRow.managerName || "확인 전"} readOnly aria-readonly="true" className={inputClass("bg-slate-50")} />
            </label>
            <label className="grid gap-1 text-xs font-normal text-slate-600">
              연락처
              <input value={selectedRow.contactPhone || "확인 전"} readOnly aria-readonly="true" className={inputClass("bg-slate-50")} />
            </label>
            <label className="grid gap-1 text-xs font-normal text-slate-600 md:col-span-2">
              이메일
              <input value={selectedRow.contactEmail || "확인 전"} readOnly aria-readonly="true" className={inputClass("bg-slate-50")} />
            </label>
            <label className="grid gap-1 text-xs font-normal text-slate-600 md:col-span-2">
              인증키 참조명
              <input value={selectedRow.authKeyRef} onChange={(event) => updateRow(selectedRow.id, { authKeyRef: event.target.value })} className={inputClass()} placeholder="직접 입력 대신 Secret 참조명을 쓸 때만 입력" />
            </label>
          </div>
        </div>
      ) : null}
    </section>
  );
}
