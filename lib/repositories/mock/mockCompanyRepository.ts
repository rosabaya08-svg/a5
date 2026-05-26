import { mockCompanies } from "@/data/mockCompanies";
import type { CompanyRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockCompanyRepository: CompanyRepository = {
  async listCompanies(filters) {
    return repositoryOk(
      mockCompanies.filter((company) => {
        if (filters?.status && company.status !== filters.status) return false;
        return true;
      }),
    );
  },

  async getCompanyById(companyId) {
    const company = mockCompanies.find((item) => item.id === companyId);

    if (!company) {
      return repositoryError("NOT_FOUND", "Company not found", companyId);
    }

    return repositoryOk(company);
  },
};
