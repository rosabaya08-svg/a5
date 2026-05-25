export type AuditLogDraft = {
  actor: "payment_server";
  action: string;
  target: string;
  severity: "info" | "warning" | "blocked";
  message: string;
  createdAt: string;
};

export function createAuditLogDraft(input: Omit<AuditLogDraft, "actor" | "createdAt">): AuditLogDraft {
  return {
    actor: "payment_server",
    createdAt: new Date().toISOString(),
    ...input,
  };
}

export function appendAuditLogSkeleton(log: AuditLogDraft): { plannedPath: string; log: AuditLogDraft; writeBlocked: true } {
  return {
    plannedPath: "audit_logs/{autoId}",
    log,
    writeBlocked: true,
  };
}
