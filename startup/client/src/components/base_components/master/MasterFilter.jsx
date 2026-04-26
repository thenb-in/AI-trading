import { Filter } from '@startup/components/Filter';
import PropTypes from 'prop-types';

const MasterFilter = ({onFiltersApply, additionalFilters =[], disabled}) => {
  
    const debugFilters=['is_debug_mode','employment_type']
  return (
    <Filter
     onFiltersApply={onFiltersApply}
     additionalFilters={additionalFilters}
     disabled={disabled}
     debugFilters={debugFilters}
    />
  )
};

MasterFilter.propTypes = {
  onFiltersApply: PropTypes.func.isRequired,
  additionalFilters: PropTypes.array,
  disabled: PropTypes.bool,
};

export { MasterFilter };

