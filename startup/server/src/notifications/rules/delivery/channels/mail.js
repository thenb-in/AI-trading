const { sendMail } = require('../../../../../interfaces/mailer/mailerInterface');
const { skipped, fromInterfaceResult } = require('../../../utils/deliveryUtils');

async function deliverMail({ rule, config, recipient }) {
  if (!recipient.email) {
    return skipped('no_email_address');
  }

  const result = await sendMail({
    to: recipient.email,
    subject: config.subject || rule.name,
    body: config.body
  });
  return fromInterfaceResult(result);
}

module.exports = { deliverMail };
