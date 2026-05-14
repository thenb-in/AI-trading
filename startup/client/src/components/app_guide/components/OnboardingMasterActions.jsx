import PropTypes from 'prop-types';
import { getThemeClasses } from '../utils/themeUtils';

function OnboardingMasterActions({ title, masterKey, theme = {}, actions = {} }) {
  const themeClasses = getThemeClasses(theme.primaryColor || 'blue');
  const {
    onOpen = () => {},
    onCreate = () => {},
    // onImport = () => {},
    // onDownloadTemplate = () => {}
  } = actions;

  console.log("Master Key: ", masterKey);
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCreate}
        aria-label={`Create ${title}`}
        className={`px-4 py-2 text-sm font-semibold rounded-lg ${themeClasses.buttonGradient} text-white shadow-sm hover:opacity-90 transition-opacity`}
      >
        Create
      </button>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${title}`}
        className={`px-4 py-2 text-sm font-semibold rounded-lg ${themeClasses.buttonPrimary} text-white shadow-sm hover:opacity-90 transition-opacity`}
      >
        Open
      </button>

      {/* <button
        type="button"
        onClick={onImport}
        aria-label={`Import ${title}`}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
      >
        Import
      </button>
      <button
        type="button"
        onClick={onDownloadTemplate}
        aria-label={`Download ${title} template`}
        className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
      >
        Download Template
      </button> */}
    </div>
  );
}

OnboardingMasterActions.propTypes = {
  title: PropTypes.string.isRequired,
  masterKey: PropTypes.string.isRequired,
  theme: PropTypes.shape({
    primaryColor: PropTypes.string
  }),
  actions: PropTypes.shape({
    onOpen: PropTypes.func,
    onCreate: PropTypes.func,
    onImport: PropTypes.func,
    onDownloadTemplate: PropTypes.func
  })
};

export { OnboardingMasterActions };
