# BaseReport - Generic Report Components

This directory contains generic, reusable report components that can be used across different report types. These components are designed to be application-agnostic and provide standard report functionality.

## Structure

```
BaseReport/
├── BaseReport.jsx          # Main report component
├── ReportHeader.jsx        # Navigation header component
├── ReportTitleSection.jsx  # Title, description, and export button
├── ReportFilters.jsx       # Filter component wrapper
├── ReportUtils.js          # Utility functions for data processing
├── LoadingBarReport.jsx    # Loading overlay component
├── reportFormatter.js      # Data formatting utilities
├── reportExport/           # Excel export functionality
│   ├── index.js
│   ├── excelRenderer.js
│   └── formattingUtils.js
└── index.js                # Main exports
```

## Usage

### Basic Usage

```jsx
import { BaseReport } from '@components/startup/BaseReport';
import { ApiService } from '@services/startup/ApiService';

const MyReport = ({ report, locationState }) => {
  // Create a report API service adapter
  const reportApi = {
    async getReportData(slug, filters) {
      const response = await ApiService.request('GET', `/reports/${slug}`, null, { 
        params: filters 
      });
      // Response should have format: { data: { columns: [], data: [], status_definitions: {} } }
      return response;
    }
  };

  return (
    <BaseReport
      report={report}
      locationState={locationState}
      reportApi={reportApi}
    />
  );
};
```

### With Additional Filters

```jsx
const MyReport = ({ report, locationState }) => {
  const reportApi = { /* ... */ };
  
  const additionalFilters = [
    { 
      name: 'status', 
      label: 'Status', 
      type: 'select', 
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ],
      is_standard: false,
      order: 10
    }
  ];

  return (
    <BaseReport
      report={report}
      locationState={locationState}
      reportApi={reportApi}
      additionalFilters={additionalFilters}
    />
  );
};
```

### With Custom Components

```jsx
const CustomTitleSection = ({ report, rows, columns }) => {
  return (
    <div>
      <h1>{report.title}</h1>
      {/* Your custom title section */}
    </div>
  );
};

const MyReport = ({ report, locationState }) => {
  const reportApi = { /* ... */ };

  return (
    <BaseReport
      report={report}
      locationState={locationState}
      reportApi={reportApi}
      customTitleSection={CustomTitleSection}
    />
  );
};
```

## Components

### BaseReport

Main component that orchestrates all report functionality.

**Props:**
- `report` (required): Report configuration object with `title`, `desc`, `color`, `slug`, etc.
- `locationState` (optional): State passed from navigation containing `reportData`, `columns`, `filters`, etc.
- `additionalFilters` (optional): Array of additional filter configurations
- `reportApi` (optional): API service object with `getReportData(slug, filters)` method
- `onReportDataChange` (optional): Callback function called when report data changes
- `customTitleSection` (optional): Custom title section component
- `customHeader` (optional): Custom header component

### ReportHeader

Navigation header with back button and optional past report link.

**Props:**
- `isFiltering` (required): Boolean indicating if filters are being applied
- `showPastReport` (optional): Boolean to show/hide past report button (default: true)
- `backPath` (optional): Path for back button (default: "/admin/report")

### ReportTitleSection

Displays report title, description, last updated time, and export button.

**Props:**
- `report` (required): Report configuration object
- `rows` (required): Array of data rows
- `columns` (required): Array of column definitions
- `showExport` (optional): Boolean to show/hide export button (default: true)
- `customExportHandler` (optional): Custom export handler function

### ReportFilter

Wrapper around the Filter component with standard date filters.

**Props:**
- `onFiltersApply` (required): Callback when filters are applied
- `initialFilters` (required): Initial filter values
- `additionalFilters` (optional): Additional filter configurations
- `disabled` (optional): Boolean to disable filter inputs

## API Service Interface

Your report API service must implement the following interface:

```javascript
{
  async getReportData(slug, filters) {
    // Returns a response with format:
    // {
    //   data: {
    //     columns: [{ key, display_name, type, hidden }],
    //     data: [{ ...row data... }],
    //     status_definitions: { ... } // optional
    //   }
    // }
  }
}
```

## Data Format

### Columns Format
```javascript
[
  {
    key: 'user_id',
    display_name: 'User ID',
    type: 'number',
    hidden: false
  },
  {
    key: 'user_name',
    display_name: 'User Name',
    type: 'string',
    hidden: false
  }
]
```

### Data Format
```javascript
[
  {
    user_id: 1,
    user_name: 'John Doe',
    // ... other fields
  }
]
```

## Examples

See `client/src/components/Reports/userReport/UserReport.jsx` for a complete example implementation.

