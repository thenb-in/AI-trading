
let companyProfileSettingsComponent = null;


const registerCompanyProfileSettings = (component) => {
  companyProfileSettingsComponent = component || null;
};


const getCompanyProfileSettings = () => companyProfileSettingsComponent;

export { registerCompanyProfileSettings, getCompanyProfileSettings };
