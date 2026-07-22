import { getGenericAppModuleDefinitions } from './genericAppModules';


let appModuleProvider = () => [];


const registerAppModules = (provider) => {
  appModuleProvider = typeof provider === 'function' ? provider : () => [];
};


const getAppModuleDefinitions = () => [
  ...appModuleProvider(),
  ...getGenericAppModuleDefinitions(),
];

export { registerAppModules, getAppModuleDefinitions };
