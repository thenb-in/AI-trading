import { Filter } from './filter';
import PropTypes from 'prop-types';

const ReportFilter = ({
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

ReportFilter.propTypes = {
  onFiltersApply: PropTypes.func,
  filtersConfig: PropTypes.array,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export { ReportFilter };
