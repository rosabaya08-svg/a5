"use client";

import { useMemo, useState } from "react";
import { mockCompanies } from "@/data/mockCompanies";
import {
  A5_PLATFORM_FEE_RATE,
  calculateInfinySettlement,
  INFINY_PG_FEE_RATE,
  INFINY_PROVIDER_LABEL,
  INFINY_TOTAL_FEE_RATE,
} from "@/lib/payments/infinySettlementPolicy";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { PgMerchantStatus, PgProvider } from "@/types/commerce";

const providerOptions: PgProvider[] = ["infiny", "mock", "toss", "portone", "kcp", "nice"];
const providerLabels: Record<PgProvider, string> = {
  infiny: "인피니 PG",
  mock: "모의 결제",
  toss: "토스페이먼츠",
  portone: "포트원",
  kcp: "KCP",
  nice: "나이스페이먼츠",
};

const merchantStatusLabels: Record<PgMerchantStatus, string> = {
  not_applied: "가입 전",
  in_review: "인피니 심사 중",
  mid_issued: "MID 발급",
  active: "운영 가능",
  blocked: "차단",
};

type DraftState = {
  provider: PgProvider;
  clientKey: string;
  representativeMerchantId: string;
  channelKey: string;
  apiBaseUrl: string;
  successUrl: string;
  failUrl: string;
  webhookUrl: string;
};

type MerchantDraft = {
  companyId: string;
  companyName: string;
  merchantId: string;
  merchantStatus: PgMerchantStatus;
};

const initialDraft: DraftState = {
  provider: "infiny",
  clientKey: "",
  representativeMerchantId: "",
  channelKey: "",
  apiBaseUrl: "",
  successUrl: "https://mall.signage-ai-a5.co.kr/q/SANHO701/success",
  failUrl: "https://mall.signage-ai-a5.co.kr/q/SANHO701/failed",
  webhookUrl: "",
};

function initialMerchantRows(): MerchantDraft[] {
  return mockCompanies.map((company) => ({
    companyId: company.id,
    companyName: company.name,
    merchantId: company.pgProfile?.merchantId ?? "",
    merchantStatus: company.pgProfile?.merchantStatus ?? "not_applied",
  }));
}

