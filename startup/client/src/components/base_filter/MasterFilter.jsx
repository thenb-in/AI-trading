import { Filter } from './filter';
import PropTypes from 'prop-types';

const MasterFilter = ({
  onFiltersApply,
  filtersConfig = [],
  isLoading = false,
  disabled = false,
}) => (
  <Filter
    filtersConfig={filtersConfig}
    onFiltersApply={onFiltersApply}
    isLoading={isLoading}
    disabled={disabled}
  />
);

MasterFilter.propTypes = {
  onFiltersApply: PropTypes.func.isRequired,
  filtersConfig: PropTypes.array,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { MasterFilter };
