const { MIN_PASSWORD_LENGTH } = require('../constants/onboarding/onboarding.constants');

const normalizeUsername = (value) => value?.trim().toLowerCase();


const validateOnboardInput = ({ subscriptionId, company: companyInput, user: userInput, payment }) => {
  const companyName = companyInput?.name?.trim();
  const username = normalizeUsername(userInput?.username);
  const password = userInput?.password;
  const defaultState = companyInput?.state?.trim() || null;

  let establishmentCount = null;
  const employeeCount = companyInput?.employeeCount;
  if (employeeCount !== null && employeeCount !== undefined && employeeCount !== '') {
    const parsed = Number(employeeCount);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw { status: 400, message: `Team size must be a whole number got : ${employeeCount}` };
    }
    establishmentCount = parsed;
  }

  if (!subscriptionId) {
    throw { status: 400, message: 'Please choose a plan' };
  }
  if (!companyName) {
    throw { status: 400, message: `Company name is required got ${companyName}` };
  }
  if (!username) {
    throw { status: 400, message: 'Username is required' };
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw { status: 400, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  const orderId = payment?.razorpay_order_id;
  const paymentId = payment?.razorpay_payment_id;
  const signature = payment?.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    throw { status: 400, message: `Payment details are missing for orderid: ${orderId}` };
  }

  return {
    subscriptionId,
    companyName,
    username,
    password,
    defaultState,
    establishmentCount,
    phone: userInput?.phone?.trim() || null,
    name: userInput?.name?.trim() || username,
    payment: { orderId, paymentId, signature }
  };
};

module.exports = { validateOnboardInput, normalizeUsername };