export function PgGatewaySettingsPanel() {
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [merchantRows, setMerchantRows] = useState<MerchantDraft[]>(initialMerchantRows);
  const [message, setMessage] = useState("");
  const feePreview = useMemo(() => calculateInfinySettlement(100000), []);

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateMerchant(companyId: string, patch: Partial<MerchantDraft>) {
    setMerchantRows((current) => current.map((row) => (row.companyId === companyId ? { ...row, ...patch } : row)));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("최고관리자 입력값을 검토했습니다. 운영 반영 시 기업별 MID는 서버/Firestore 관리자 권한으로만 저장해야 합니다.");
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">기업용 PG 운영</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">인피니 PG / 기업별 MID 관리</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              인피니가 고객사별 가입과 PG 승인을 진행하고 MID를 발급하면, 최고관리자가 이 화면에서 기업별 가맹점 코드를 관리합니다.
              기업 어드민은 PG사와 MID 상태만 조회하고 입력 권한은 갖지 않습니다.
            </p>
          </div>
          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">SUPER_ADMIN 전용</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["PG사", INFINY_PROVIDER_LABEL],
            ["인피니 수수료", formatPercent(INFINY_PG_FEE_RATE)],
            ["우리 주문 수수료", formatPercent(A5_PLATFORM_FEE_RATE)],
            ["총 공제", formatPercent(INFINY_TOTAL_FEE_RATE)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-500">{label}</p>
              <p className="mt-1 text-base font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            PG사
            <select
              value={draft.provider}
              onChange={(event) => update("provider", event.target.value as PgProvider)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
            >
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {providerLabels[provider]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            공개 클라이언트 키
            <input
              value={draft.clientKey}
              onChange={(event) => update("clientKey", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="브라우저 공개 키만 입력"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            대표 MID / 플랫폼 MID
            <input
              value={draft.representativeMerchantId}
              onChange={(event) => update("representativeMerchantId", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="인피니가 분할정산용 대표 MID를 제공할 때만 입력"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            채널 키
            <input
              value={draft.channelKey}
              onChange={(event) => update("channelKey", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="서버 실행 환경 입력 대상"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            결제 API 기본 주소
            <input
              value={draft.apiBaseUrl}
              onChange={(event) => update("apiBaseUrl", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="Firebase Functions 또는 PG relay 주소"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            결제 웹훅 주소
            <input
              value={draft.webhookUrl}
              onChange={(event) => update("webhookUrl", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="인피니 콘솔 등록 대상"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            결제 성공 URL
            <input
              value={draft.successUrl}
              onChange={(event) => update("successUrl", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            결제 실패 URL
            <input
              value={draft.failUrl}
              onChange={(event) => update("failUrl", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-black">정산 지급 실행 차단</p>
          <p>인피니가 결제 수수료 {formatPercent(INFINY_PG_FEE_RATE)}와 우리 주문 수수료 {formatPercent(A5_PLATFORM_FEE_RATE)}를 합산해 총 {formatPercent(INFINY_TOTAL_FEE_RATE)} 공제 후 기업사에 정산합니다.</p>
          <p>우리 시스템은 정산 조회와 검산만 제공하고 지급 실행 버튼, 계좌 이체, 지급 완료 처리는 열지 않습니다.</p>
        </div>

        {message ? <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
            최고관리자 설정 검토
          </button>
          <a href="/admin/payments" className="rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
            결제 모니터로 이동
          </a>
        </div>
      </form>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-950">기업별 인피니 MID 발급 현황</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">기업 어드민에는 이 표의 PG사, MID, 상태만 읽기 전용으로 노출합니다.</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">기업 입력 불가</span>
        </div>
        <div className="mt-4 grid gap-3">
          {merchantRows.map((row) => (
            <div key={row.companyId} className="grid gap-3 rounded-md border border-slate-200 p-3 lg:grid-cols-[1fr_1.2fr_220px_150px]">
              <div>
                <p className="text-xs font-black text-slate-500">기업사</p>
                <p className="mt-1 font-black text-slate-950">{row.companyName}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{row.companyId}</p>
              </div>
              <label className="grid gap-1 text-xs font-black text-slate-500">
                인피니 MID
                <input
                  value={row.merchantId}
                  onChange={(event) => updateMerchant(row.companyId, { merchantId: event.target.value })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                  placeholder="INF-COMPANY-000000"
                />
              </label>
              <label className="grid gap-1 text-xs font-black text-slate-500">
                발급 상태
                <select
                  value={row.merchantStatus}
                  onChange={(event) => updateMerchant(row.companyId, { merchantStatus: event.target.value as PgMerchantStatus })}
                  className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold text-slate-950"
                >
                  {Object.entries(merchantStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="rounded-md bg-slate-50 p-3 text-xs font-bold text-slate-600">
                <p className="font-black text-slate-950">권한</p>
                <p className="mt-1">최고관리자 입력</p>
                <p>기업 어드민 조회</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <h3 className="text-lg font-black text-slate-950">운영 체크 순서</h3>
        {[
          "인피니가 기업사별 가입, PG 심사, MID 발급을 완료",
          "최고관리자가 기업별 MID와 상태를 관리자 권한으로 저장",
          "기업 어드민은 PG사와 MID 발급 상태만 읽기 전용 확인",
          "단일 결제 분할정산 API가 없으면 서로 다른 MID가 섞인 장바구니 실결제 차단",
          `100,000원 결제 기준 인피니 ${formatCurrency(feePreview.pgFeeAmount)}, A5 ${formatCurrency(feePreview.platformFeeAmount)}, 기업 정산 예정 ${formatCurrency(feePreview.payoutAmount)}`,
        ].map((item, index) => (
          <p key={item} className="rounded-md bg-slate-50 p-3 font-bold">
            {index + 1}. {item}
          </p>
        ))}
      </section>
    </section>
  );
}
