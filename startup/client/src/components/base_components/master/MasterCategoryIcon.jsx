import PropTypes from "prop-types";
import { masterCategoryOrder, defaultMasterCategoryIcon } from "@app/data/getMasterModules";

function MasterCategoryIcon({ name }) {
  const Icon = masterCategoryOrder.find((c) => c.name === name)?.icon || defaultMasterCategoryIcon;
  return <Icon className="h-4 w-4" />;
}

MasterCategoryIcon.propTypes = {
  name: PropTypes.string.isRequired,
};

export { MasterCategoryIcon };
