const { formatDateToString, formatTime } = require('../../../utils/dateUtils');
const { VARIABLE_PATTERN } = require('../../../constants/notificationRules');


function readPath(source, path) {
  return path.split('.').reduce(
    (value, key) => (value === null || value === undefined ? undefined : value[key]),
    source
  );
}


function buildContext({ record, company } = {}) {
  const now = new Date();

  return {
    record: record || {},
    company: { name: company?.name || '' },
    date: formatDateToString(now),
    time: formatTime(now)
  };
}


function renderTemplate(template, context) {
  if (!template) {
    return '';
  }
  return String(template).replace(VARIABLE_PATTERN, (token, path) => {
    const value = readPath(context, path);
    if (value === undefined || value === null || value === '') {
      return token;
    }
    return String(value);
  });
}


function renderRule(rule, context) {
  const channels = rule.channels || {};
  return Object.entries(channels).reduce((rendered, [channel, config]) => {
    if (!config?.enabled) {
      return rendered;
    }
    rendered[channel] = {
      ...config,
      title: renderTemplate(config.title, context),
      header: renderTemplate(config.header, context),
      subject: renderTemplate(config.subject, context),
      body: renderTemplate(config.body, context)
    };
    return rendered;
  }, {});
}

/**
 * A message's {{variables}} as the values they resolve to, keyed by their own names.
 */
function renderNamedValues(template, context) {
  const tokens = String(template || '').match(VARIABLE_PATTERN) || [];
  return tokens.reduce((values, token) => {
    const path = token.replace(/[{}\s]/g, '');
    const name = path.split('.').pop();
    const value = readPath(context, path);
    values[name] = value === undefined || value === null || value === '' ? token : String(value);
    return values;
  }, {});
}

module.exports = { buildContext, renderRule, renderNamedValues };
