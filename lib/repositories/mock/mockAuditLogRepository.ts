import { mockAuditLogs } from "@/data/mockOrders";
import type { AuditLogRepository } from "@/lib/repositories/types";
import { repositoryOk } from "@/lib/repositories/types";

export const mockAuditLogRepository: AuditLogRepository = {
  async appendAuditLog(input) {
    return repositoryOk({
      id: `mock-audit-${input.target}-${input.createdAt}`,
      ...input,
    });
  },

  async listAuditLogs(filters) {
    const logs = mockAuditLogs.filter((log) => {
      if (filters?.target && log.target !== filters.target) return false;
      if (filters?.actorRole && log.actorRole !== filters.actorRole) return false;
      return true;
    });

    return repositoryOk(logs);
  },
};
