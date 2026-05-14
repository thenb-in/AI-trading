import { FileText } from 'lucide-react';

import { UserReport } from '../components/report/reports/user_report/UserReport';

  const reports = [
  {
    id: 'user_report',
    title: 'User Report',
    slug: 'user-report',
    desc: 'User details report',
    category: 'user-details',
    color: 'blue',
    icon: FileText,
    component: UserReport,
  }
  ];
  
const categories = [
  { id: 'all', name: 'All Reports' },
  { id: 'user-details', name: 'User Details' },
  { id: 'other', name: 'Other' },
];


export {
  reports,
  categories,
};
