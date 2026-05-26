"use client";

import { useState } from "react";

const providerOptions = ["mock", "toss", "portone", "kcp", "nice"];

type DraftState = {
  provider: string;
  clientKey: string;
  merchantId: string;
  channelKey: string;
  apiBaseUrl: string;
  successUrl: string;
  failUrl: string;
  webhookUrl: string;
};

const initialDraft: DraftState = {
  provider: "mock",
  clientKey: "",
  merchantId: "",
  channelKey: "",
  apiBaseUrl: "",
  successUrl: "https://mall.signage-ai-a5.co.kr/q/SANHO701/success",
  failUrl: "https://mall.signage-ai-a5.co.kr/q/SANHO701/failed",
  webhookUrl: "",
};

export function PgGatewaySettingsPanel() {
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [message, setMessage] = useState("");

  function update<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(
      "PG 설정 입력값을 화면에서 검토했습니다. 실제 반영은 Firebase Functions runtime/Secret Manager와 Cloudflare 공개 환경변수에 분리 입력해야 합니다.",
    );
  }

  return (
    <section className="grid gap-5">
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-950">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-700">PG gateway control</p>
        <h2 className="mt-1 text-2xl font-black">PG 결제 모듈 API 설정</h2>
        <p className="mt-2 text-sm leading-6">
          최고관리자가 PG사 변경과 공개 설정값을 검토할 수 있는 베타 입력창입니다. Secret key, webhook secret, private key는
          브라우저나 Git에 저장하지 않고 Firebase Functions runtime 또는 Secret Manager에만 입력해야 합니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-slate-700">
            PG사
            <select
              value={draft.provider}
              onChange={(event) => update("provider", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
            >
              {providerOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            NEXT_PUBLIC_PG_CLIENT_KEY
            <input
              value={draft.clientKey}
              onChange={(event) => update("clientKey", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="공개 client key"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            PG_MERCHANT_ID
            <input
              value={draft.merchantId}
              onChange={(event) => update("merchantId", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="Functions runtime 입력 대상"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            PG_CHANNEL_KEY
            <input
              value={draft.channelKey}
              onChange={(event) => update("channelKey", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="Functions runtime 입력 대상"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            NEXT_PUBLIC_PAYMENT_API_BASE_URL
            <input
              value={draft.apiBaseUrl}
              onChange={(event) => update("apiBaseUrl", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="Firebase Functions base URL"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700">
            PAYMENT_WEBHOOK_URL
            <input
              value={draft.webhookUrl}
              onChange={(event) => update("webhookUrl", event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-sm font-bold"
              placeholder="PG console 등록 webhook URL"
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
          <p className="font-black">브라우저 입력 금지 값</p>
          <p>PG_SECRET_KEY, PG_WEBHOOK_SECRET, service account, private key는 이 화면에 저장하지 않습니다.</p>
          <p>실제 반영 위치: Firebase Functions runtime config 또는 Secret Manager.</p>
        </div>

        {message ? <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{message}</div> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" className="rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">
            설정 검토
          </button>
          <a href="/admin/payments" className="rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
            결제 모니터로 이동
          </a>
        </div>
      </form>

      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <h3 className="text-lg font-black text-slate-950">PG 변경 시 체크 순서</h3>
        {[
          "PG사 공식 sandbox 문서와 키 수령",
          "Cloudflare Pages에는 public client key만 입력",
          "Firebase Functions에는 secret key/webhook secret만 입력",
          "functions/src/payments/providerAdapter.ts의 선택 provider branch 구현",
          "amount recalculation, QR session, inventory transaction, audit log 유지",
          "sandbox 결제 성공/실패/만료/중복/금액불일치 테스트",
        ].map((item, index) => (
          <p key={item} className="rounded-md bg-slate-50 p-3 font-bold">
            {index + 1}. {item}
          </p>
        ))}
      </div>
    </section>
  );
}
