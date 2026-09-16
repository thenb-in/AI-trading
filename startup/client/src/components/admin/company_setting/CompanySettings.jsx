import { CompanySettingsProvider } from "./CompanySettingsContext";
import { CompanySettingsShell } from "./CompanySettingsShell";

// Who may open this page is decided by its route (see RequireAccess in AdminDashboard).
function CompanySettings() {
  return (
    <CompanySettingsProvider>
      <CompanySettingsShell />
    </CompanySettingsProvider>
  );
}

export { CompanySettings };
