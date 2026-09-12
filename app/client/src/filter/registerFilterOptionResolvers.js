// eslint-disable-next-line no-unused-vars
import { registerFilterOptionResolver } from '@startup/components/base_filter/filter/filterOptionResolverRegistry';

/**
 * Last-minute adjustments to a filter's options, applied by the framework every
 * time a filter panel renders. A resolver takes (config, context) and returns a
 * config — narrowing `options`, or returning it untouched when it does not
 * apply. Called by registerAppData() at boot.
 *
 * Empty in the reference scaffold — apps register their own, e.g.
 *
 *   const resolvePositionsByDepartment = (config, { filters }) => {
 *     if (config.name !== 'position' || !Array.isArray(config.options)) return config;
 *     return { ...config, options: narrowedFor(filters.department) };
 *   };
 *
 *   registerFilterOptionResolver(resolvePositionsByDepartment);
 */
const registerFilterOptionResolvers = () => {
};

export { registerFilterOptionResolvers };
