"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { signOut } from "firebase/auth";
import {
  changeCompanyPassword,
  requestCompanyWithdrawal,
  startCompanyEmailVerification,
  verifyCompanyEmailCode,
  type CompanyEmailVerificationPurpose,
} from "@/lib/company/accountSecurity";
import { clearPortalSession, readPortalSession } from "@/lib/auth/session";
import type { PortalSession } from "@/lib/auth/session";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

type VerificationFlow = {
  verificationId: string;
  verificationToken: string;
  code: string;
  emailMasked: string;
  status: "idle" | "sent" | "verified";
  message: string;
};

const emptyFlow: VerificationFlow = {
  verificationId: "",
  verificationToken: "",
  code: "",
  emailMasked: "",
  status: "idle",
  message: "",
};

function isStrongPassword(value: string) {
  return value.length >= 8 && /[^A-Za-z0-9]/.test(value);
}

function subscribeToSessionChange(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("focus", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

function getCompanySessionSnapshot() {
  return JSON.stringify(readPortalSession("company") ?? null);
}

function getServerSnapshot() {
  return "null";
}

function parseSession(snapshot: string): PortalSession | null {
  try {
    return JSON.parse(snapshot) as PortalSession | null;
  } catch {
    return null;
  }
}

export function CompanyAccountSecurityPanel() {
  const sessionSnapshot = useSyncExternalStore(subscribeToSessionChange, getCompanySessionSnapshot, getServerSnapshot);
  const session = useMemo(() => parseSession(sessionSnapshot), [sessionSnapshot]);
  const [passwordFlow, setPasswordFlow] = useState<VerificationFlow>(emptyFlow);
  const [withdrawalFlow, setWithdrawalFlow] = useState<VerificationFlow>(emptyFlow);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    newPasswordConfirm: "",
  });
  const [withdrawalForm, setWithdrawalForm] = useState({
    currentPassword: "",
    reason: "",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [withdrawalCompleted, setWithdrawalCompleted] = useState(false);

  async function startCode(purpose: CompanyEmailVerificationPurpose) {
    setBusy(true);
    setMessage("");

    try {
      const result = await startCompanyEmailVerification({ purpose });
      const nextFlow: VerificationFlow = {
        verificationId: result.verificationId,
        verificationToken: "",
        code: "",
        emailMasked: result.emailMasked,
        status: "sent",
        message:
          result.emailStatus === "sent"
            ? `${result.emailMasked} 주소로 인증번호를 발송했습니다.`
            : "인증번호가 생성되었지만 이메일 발송 설정 확인이 필요합니다.",
      };

      if (purpose === "password_change") setPasswordFlow(nextFlow);
      if (purpose === "withdrawal") setWithdrawalFlow(nextFlow);
      setMessage(nextFlow.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이메일 인증번호 발송에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(purpose: CompanyEmailVerificationPurpose) {
    const flow = purpose === "password_change" ? passwordFlow : withdrawalFlow;

    if (!flow.verificationId || flow.code.length !== 6) {
      setMessage("인증번호 6자리를 입력해 주세요.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const result = await verifyCompanyEmailCode({
        purpose,
        verificationId: flow.verificationId,
        code: flow.code,
      });
      const nextFlow: VerificationFlow = {
        ...flow,
        verificationToken: result.verificationToken,
        status: "verified",
        message: "이메일 인증이 완료되었습니다.",
      };

      if (purpose === "password_change") setPasswordFlow(nextFlow);
      if (purpose === "withdrawal") setWithdrawalFlow(nextFlow);
      setMessage("이메일 인증이 완료되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "인증번호 확인에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitPasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!passwordFlow.verificationToken) {
      setMessage("비밀번호 변경 전 이메일 인증을 완료해 주세요.");
      return;
    }

    if (!isStrongPassword(passwordForm.newPassword)) {
      setMessage("새 비밀번호는 특수문자를 포함해 8자 이상 입력해 주세요.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
      setMessage("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setBusy(true);

    try {
      await changeCompanyPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        verificationId: passwordFlow.verificationId,
        verificationToken: passwordFlow.verificationToken,
      });
      setPasswordFlow(emptyFlow);
      setPasswordForm({ currentPassword: "", newPassword: "", newPasswordConfirm: "" });
      setMessage("비밀번호가 변경되었습니다. 다음 로그인부터 새 비밀번호를 사용해 주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitWithdrawal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!withdrawalFlow.verificationToken) {
      setMessage("회원 탈퇴 요청 전 이메일 인증을 완료해 주세요.");
      return;
    }

    const confirmed = window.confirm("회원 탈퇴 요청을 접수하면 상품 등록과 기업 로그인 사용이 제한됩니다. 계속 진행할까요?");
    if (!confirmed) return;

    setBusy(true);

    try {
      await requestCompanyWithdrawal({
        currentPassword: withdrawalForm.currentPassword,
        verificationId: withdrawalFlow.verificationId,
        verificationToken: withdrawalFlow.verificationToken,
        reason: withdrawalForm.reason,
      });
      setWithdrawalCompleted(true);
      clearPortalSession("company");
      const auth = getFirebaseAuthClient();
      if (auth) await signOut(auth).catch(() => undefined);
      setMessage("회원 탈퇴 요청이 접수되었습니다. 주문/배송/정산 기록은 보존되고 계정 상태만 검토 대기로 전환됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "회원 탈퇴 요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function updateFlowCode(purpose: CompanyEmailVerificationPurpose, code: string) {
    const sanitized = code.replace(/\D/g, "").slice(0, 6);
    if (purpose === "password_change") setPasswordFlow((current) => ({ ...current, code: sanitized }));
    if (purpose === "withdrawal") setWithdrawalFlow((current) => ({ ...current, code: sanitized }));
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-normal tracking-[0.14em] text-emerald-700">계정 범위</p>
            <h2 className="mt-1 text-lg font-normal text-slate-950">기업 계정 보안 상태</h2>
            <p className="mt-2 text-sm font-normal text-slate-600">
              {session?.displayName || "기업 관리자"} · {session?.businessNo || "사업자번호 확인 필요"}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-normal text-emerald-700 ring-1 ring-emerald-100">
            본인 인증 필요
          </span>
        </div>
        {message ? <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-normal text-blue-800">{message}</p> : null}
      </section>

      <form onSubmit={submitPasswordChange} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-normal text-slate-950">비밀번호 변경</h2>
            <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
              등록된 담당자 이메일 인증과 현재 비밀번호 확인을 통과해야 변경됩니다.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => startCode("password_change")}
            className="h-10 rounded-md bg-slate-950 px-4 text-sm font-normal text-white disabled:opacity-50"
          >
            인증번호 발송
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={passwordFlow.code}
            onChange={(event) => updateFlowCode("password_change", event.target.value)}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
            placeholder="이메일 인증번호 6자리"
          />
          <button
            type="button"
            disabled={busy || !passwordFlow.verificationId || passwordFlow.code.length !== 6}
            onClick={() => verifyCode("password_change")}
            className="h-11 rounded-md border border-slate-300 px-4 text-sm font-normal text-slate-800 disabled:opacity-50"
          >
            인증 확인
          </button>
        </div>
        {passwordFlow.message ? <p className="mt-2 text-xs font-normal text-slate-500">{passwordFlow.message}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
            placeholder="현재 비밀번호"
          />
          <input
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
            placeholder="새 비밀번호"
          />
          <input
            type="password"
            value={passwordForm.newPasswordConfirm}
            onChange={(event) => setPasswordForm((current) => ({ ...current, newPasswordConfirm: event.target.value }))}
            className="h-11 rounded-md border border-slate-200 px-3 text-sm font-normal outline-none focus:border-slate-950"
            placeholder="새 비밀번호 확인"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !passwordFlow.verificationToken}
          className="mt-4 h-11 rounded-md bg-emerald-700 px-5 text-sm font-normal text-white disabled:opacity-50"
        >
          비밀번호 변경 적용
        </button>
      </form>

      <form onSubmit={submitWithdrawal} className="rounded-md border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-normal text-red-700">회원 탈퇴 요청</h2>
            <p className="mt-1 text-sm font-normal leading-6 text-slate-600">
              주문, 배송, 결제, 감사 기록은 삭제하지 않고 계정 상태를 탈퇴 요청으로 전환합니다.
            </p>
          </div>
          <button
            type="button"
            disabled={busy || withdrawalCompleted}
            onClick={() => startCode("withdrawal")}
            className="h-10 rounded-md bg-red-600 px-4 text-sm font-normal text-white disabled:opacity-50"
          >
            탈퇴 인증번호 발송
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={withdrawalFlow.code}
            onChange={(event) => updateFlowCode("withdrawal", event.target.value)}
            className="h-11 rounded-md border border-red-200 px-3 text-sm font-normal outline-none focus:border-red-600"
            placeholder="이메일 인증번호 6자리"
          />
          <button
            type="button"
            disabled={busy || !withdrawalFlow.verificationId || withdrawalFlow.code.length !== 6 || withdrawalCompleted}
            onClick={() => verifyCode("withdrawal")}
            className="h-11 rounded-md border border-red-200 px-4 text-sm font-normal text-red-700 disabled:opacity-50"
          >
            인증 확인
          </button>
        </div>
        {withdrawalFlow.message ? <p className="mt-2 text-xs font-normal text-slate-500">{withdrawalFlow.message}</p> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr]">
          <input
            type="password"
            value={withdrawalForm.currentPassword}
            onChange={(event) => setWithdrawalForm((current) => ({ ...current, currentPassword: event.target.value }))}
            className="h-11 rounded-md border border-red-200 px-3 text-sm font-normal outline-none focus:border-red-600"
            placeholder="현재 비밀번호"
          />
          <input
            type="text"
            value={withdrawalForm.reason}
            onChange={(event) => setWithdrawalForm((current) => ({ ...current, reason: event.target.value }))}
            className="h-11 rounded-md border border-red-200 px-3 text-sm font-normal outline-none focus:border-red-600"
            placeholder="탈퇴 사유"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !withdrawalFlow.verificationToken || withdrawalCompleted}
          className="mt-4 h-11 rounded-md bg-red-600 px-5 text-sm font-normal text-white disabled:opacity-50"
        >
          회원 탈퇴 요청 접수
        </button>
      </form>
    </div>
  );
}
