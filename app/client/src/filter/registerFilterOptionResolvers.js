import { registerFilterOptionResolver } from '@startup/components/base_filter/filter/filterOptionResolverRegistry';
import { isWeeklyEmpType } from '@app/components/masters/employee_master/constants/emp_field_constants';
import { positionsInDepartment } from '@app/utils/positionsInDepartment';

/** Debug off → hide weekly employees in the employee filter dropdown. */
const resolveWeeklyEmployeesByDebugMode = (config, { debugMode }) => {
  if (debugMode || config.name !== 'employee') return config;
  if (!Array.isArray(config.options)) return config;
  if (!config.options.some((o) => o.emp_type != null && o.emp_type !== '')) return config;

  return {
    ...config,
    options: config.options.filter(
      (o) => o.value === 'all' || !isWeeklyEmpType(o.emp_type)
    ),
  };
};

/** A department picked in the panel → the position filter offers only its positions. */
const resolvePositionsByDepartment = (config, { filters }) => {
  if (config.name !== 'position' || !Array.isArray(config.options)) return config;

  return {
    ...config,
    options: positionsInDepartment(config.options, filters.department, filters.position),
  };
};

registerFilterOptionResolver(resolveWeeklyEmployeesByDebugMode);
registerFilterOptionResolver(resolvePositionsByDepartment);
