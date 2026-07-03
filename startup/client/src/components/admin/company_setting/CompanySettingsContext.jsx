import PropTypes from "prop-types";
import { useCompanySettings } from "./useCompanySettings";
import { CompanySettingsContext } from "./companySettingsContextCore";


function CompanySettingsProvider({ children }) {
  const value = useCompanySettings();
  return (
    <CompanySettingsContext.Provider value={value}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

CompanySettingsProvider.propTypes = {
  children: PropTypes.node,
};

export { CompanySettingsProvider };
