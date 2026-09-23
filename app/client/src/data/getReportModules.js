// App report definitions, handed to the framework by registerAppData() via
// registerAppReports(reports, categories).
//
// Each entry looks like:
//
//   {
//     id: 'my-report',
//     title: 'My Report',
//     slug: 'my-report',              // must match the server route in reportRoutes.js
//     permissionName: 'read_my-report',
//     desc: 'What the report answers',
//     category: 'attendance',         // one of the ids in `categories` below
//     color: 'blue',
//     icon: SomeLucideIcon,
//     component: MyReport,
//     filtersConfig: MyReportFilters,
//   }
//

const reports = [];


/**
 * A report without a `component` is a ConfiguredReport: the standard filters plus
 * its own `filters`, shown in BaseReport's grid with its `reportProps`.
 * `includeToday: false` opens the date range on yesterday; `omitFilters` drops
 * standard filters the report does without.
 */
const reports = [
  {
    id: 'user_report',
    title: 'User Report',
    desc: 'User details report',
    category: 'user-details',
    color: 'blue',
    icon: FileText,
    includeToday: false,
  },
  {
    id: 'stock_balance_report',
    title: 'Stock Balance Report',
    desc: 'Current stock balance by item and warehouse',
    category: 'inventory',
    color: 'emerald',
    icon: Package,
    filters: STOCK_GROUP_FILTERS,
    reportProps: { showTotalRow: true, documentName: 'Stock Balance Report' },
  },
  {
    id: 'customer_stock_position_report',
    title: 'Customer Stock Position Report',
    desc: 'Stock by customer and warehouse, with optional sales order and sales invoice quantities for the period',
    category: 'inventory',
    color: 'emerald',
    icon: Package,
    filters: [
      checkboxReportFilter({ name: 'include_sales_order_qty', label: 'Include Sales Order Qty', order: 10 }),
      checkboxReportFilter({ name: 'include_sales_invoice_qty', label: 'Include Sales Invoice Qty', order: 11 }),
    ],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'production_report',
    title: 'Production Report',
    desc: 'Work order items: planned, manufactured, and remaining quantity by item and warehouse',
    category: 'manufacturing',
    color: 'amber',
    icon: ClipboardList,
  },
  {
    id: 'purchase_report',
    title: 'Purchase Report',
    desc: 'Purchase invoice items: date, invoice number, item, quantity, warehouse, and supplier',
    category: 'inventory',
    color: 'teal',
    icon: ShoppingCart,
    filters: [supplierReportFilter({ order: 5 })],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'kuber_purchase_report',
    title: 'Kuber Purchase Report',
    desc: 'Purchase invoice items: date, invoice number, item, quantity, warehouse, supplier, and remark',
    category: 'inventory',
    color: 'teal',
    icon: ShoppingCart,
    filters: [supplierReportFilter({ order: 5 })],
  },
  {
    id: 'material_issue_report',
    title: 'Material Issue Report',
    desc: 'Material issue line items: issue date, number, status, requirement, item, issued quantity, warehouse, and person. Tick Cost Centre Wise to total by cost centre',
    category: 'inventory',
    color: 'orange',
    icon: PackageOpen,
    filters: [
      // Sits next to the standard Item select: narrows the report to the items
      // belonging to one group (and to everything under it, if it has children).
      itemGroupReportFilter({ order: 5 }),
      // The server falls back to approved when no status reaches it, so picking
      // "All Statuses" has to travel as 'all' rather than being dropped as the
      // filter's own default — otherwise the pick silently changes nothing.
      workflowStatusFilter({ workflow: MATERIAL_ISSUE_WORKFLOW, default: 'approved', alwaysInclude: true, order: 6 }),
      personReportFilter({ order: 7 }),
      costCenterReportFilter({ order: 8 }),
      // Collapses the line rows into one row per cost centre. Every other filter
      // still applies first, so this summarises whatever the detail view shows.
      checkboxReportFilter({ name: 'cost_center_wise', label: 'Cost Centre Wise', order: 9 }),
    ],
    reportProps: {
      showTotalRow: true,
      documentName: 'Material Issue Report',
      // Issue no./status/requirement/cost centre often hold the same value on
      // every row, but they still belong in the table (and in the export) —
      // don't let them get promoted into the insights header.
      hideConstantColumns: false,
      showInsightsAsHeader: true,
    },
    print: { documentType: 'materialIssueReport', title: 'Print Material Issue Report' },
  },
  {
    id: 'sales_dashboard',
    title: 'Sales Dashboard',
    desc: 'Sales, GST and dispatch overview: total sales, invoices, GST composition (CGST/SGST/IGST), slab-wise sales, top customers/items, monthly trend and dispatch fulfilment',
    category: 'manufacturing',
    color: 'blue',
    icon: LayoutDashboard,
    component: SalesDashboard,
  },
  {
    id: 'otif_report',
    title: 'OTIF Report',
    desc: 'On-Time-In-Full delivery performance per sales order: expected vs actual dispatch, delay days, ordered vs dispatched qty, and On-Time / In-Full / OTIF flags',
    category: 'manufacturing',
    color: 'emerald',
    icon: Truck,
    filters: [customerReportFilter({ order: 5 })],
  },
  {
    id: 'overdue_order_book_report',
    title: 'Overdue Order Book',
    desc: 'Approved sales orders past their expected delivery date and not yet fully dispatched: days overdue, pending qty and pending value, worst first',
    category: 'manufacturing',
    color: 'red',
    icon: AlertTriangle,
    filters: [customerReportFilter({ order: 5 })],
  },
  {
    id: 'broker_report',
    title: 'Broker Report',
    desc: 'Sales orders by broker: one row per order line with item qty and rate, the dispatches and invoices raised against it, amount and settled money. Group by broker for totals, or show only orders with goods or payment still pending',
    category: 'manufacturing',
    color: 'amber',
    icon: ClipboardList,
    filters: [
      brokerReportFilter({ order: 5 }),
      customerReportFilter({ order: 6 }),
      workflowStatusFilter({ workflow: SALES_ORDER_WORKFLOW, label: 'SO Status', order: 7 }),
      // Adds per-broker totals.
      checkboxReportFilter({ name: 'group_by_broker', label: 'Group by broker', order: 8 }),
      // Keeps orders where either the goods or the money are still pending.
      checkboxReportFilter({ name: 'outstanding_only', label: 'Outstanding only', order: 9 }),
    ],
  },
  {
    id: 'sales_order_report',
    title: 'Sales Order Report',
    desc: 'Sales order line items by order date: SO number, status, expected delivery, customer, item, qty, rate, amount and SO total. Optionally show delivery region (state/city)',
    category: 'manufacturing',
    color: 'violet',
    icon: ClipboardList,
    filters: [
      customerReportFilter({ order: 5 }),
      workflowStatusFilter({ workflow: SALES_ORDER_WORKFLOW, order: 6 }),
      checkboxReportFilter({ name: 'include_region', label: 'Show delivery region', order: 7 }),
    ],
  },
  {
    id: 'sales_report',
    title: 'Sales Report',
    desc: 'Sales order items by order date: SO qty, dispatched, balance, manufactured, production balance',
    category: 'manufacturing',
    color: 'violet',
    icon: Receipt,
    filters: [customerReportFilter({ order: 5 })],
  },
  {
    id: 'custom_kuber_report',
    title: 'Custom Kuber Report',
    desc: 'Sales order items by order date: SO qty, dispatched, balance, manufactured, production balance',
    category: 'manufacturing',
    color: 'violet',
    icon: Receipt,
    filters: [customerReportFilter({ order: 5 })],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'kuber_customer_item_report',
    title: 'Kuber Customer Item Report',
    desc: 'Summary by unique customer and item: SO qty, manufactured, WIP, dispatch done and pending',
    category: 'manufacturing',
    color: 'violet',
    icon: Receipt,
    component: KuberCustomerItemReport,
  },
  {
    id: 'kuber_summary_report',
    title: 'Kuber Summary Report',
    desc: 'Summary by unique customer and item: RFD and WIP',
    category: 'manufacturing',
    color: 'violet',
    icon: Receipt,
    filters: [customerReportFilter({ order: 5 })],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'kuber_stock_summary_report',
    title: 'Kuber Stock Summary Report',
    desc: 'Customer and item summary from stock balance: RFD (FG), WIP, with optional schedule and dispatch',
    category: 'manufacturing',
    color: 'violet',
    icon: Receipt,
    filters: [
      checkboxReportFilter({ name: 'include_sales_order_qty', label: 'Include Schedule (Sales Order Qty)', order: 10 }),
      checkboxReportFilter({ name: 'include_sales_invoice_qty', label: 'Include Dispatch Done (Sales Invoice Qty)', order: 11 }),
      checkboxReportFilter({ name: 'sales_invoice_all_time', label: 'Dispatch Done: whole history (untick for selected period)', order: 12 }),
      checkboxReportFilter({ name: 'include_wip', label: 'Include WIP', default: true, order: 13 }),
    ],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'machine_ongoing_report',
    title: 'Machine Ongoing Report',
    desc: 'Ongoing work orders per machine: planned, manufactured and remaining quantities by item',
    category: 'manufacturing',
    color: 'amber',
    icon: ClipboardList,
  },
  {
    id: 'mother_coil_tracking_report',
    title: 'Mother Coil Tracking Report',
    desc: 'Serial flow matrix from approved PR/PI to approved WO conversion rows and approved sales invoices',
    category: 'manufacturing',
    color: 'blue',
    icon: Factory,
    filters: [
      {
        name: 'serial_number',
        label: 'Mother Coil Serial',
        type: 'text',
        is_standard: false,
        default: '',
        placeholder: 'Exact serial (optional)',
        order: 5,
      },
    ],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'monthly_fg_rm_data_report',
    title: 'Monthly FG and RM Data',
    desc: 'Work order movement totalled per item: finished goods into FG, raw material out of Store, scrap and rejection into their own warehouses',
    category: 'inventory',
    color: 'green',
    icon: PackageOpen,
    component: MonthlyFgRmDataReport,
  },
  {
    id: 'stock_ledger_report',
    title: 'Stock Ledger Report',
    desc: 'Stock ledger report with item, warehouse, and date filters',
    category: 'inventory',
    color: 'amber',
    icon: ClipboardList,
  },
  {
    id: 'stock_aging_report',
    title: 'Stock Aging Report',
    desc: 'Stock aging buckets by item, warehouse, and UOM',
    category: 'inventory',
    color: 'amber',
    icon: ClipboardList,
    filters: STOCK_GROUP_FILTERS,
    reportProps: { showTotalRow: true },
  },
  {
    id: 'fg_stock_aging_report',
    title: 'FG Stock Ageing Report',
    desc: 'Finished-goods produced via WO transactions, not yet dispatched, bucketed by age and grouped by customer + item',
    category: 'inventory',
    color: 'amber',
    icon: Package,
    component: FGStockAgingReport,
  },
  {
    id: 'sales_funnel_report',
    title: 'Sales Funnel Report',
    desc: 'Quotations with conversion outcome: sales orders created or marked as lost',
    category: 'manufacturing',
    color: 'violet',
    icon: Receipt,
    filters: [
      customerReportFilter({ order: 5 }),
      {
        name: 'funnel_status',
        label: 'Stage',
        type: 'select',
        is_standard: false,
        options: [
          { value: 'all', label: 'All Stages' },
          { value: 'Open', label: 'Open' },
          { value: 'Pending Conversion', label: 'Pending Conversion' },
          { value: 'Converted', label: 'Converted' },
          { value: 'Lost', label: 'Lost' },
          { value: 'Cancelled', label: 'Cancelled' },
        ],
        default: 'all',
        placeholder: 'Select Stage',
        order: 6,
      },
    ],
  },
  {
    id: 'manufacturing_pipeline_report',
    title: 'Manufacturing Pipeline Report',
    desc: 'Per work-order transaction in a date range: each item line with production qty, raw material consumed and scrap generated (cancelled transactions excluded)',
    category: 'manufacturing',
    color: 'blue',
    icon: Factory,
    // Its own date range and a customer filter, without the standard item/warehouse selects.
    omitFilters: ['item', 'warehouse'],
    filters: [customerReportFilter({ order: 3 })],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'scrap_report',
    title: 'Scrap Report',
    desc: 'Scrap generated per work-order transaction: when, work order, transaction, customer, item, qty and activity notes',
    category: 'manufacturing',
    color: 'red',
    icon: Trash2,
    filters: [customerReportFilter({ order: 5 })],
    reportProps: { showTotalRow: true },
  },
  {
    id: 'purchase_pipeline_report',
    title: 'Purchase Pipeline Report',
    desc: 'Full purchase trail per item: requirement → indent → PO → invoice with qty, rate, status, supplier and pending qty',
    category: 'inventory',
    color: 'teal',
    icon: ShoppingCart,
    filters: [
      supplierReportFilter({ order: 5 }),
      workflowStatusFilter({ workflow: PURCHASE_ORDER_WORKFLOW, label: 'PO Status', order: 6 }),
    ],
    reportProps: { documentName: 'purchase-pipeline-report' },
  },
  {
    id: 'indent_report',
    title: 'Indent Report',
    desc: 'Full indent trail per item: requirement → indent → PO → receipt/invoice with cost centre, created-by user, qty, status and pending qty',
    category: 'inventory',
    color: 'teal',
    icon: ClipboardList,
    filters: [
      workflowStatusFilter({ workflow: APPROVAL_WORKFLOW, label: 'Indent Status', order: 5 }),
      costCenterReportFilter({ name: 'cost_center', order: 6 }),
    ],
    reportProps: { documentName: 'indent-report' },
  },
  {
    id: 'dispatch_report',
    title: 'Dispatch Report',
    desc: 'Goods dispatched per sales invoice: date, customer, item, qty, UOM, rate, transporter and vehicle details',
    category: 'inventory',
    color: 'violet',
    icon: Receipt,
    filters: [
      customerReportFilter({ order: 5 }),
      workflowStatusFilter({ workflow: SALES_INVOICE_WORKFLOW, label: 'Invoice Status', order: 6 }),
      // Adds Delivery State/City columns to the report (off by default).
      checkboxReportFilter({ name: 'include_region', label: 'Show delivery region', order: 7 }),
    ],
  },
  {
    id: 'item_wise_purchase_history_report',
    title: 'Item Wise Purchase History',
    desc: 'Purchase order history for one item: PO number, posting date, qty, UOM, rate, amount, supplier, received qty',
    category: 'inventory',
    color: 'teal',
    icon: ShoppingCart,
    reportProps: { documentName: 'item-wise-purchase-history-report' },
  },
].map((report) => ({ component: ConfiguredReport, ...report }));

export {
  reports,
  categories,
};
