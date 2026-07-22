// import { registerFilterOptionResolver } from "@startup/components/base_filter/filter/filterOptionResolverRegistry";

/**
 * Register this app's filter option resolvers into the startup filter registry.
 * Resolvers run after startup's built-in transforms (is_active) and receive
 * (config, { filters, debugMode }); each returns a possibly-transformed config.
 *
 * No app-specific resolvers yet — add registerFilterOptionResolver(fn) calls
 * here as filter rules are built out.
 */
function registerFilterOptionResolvers() {
  // e.g. registerFilterOptionResolver((config, { filters, debugMode }) => config);
}

export { registerFilterOptionResolvers };
