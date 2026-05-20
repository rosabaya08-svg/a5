import type { AuditLogRepository } from "@/lib/repositories/types";
import { repositoryError } from "@/lib/repositories/types";

export const firebaseAuditLogRepository: AuditLogRepository = {
  async appendAuditLog(input) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase audit log repository is a stub. Firebase SDK is not connected.", input.target);
  },

  async listAuditLogs() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase audit log repository is a stub. Firebase SDK is not connected.");
  },
};
