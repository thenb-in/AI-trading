const sources = new Map();

function registerRecipientSource(key, source) {
  if (typeof source?.resolve !== 'function') {
    throw new Error(`registerRecipientSource(${key}): resolve must be a function`);
  }
  sources.set(key, {
    key,
    label: source.label || key,
    valueLabels: source.valueLabels || {},
    resolve: source.resolve
  });
}

const getRecipientSource = (key) => sources.get(key) || null;

const getRecipientSourceKeys = () => [...sources.keys()];

module.exports = { registerRecipientSource, getRecipientSource, getRecipientSourceKeys };
