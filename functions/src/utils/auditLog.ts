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

export function toAuditLogDocument(log: AuditLogDraft): Record<string, unknown> {
  return {
    actor: log.actor,
    actorRole: "SYSTEM",
    actor_role: "SYSTEM",
    actorName: "Firebase Functions payment server",
    actor_name: "Firebase Functions payment server",
    action: log.action,
    target: log.target,
    severity: log.severity,
    message: log.message,
    source: "firebase_functions_payment_backend",
    demo_read_enabled: true,
    createdAt: log.createdAt,
    created_at: log.createdAt,
  };
}
