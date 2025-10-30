import {
    FileText,
    Clock,
    AlertTriangle,
    BarChart3
  } from 'lucide-react';
  
// import DetailedAttendance from '../components/report/reports/detailed-attendance/DetailedAttendanceReport';
// import CheckInOut from '../components/report/reports/check-in-out/CheckInOutReport';
// import MissingCheckins from '../components/report/reports/missing-checkins/MissingCheckinsReport';
// import Transaction from '../components/report/reports/transaction/TransactionReport';
// import HRSalary from '../components/report/reports/hr-salary/HrSalaryReport';
// import DeactivationUser from '../components/report/reports/deactivation-user/DeactivationUserReport';
// import ShiftSummary from '../components/report/reports/shift-summary/ShiftSummaryReport';

export const reports = [
    {
        id: 1,
        title: 'Sample Report 1',
        slug: 'sample-report-1',
        desc: 'Sample report 1 description',
        category: 'sample',
        color: 'blue',
        icon: FileText,
        // component: SampleReport1,
    },
    {
        id: 2,
        title: 'Sample Report 2',
        slug: 'sample-report-2',
        desc: 'Sample report 2 description',
        category: 'sample',
        color: 'yellow',
        icon: Clock,
        // component: SampleReport2,
    },
    {
        id: 3,
        title: 'Sample Report 3',
        slug: 'sample-report-3',
        desc: 'Sample report 3 description',
        category: 'sample',
        color: 'red',
        icon: AlertTriangle,
        // component: SampleReport3,
    },
    {
        id: 4,
        title: 'Sample Report 4',
        slug: 'sample-report-4',
        desc: 'Sample report 4 description',
        category: 'other-sample',
        color: 'indigo',
        icon: BarChart3,
        // component: SampleReport4,
    },
];

export const categories = [
{ id: 'all', name: 'All Reports' },
{ id: 'sample', name: 'Sample' },
{ id: 'other-sample', name: 'Other Sample' },
];