// App Dashboard Routes
// Add custom application routes here that should be accessible from the admin dashboard
// Each route should have: { path: string, element: JSX.Element }

import { Doctor } from '@app/master/doctor/doctor';
import { PrescriptionMaster } from '@app/master/prescription/prescription';

const appRoutes = [
  { path: 'master/doctor', element: <Doctor /> },
  { path: 'master/prescription', element: <PrescriptionMaster /> }
];

export { appRoutes };

