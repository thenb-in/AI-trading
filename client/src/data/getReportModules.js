import {
    FileText,
    Clock,
    AlertTriangle,
    BarChart3,
    IndianRupee,
    UserX,
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
    title: 'Detailed Attendance Report',
    slug: 'detailed-attendance-report',
    desc: 'Comprehensive attendance information for all employees with detailed analytics',
    category: 'attendance',
    color: 'blue',
    icon: FileText,
    // component: DetailedAttendanceReport,
},
{
    id: 2,
    title: 'Check-in/Check-out Report',
    slug: 'checkin-checkout-report',
    desc: 'Daily check-in and check-out times with working hours analysis',
    category: 'attendance',
    color: 'yellow',
    icon: Clock,
    // component: CheckInOutReport,
},
{
    id: 3,
    title: 'Missing Check-ins Report',
    slug: 'missing-checkins-report',
    desc: 'Identify employees with missing check-ins or incomplete records',
    category: 'attendance',
    color: 'red',
    icon: AlertTriangle,
    // component: MissingCheckinsReport,
},
{
    id: 4,
    title: 'Transaction Report',
    slug: 'transaction-report',
    desc: 'Detailed transaction analysis based on punch periods and time intervals',
    category: 'finance',
    color: 'indigo',
    icon: BarChart3,
    // component: TransactionReport,
},
{
    id: 5,
    title: 'HR Salary Report',
    slug: 'salary-report',
    desc: 'Comprehensive salary information, payroll analysis and compensation details',
    category: 'finance',
    color: 'green',
    icon: IndianRupee,
    // component: HRSalaryReport,
},
{
    id: 6,
    title: 'Deactivation User Report',
    slug: 'deactivation-user-report',
    desc: 'User activity analysis for account deactivation and cleanup processes',
    category: 'administration',
    color: 'purple',
    icon: UserX,
    // component: DeactivationUserReport,
},
{
    id: 7,
    title: 'Shift Summary Report',
    slug: 'shift-summary-report',
    desc: 'Shift summary analysis for all employees',
    category: 'attendance',
    color: 'red',
    icon: Clock,
    // component: ShiftSummaryReport,
},
];

export const categories = [
{ id: 'all', name: 'All Reports' },
{ id: 'attendance', name: 'Attendance' },
{ id: 'finance', name: 'Finance' },
{ id: 'administration', name: 'Administration' },
];