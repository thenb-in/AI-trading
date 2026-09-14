/** A master's name as its permissions spell it: "Cost Center" is cost_center (create_cost_center). */
const masterKeyOf = (masterName) => masterName.toLowerCase().replace(/ /g, '_');

export { masterKeyOf };
