import { name as packageName } from '../../../../package.json';

// App name sourced from package.json (e.g. "salarymitra" -> "Salarymitra").
const APP_NAME = packageName
  ? packageName.charAt(0).toUpperCase() + packageName.slice(1)
  : 'Workspace';

// Wizard steps, in order. Index is the source of truth for `step` state.
const STEPS = ['Plan', 'Company', 'Account', 'Review & Pay'];

// Per-step heading shown above the step body. Index-aligned with STEPS.
const STEP_HEADINGS = [
  { title: 'Choose your plan', subtitle: "Here's what each plan includes." },
  { title: 'Company details', subtitle: 'Name the workspace you are creating.' },
  { title: 'Admin account', subtitle: 'Create the account you will sign in with.' },
  { title: 'Review & pay', subtitle: 'Confirm the details and create your workspace.' }
];

// Branded sidebar copy — the value prop, supporting line and social proof.
// The heading renders as two lines: the lead in white, the accent in a gradient.
const SIDEBAR_COPY = {
  headingLead: 'Payroll & attendance,',
  headingAccent: 'beautifully simple.',
  subtitle: 'Set up your workspace in a few quick steps.',
  testimonialQuote: '“Cut our monthly payroll work from days to minutes.”',
  testimonialCaption: 'Trusted by growing teams across India'
};

const MIN_PASSWORD_LENGTH = 6;

// Blank form state — kept here so the hook can reset/initialise consistently.
// `state` (default state) drives PT/LWF statutory compliance and `employeeCount`
// (establishment headcount) drives PF/ESIC applicability — both optional here,
// admins can refine them later in company settings.
const INITIAL_COMPANY = { name: '', state: '', employeeCount: '' };
const INITIAL_ACCOUNT = {
  name: '',
  username: '',
  phone: '',
  password: '',
  confirmPassword: ''
};

export { APP_NAME, STEPS, STEP_HEADINGS, SIDEBAR_COPY, MIN_PASSWORD_LENGTH, INITIAL_COMPANY, INITIAL_ACCOUNT };
