import { motion } from "framer-motion";
import { Building2, Monitor, Smartphone, Globe } from "lucide-react";
import { ToggleSwitch } from "../../ToggleSwitch";
import { SettingsCard } from "../SettingsCard";
import {
  ContactSection,
  TaxStatutorySection,
  BankSection,
  LogoSection,
} from "../CompanyDetailsForm";
import { useCompanySettingsContext } from "../companySettingsContextCore";

/**
 * General — company identity, device access and the full company details
 */
function GeneralTab() {
  const {
    userData,
    companySettings,
    handleNameChange,
    handleMobileAppChange,
    handleDesktopWebChange,
    handleMobileWebChange,
    companyDetails,
    companyLogoFile,
    companyLogoPreview,
    logoInputRef,
    handleCompanyDetailsChange,
    handleCompanyLogoChange,
    clearCompanyLogo,
  } = useCompanySettingsContext();

  const fieldProps = { formData: companyDetails, onChange: handleCompanyDetailsChange };

  return (
    <div className="space-y-4">
      <SettingsCard
        icon={Building2}
        title="General"
        subtitle="Company identity and where members are allowed to sign in"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Company Name
              {!userData?.isSupportUser && (
                <span className="ml-2 text-xs font-normal text-gray-400">(Read-only)</span>
              )}
            </label>
            <motion.input
              type="text"
              value={companySettings.name}
              onChange={handleNameChange}
              placeholder="Enter company name"
              readOnly={!userData?.isSupportUser}
              className={`w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
                !userData?.isSupportUser ? "bg-gray-50 cursor-not-allowed text-gray-600" : ""
              }`}
              whileFocus={userData?.isSupportUser ? { scale: 1.004 } : {}}
            />
            <p className="mt-2 text-xs text-gray-400">Used on payslips, offer letters and invoices.</p>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700">
              <Monitor className="w-4 h-4 text-gray-500" />
              Device Access
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
              <ToggleSwitch
                label={<span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-gray-500" />App Access</span>}
                checked={companySettings.mobileApp}
                onChange={handleMobileAppChange}
                description="Sign in from the mobile app"
              />
              <ToggleSwitch
                label={<span className="flex items-center gap-2"><Monitor className="w-4 h-4 text-gray-500" />Web Access</span>}
                checked={companySettings.desktopWeb}
                onChange={handleDesktopWebChange}
                description="Sign in from the desktop web app"
              />
              <ToggleSwitch
                label={<span className="flex items-center gap-2"><Globe className="w-4 h-4 text-gray-500" />Mobile Web Access</span>}
                checked={companySettings.mobileWeb}
                onChange={handleMobileWebChange}
                description="Sign in from a mobile browser"
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      <ContactSection {...fieldProps} />
      <TaxStatutorySection {...fieldProps} />
      <BankSection {...fieldProps} />
      <LogoSection
        logoFile={companyLogoFile}
        logoPreview={companyLogoPreview}
        fileInputRef={logoInputRef}
        onLogoChange={handleCompanyLogoChange}
        onClearLogo={clearCompanyLogo}
      />
    </div>
  );
}

export { GeneralTab };
