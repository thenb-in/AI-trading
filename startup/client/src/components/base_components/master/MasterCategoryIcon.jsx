import PropTypes from "prop-types";
import { getMasterCategoryOrder, defaultMasterCategoryIcon } from "@data/getMasterModules";

function MasterCategoryIcon({ name }) {
  const Icon = getMasterCategoryOrder().find((c) => c.name === name)?.icon || defaultMasterCategoryIcon;
  return <Icon className="h-4 w-4" />;
}

MasterCategoryIcon.propTypes = {
  name: PropTypes.string.isRequired,
};

export { MasterCategoryIcon };
