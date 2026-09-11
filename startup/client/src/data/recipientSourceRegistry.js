// "Who gets it" options an app adds to notification rules.

let sources = [];

const registerRecipientSources = (list) => {
  sources = Array.isArray(list) ? list : [];
};

/** The registered sources, in the order the app listed them. */
const getRecipientSources = () => sources;

export { registerRecipientSources, getRecipientSources };
