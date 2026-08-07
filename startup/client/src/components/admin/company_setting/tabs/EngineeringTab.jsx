import { EyeOff } from "lucide-react";
import { SettingsCard } from "../SettingsCard";
import { DebugModeShortcutField } from "../DebugModeShortcutField";
import { useCompanySettingsContext } from "../companySettingsContextCore";


function EngineeringTab() {
  const { companySettings, handleDebugModeShortcutChange } = useCompanySettingsContext();

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={EyeOff}
        title="Debug Mode"
        subtitle="The key combination that turns debug mode on and off for everyone in this company"
      >
        <div className="max-w-md">
          <DebugModeShortcutField
            value={companySettings.debug_mode_shortcut}
            onChange={handleDebugModeShortcutChange}
          />
        </div>
      </SettingsCard>
    </div>
  );
}

export { EngineeringTab };
