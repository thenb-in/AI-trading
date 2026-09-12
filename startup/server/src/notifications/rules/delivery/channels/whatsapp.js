const { sendWhatsappMessage } = require('../../../../../interfaces/whatsapp/whatsappInterface');
const { RULE_CHANNEL } = require('../../../../constants/notificationRules');
const { renderNamedValues } = require('../renderer');
const { skipped, fromInterfaceResult, messageOf } = require('../../../utils/deliveryUtils');

// The rule carries the approved template's name; the rendered message is its variables.
async function deliverWhatsapp({ rule, config, recipient, context }) {
  if (!recipient.phone) {
    return skipped('no_phone_number');
  }
  if (!config.template_name) {
    return skipped('no_template_name');
  }

  // The raw template, not the rendered one: named values need the {{tokens}} to read.
  const raw = rule.channels?.[RULE_CHANNEL.WHATSAPP] || {};
  const result = await sendWhatsappMessage({
    phone: recipient.phone,
    templateName: config.template_name,
    header: renderNamedValues(raw.header, context),
    body: renderNamedValues(raw.body, context),
    text: messageOf(config)
  });
  return fromInterfaceResult(result);
}

module.exports = { deliverWhatsapp };
