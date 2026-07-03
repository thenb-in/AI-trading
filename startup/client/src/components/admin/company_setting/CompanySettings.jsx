import { useDataContext, hasPermission } from "@context/useDataContext";
import { AccessDenied } from "../../AccessDenied";
import { CompanySettingsProvider } from "./CompanySettingsContext";
import { CompanySettingsShell } from "./CompanySettingsShell";

function CompanySettings() {
  const requiredPermission = "view_company_settings";
  const canViewCompanySettings = hasPermission(requiredPermission, useDataContext());

  if (!canViewCompanySettings) {
    return <AccessDenied requiredPermission={requiredPermission} />;
  }

  return (
    <CompanySettingsProvider>
      <CompanySettingsShell />
    </CompanySettingsProvider>
  );
}

export { CompanySettings };
