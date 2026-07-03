import { createContext, useContext } from "react";
import { GeneralTab } from "./tabs/GeneralTab";
import { LocationTab } from "./tabs/LocationTab";


const TAB_COMPONENTS = {
  general: GeneralTab,
  location: LocationTab,
};

const CompanySettingsContext = createContext(null);


function useCompanySettingsContext() {
  const ctx = useContext(CompanySettingsContext);
  if (!ctx) {
    throw new Error("useCompanySettingsContext must be used within a CompanySettingsProvider");
  }
  return ctx;
}

export { TAB_COMPONENTS, CompanySettingsContext, useCompanySettingsContext };
