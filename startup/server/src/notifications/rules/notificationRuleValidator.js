const { body } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validationErrorsMiddleware');
const permissionService = require('../../services/permissionService');
const { RULE_CHANNEL, RULE_CHANNEL_LABEL } = require('../../constants/notificationRules');

// The company mode is a flag; the rest are lists. Either counts as an audience, and
// so does an app's own -- the rule's keys are read rather than a fixed list of modes.
const hasAudience = (recipients = {}) =>
  Object.values(recipients).some((value) =>
    (Array.isArray(value) ? value.length > 0 : Boolean(value)));

const enabledChannels = (channels = {}) =>
  Object.entries(channels)
    .filter(([, config]) => config?.enabled)
    .map(([channel]) => channel);


function ruleProblem(rule = {}) {
  if (!rule.name?.trim()) {
    return 'This rule has no name — pick the action it should fire on.';
  }

  if (!rule.only_the_subject && !hasAudience(rule.recipients)) {
    return `${rule.name} has nobody to notify — pick a role, a permission, a user or an address.`;
  }

  const channels = enabledChannels(rule.channels);
  if (!channels.length) {
    return `${rule.name} has no channel turned on — enable in-app, mail or WhatsApp.`;
  }

  if (
    channels.includes(RULE_CHANNEL.WHATSAPP)
    && !rule.channels[RULE_CHANNEL.WHATSAPP]?.template_name?.trim()
  ) {
    return `${rule.name} sends over WhatsApp, which needs the approved template name the provider will render.`;
  }

  const emptyBody = channels.find((channel) => (
    channel !== RULE_CHANNEL.WHATSAPP && !rule.channels[channel]?.body?.trim()
  ));
  if (emptyBody) {
    return `${rule.name} has no message written for its ${RULE_CHANNEL_LABEL[emptyBody]} channel.`;
  }

  return '';
}

const notificationRuleValidation = [
  body().custom((rule) => {
    const problem = ruleProblem(rule);
    if (problem) {
      throw new Error(problem);
    }
    return true;
  }),
  body('name').custom(async (name) => {
    if (!name?.trim()) {
      return true;
    }
    const permissions = await permissionService.getAllPermissions();
    if (!permissions.some((permission) => permission.name === name)) {
      throw new Error(`${name} is not a permission -- pick the rule name from the list rather than typing it.`);
    }
    return true;
  }),
  handleValidationErrors
];

module.exports = { notificationRuleValidation };
