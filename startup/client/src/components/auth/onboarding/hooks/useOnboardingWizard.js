import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-toastify';
import { ApiService } from '@services/ApiService';
import { cleanFormData } from '@utils/authformvalidation';
import {
  APP_NAME,
  STEPS,
  MIN_PASSWORD_LENGTH,
  INITIAL_COMPANY,
  INITIAL_ACCOUNT
} from '../constants';
import { useAvailabilityCheck } from '@startup/hooks/useAvailabilityCheck';
import { sanitize, loadRazorpayCheckout } from '../utils';
import { buildPlanFeatures } from '../planFeatures';

const LAST_STEP = STEPS.length - 1;

/**
 * All onboarding-wizard state and behaviour: plan loading, step navigation,
 * per-step validation and the Razorpay pay/onboard submit. The wizard component
 * stays presentational — it just renders what this hook returns.
 */
function useOnboardingWizard() {
  const [step, setStep] = useState(0);

  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  const [company, setCompany] = useState(INITIAL_COMPANY);
  const [account, setAccount] = useState(INITIAL_ACCOUNT);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [orderId, setOrderId] = useState(null);
  const [provisioning, setProvisioning] = useState(false);
  const [done, setDone] = useState(null);

  const [failure, setFailure] = useState(null);

  useEffect(() => {
    if (!provisioning) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [provisioning]);

  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        const response = await ApiService.getPublicPlans();
        // The server returns raw subscribed permissions per plan; turn them
        // into the navigator-grouped feature list here (planFeatures).
        const loaded = (response.data?.data?.plans || []).map((plan) => ({
          ...plan,
          features: buildPlanFeatures(plan.permissions)
        }));
        if (!active) return;
        setPlans(loaded);
        // Auto-select when there's only one plan to choose from.
        if (loaded.length === 1) setSelectedPlanId(loaded[0].id);
      } catch {
        if (active) toast.error('Could not load plans. Please refresh and try again.');
      } finally {
        if (active) setPlansLoading(false);
      }
    };
    loadPlans();
    return () => {
      active = false;
    };
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || null,
    [plans, selectedPlanId]
  );

  // Live, debounced "is it free?" checks so a taken company name / username is
  // caught while typing — before payment, not after the paid onboard() call.
  const companyAvailability = useAvailabilityCheck('company', company.name);
  const usernameAvailability = useAvailabilityCheck('username', account.username);

  const handleCompanyChange = useCallback(
    (e) => setCompany((prev) => ({ ...prev, [e.target.name]: sanitize(e.target.value) })),
    []
  );
  // Non-event fields (e.g. the state dropdown) set a value by name directly.
  const setCompanyField = useCallback(
    (name, value) => setCompany((prev) => ({ ...prev, [name]: value })),
    []
  );
  const handleAccountChange = useCallback(
    (e) => setAccount((prev) => ({ ...prev, [e.target.name]: sanitize(e.target.value) })),
    []
  );

  const validateStep = useCallback(() => {
    if (step === 0 && !selectedPlanId) return 'Please choose a plan to continue.';
    if (step === 1) {
      if (!company.name.trim()) return 'Please enter your company name.';
      if (companyAvailability.status === 'taken') {
        return 'That company name is already taken. Please choose another.';
      }
    }
    if (step === 2) {
      if (!account.name.trim()) return 'Please enter your name.';
      if (!account.username.trim()) return 'Please choose a username.';
      if (usernameAvailability.status === 'taken') {
        return 'That username is already taken. Please choose another.';
      }
      if (!account.password || account.password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      }
      if (account.password !== account.confirmPassword) return 'Passwords do not match.';
    }
    return '';
  }, [step, selectedPlanId, company, account, companyAvailability.status, usernameAvailability.status]);

  const next = useCallback(() => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((current) => Math.min(current + 1, LAST_STEP));
  }, [validateStep]);

  const back = useCallback(() => {
    setError('');
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  // Dismiss the post-payment failure screen and return the user to the wizard
  // (on the Review step) so they can retry. Form data is preserved.
  const dismissFailure = useCallback(() => {
    setFailure(null);
    setError('');
  }, []);

  // Provision the workspace once Razorpay confirms a successful payment. The
  // server re-verifies the signature, so a tampered response is rejected there.
  const completeOnboarding = useCallback(
    async (paymentResponse) => {
      // Payment succeeded — enter the blocking provisioning window.
      setProvisioning(true);
      try {
        const cleaned = cleanFormData(account);
        const payload = {
          subscriptionId: selectedPlanId,
          company: {
            name: company.name.trim(),
            state: company.state || null,
            employeeCount: company.employeeCount ? Number(company.employeeCount) : null
          },
          user: {
            name: cleaned.name,
            username: cleaned.username,
            phone: cleaned.phone || null,
            password: cleaned.password
          },
          payment: {
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature
          }
        };
        const response = await ApiService.onboard(payload);
        setDone(response.data?.data);
        toast.success('Payment successful — your workspace is ready!');
      } catch (err) {
        const message =
          err?.error || err?.message || 'Payment went through but setup failed. Please contact support.';
        // Payment was captured — show the dedicated result screen (with the order
        // id straight from Razorpay's response, not the possibly-stale state).
        setFailure({ message, orderId: paymentResponse?.razorpay_order_id || null });
      } finally {
        setProvisioning(false);
        setSubmitting(false);
      }
    },
    [account, selectedPlanId, company]
  );

  // Create a Razorpay order, open the checkout modal, and onboard on success.
  const pay = useCallback(async () => {
    setError('');
    setSubmitting(true);

    let order;
    try {
      const orderRes = await ApiService.createPaymentOrder(selectedPlanId, Number(company.employeeCount) || 0);
      order = orderRes.data?.data;
      setOrderId(order?.orderId || null);
      const ready = await loadRazorpayCheckout();
      if (!ready) throw new Error('Could not load the payment gateway. Check your connection.');
    } catch (err) {
      const message = err?.error || err?.message || 'Could not start payment. Please try again.';
      setError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: APP_NAME,
      description: `${order.planName} plan`,
      order_id: order.orderId,
      prefill: { name: account.name, contact: account.phone || '' },
      theme: { color: '#2563eb' },
      handler: completeOnboarding,
      modal: {
        ondismiss: () => {
          setSubmitting(false);
          toast.info('Payment cancelled. You can try again when ready.');
        }
      }
    });
    rzp.on('payment.failed', (resp) => {
      const message = resp?.error?.description || 'Payment failed. Please try again.';
      setError(message);
      toast.error(message);
      setSubmitting(false);
    });
    rzp.open();
  }, [account, selectedPlanId, completeOnboarding]);

  return {
    // step nav
    step,
    isFirstStep: step === 0,
    isLastStep: step === LAST_STEP,
    next,
    back,
    // plans
    plans,
    plansLoading,
    selectedPlanId,
    selectPlan: setSelectedPlanId,
    selectedPlan,
    // forms
    company,
    account,
    companyAvailability,
    usernameAvailability,
    handleCompanyChange,
    setCompanyField,
    handleAccountChange,
    // submit / status
    error,
    submitting,
    provisioning,
    orderId,
    done,
    failure,
    dismissFailure,
    pay
  };
}

export { useOnboardingWizard };
