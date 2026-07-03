import { useState } from "react";
import { useDataContext } from "@context/useDataContext";
import { motion } from "framer-motion";
import { Building2, Save, Loader2, RotateCcw, Menu } from "lucide-react";
import { useCompanySettingsContext, TAB_COMPONENTS } from "./companySettingsContextCore";
import { COMPANY_SETTINGS_TABS } from "./companySettingsConstants";
import { CompanyProfileSettings } from "@app/components/companyprofile/CompanyProfileSettings";


function CompanySettingsShell() {
  const { setHamburgerMenu, hamburgerMenu } = useDataContext();
  const [activeTab, setActiveTab] = useState(COMPANY_SETTINGS_TABS[0].id);

  const {
    isLoading,
    isDirty,
    showFeedback,
    canSave,
    handleSaveAll,
    handleDiscardAll,
    companyProfileRef,
    handleProfileDirtyChange,
  } = useCompanySettingsContext();

  const handleDiscard = () => {
    if (canSave && !isLoading) handleDiscardAll();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {/* Fixed header: title + primary actions + centred tab navigation */}
      <header className="shrink-0 border-b border-gray-200 bg-white">
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setHamburgerMenu(!hamburgerMenu)}
              className="md:hidden -ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Building2 className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight truncate">
                Company Settings
              </h1>
              <p className="hidden lg:block text-xs text-gray-500">
                Manage your organisation&apos;s profile, access and compliance
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              {isDirty && !showFeedback ? (
                <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 mr-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              ) : null}
              <button
                type="button"
                onClick={handleDiscard}
                disabled={!canSave || isLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Discard</span>
              </button>
              <motion.button
                type="button"
                onClick={handleSaveAll}
                disabled={isLoading || !canSave}
                whileHover={!isLoading && canSave ? { scale: 1.02 } : {}}
                whileTap={!isLoading && canSave ? { scale: 0.98 } : {}}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
                  isLoading
                    ? "bg-indigo-300 cursor-not-allowed"
                    : !canSave
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save changes
                  </>
                )}
              </motion.button>
            </div>
          </div>

          {/* Centred segmented navigation */}
          <div className="flex justify-center px-4 pb-3">
            <nav className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
              {COMPANY_SETTINGS_TABS.map(({ id, label, icon: Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Indeterminate progress line while saving/loading */}
        <div className={`h-0.5 bg-indigo-500 transition-opacity ${isLoading ? "animate-pulse opacity-100" : "opacity-0"}`} />
      </header>

      {/* Scrollable content, centred and width-capped */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
          {/* All panels mounted; inactive ones hidden so form state persists */}
          {COMPANY_SETTINGS_TABS.map(({ id }) => {
            const TabComponent = TAB_COMPONENTS[id];
            return (
              <div key={id} className={activeTab === id ? "" : "hidden"}>
                {id === "profile" ? (
                  <CompanyProfileSettings
                    ref={companyProfileRef}
                    isLoading={isLoading}
                    onDirtyChange={handleProfileDirtyChange}
                  />
                ) : (
                  <TabComponent />
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export { CompanySettingsShell };
