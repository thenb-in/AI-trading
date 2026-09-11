/**
 * A scope holds back some of the company's data from the login reading it.
 * What it holds back is the app's business — departments, positions, branches,
 * whatever that app is built on — so the framework knows one thing about a
 * scope and no more: whether anything is being held back at all.
 *
 * This is what a scope looks like when nothing is: no resolver registered, no
 * request behind the call, or a login the app decided to hold nothing from.
 */
const UNRESTRICTED = Object.freeze({ unrestricted: true });

module.exports = { UNRESTRICTED };
