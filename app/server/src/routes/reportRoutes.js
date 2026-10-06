const express = require('express');
const { REPORT_PERMISSION_CONSTANTS } = require('../constants/permissions');
const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');
const { getCustomKuberReportView } = require('../views/reports/customKuberReport.view');
const { getDispatchReportView } = require('../views/reports/dispatchReport.view');
const { getFGStockAgingReportView } = require('../views/reports/fgStockAgingReport.view');
const { getIndentReportView } = require('../views/reports/indentReport.view');
const { getItemWisePurchaseHistoryReportView } = require('../views/reports/itemWisePurchaseHistoryReport.view');
const { getKuberCustomerItemReportView } = require('../views/reports/kuberCustomerItemReport.view');
const { getKuberStockSummaryReportView } = require('../views/reports/kuberStockSummaryReport.view');
const { getKuberSummaryReportView } = require('../views/reports/kuberSummaryReport.view');
const { getMachineOngoingReportView } = require('../views/reports/machineOngoingReport.view');
const { getMonthlyFgRmDataReportView } = require('../views/reports/monthlyFgRmDataReport.view');
const { getMotherCoilTrackingReportView } = require('../views/reports/motherCoilTrackingReport.view');
const { getManufacturingPipelineReportView } = require('../views/reports/manufacturingPipelineReport.view');
const { getProductionReportView } = require('../views/reports/productionReport.view');
const { getMaterialIssueReportView, printMaterialIssueReportView } = require('../views/reports/materialIssueReport.view');
const { getPurchasePipelineReportView } = require('../views/reports/purchasePipelineReport.view');
const { getPurchaseReportView } = require('../views/reports/purchaseReport.view');
const { getKuberPurchaseReportView } = require('../views/reports/kuberPurchaseReport.view');
const { getSalesFunnelReportView } = require('../views/reports/salesFunnelReport.view');
const { getSalesReportView } = require('../views/reports/salesReport.view');
const { getSalesOrderReportView } = require('../views/reports/salesOrderReport.view');
const { getOtifReportView } = require('../views/reports/otifReport.view');
const { getOverdueOrderBookReportView } = require('../views/reports/overdueOrderBookReport.view');
const { getBrokerReportView } = require('../views/reports/brokerReport.view');
const { getSalesDashboardView } = require('../views/reports/salesDashboard.view');
const { getScrapReportView } = require('../views/reports/scrapReport.view');
const { getStockAgingReportView } = require('../views/reports/stockAgingReport.view');
const { getStockBalanceReportView } = require('../views/reports/stockBalanceReport.view');
const {
  getCustomerStockPositionReportView
} = require('../views/reports/customerStockPositionReport.view');
const { getStockLedgerReportView } = require('../views/reports/stockLedgerReport.view');

const router = express.Router();
router.use(authMiddleware.protect); // Protect all routes

router.use(protect);

// Production Report
router.get(
  '/production-report',
  requirePermission(PRODUCTION_REPORT.name),
  getProductionReportView
);

// Purchase Report
router.get(
  '/purchase-report',
  requirePermission(PURCHASE_REPORT.name),
  getPurchaseReportView
);

// Kuber Purchase Report
router.get(
  '/kuber-purchase-report',
  requirePermission(KUBER_PURCHASE_REPORT.name),
  getKuberPurchaseReportView
);

// Material Issue Report
router.get(
  '/material-issue-report',
  requirePermission(MATERIAL_ISSUE_REPORT.name),
  getMaterialIssueReportView
);

// Material Issue Report, printed through its Print Format (the grid's rows travel in the body)
router.post(
  '/material-issue-report/print',
  protect,
  requirePermission(MATERIAL_ISSUE_REPORT.name),
  printMaterialIssueReportView
);

// Stock Balance Report
router.get(
  '/stock-balance-report',
  requirePermission(STOCK_BALANCE_REPORT.name),
  getStockBalanceReportView
);

// Customer Stock Position Report (stock by customer + optional SO/SI qty)
router.get(
  '/customer-stock-position-report',
  requirePermission(CUSTOMER_STOCK_POSITION_REPORT.name),
  getCustomerStockPositionReportView
);

// Kuber Stock Summary Report (RFD = FG balance, WIP = WIP balance, optional SO/SI)
router.get(
  '/kuber-stock-summary-report',
  requirePermission(KUBER_STOCK_SUMMARY_REPORT.name),
  getKuberStockSummaryReportView
);

// Stock Ledger Report
router.get(
  '/stock-ledger-report',
  requirePermission(STOCK_LEDGER_REPORT.name),
  getStockLedgerReportView
);

// Stock Aging Report
router.get(
  '/stock-aging-report',
  requirePermission(STOCK_AGING_REPORT.name),
  getStockAgingReportView
);

// FG Stock Ageing Report
router.get(
  '/fg-stock-aging-report',
  requirePermission(FG_STOCK_AGING_REPORT.name),
  getFGStockAgingReportView
);

// Sales Report
router.get(
  '/sales-report',
  requirePermission(SALES_REPORT.name),
  getSalesReportView
);

// Sales Order Report (one row per sales-order line item)
router.get(
  '/sales-order-report',
  requirePermission(SALES_ORDER_REPORT.name),
  getSalesOrderReportView
);

// OTIF Report (on-time-in-full delivery performance per sales order)
router.get(
  '/otif-report',
  requirePermission(OTIF_REPORT.name),
  getOtifReportView
);

// Overdue Order Book Report (approved SOs past expected delivery, not fully dispatched)
router.get(
  '/overdue-order-book-report',
  requirePermission(OVERDUE_ORDER_BOOK_REPORT.name),
  getOverdueOrderBookReportView
);

// Broker Report (SO lines per broker with dispatch, invoice and settled money)
router.get(
  '/broker-report',
  requirePermission(BROKER_REPORT.name),
  getBrokerReportView
);

// Sales Dashboard (aggregate sales KPIs, GST breakdown, trends, dispatch)
router.get(
  '/sales-dashboard',
  requirePermission(SALES_DASHBOARD.name),
  getSalesDashboardView
);

// Custom Kuber Report (same data as Sales Report)
router.get(
  '/custom-kuber-report',
  requirePermission(CUSTOM_KUBER_REPORT.name),
  getCustomKuberReportView
);

// Kuber Customer Item Report (summary: one row per unique customer + item)
router.get(
  '/kuber-customer-item-report',
  requirePermission(KUBER_CUSTOMER_ITEM_REPORT.name),
  getKuberCustomerItemReportView
);

// Kuber Summary Report (customer + item: RFD and WIP only)
router.get(
  '/kuber-summary-report',
  requirePermission(KUBER_SUMMARY_REPORT.name),
  getKuberSummaryReportView
);

// Machine Ongoing Report
router.get(
  '/mother-coil-tracking-report',
  requirePermission(MOTHER_COIL_TRACKING_REPORT.name),
  getMotherCoilTrackingReportView
);

// Monthly FG and RM Data Report
router.get(
  '/monthly-fg-rm-data-report',
  requirePermission(MONTHLY_FG_RM_DATA_REPORT.name),
  getMonthlyFgRmDataReportView
);

// Machine Ongoing Report
router.get(
  '/machine-ongoing-report',
  requirePermission(MACHINE_ONGOING_REPORT.name),
  getMachineOngoingReportView
);

// Manufacturing Pipeline Report (per WO transaction: production, raw material consumed, scrap)
router.get(
  '/manufacturing-pipeline-report',
  requirePermission(MANUFACTURING_PIPELINE_REPORT.name),
  getManufacturingPipelineReportView
);

// Sales Funnel Report
router.get(
  '/sales-funnel-report',
  requirePermission(SALES_FUNNEL_REPORT.name),
  getSalesFunnelReportView
);

// Scrap Report
router.get(
  '/scrap-report',
  requirePermission(SCRAP_REPORT.name),
  getScrapReportView
);

// Purchase Pipeline Report (Requirement → Indent → PO → Invoice)
router.get(
  '/purchase-pipeline-report',
  requirePermission(PURCHASE_PIPELINE_REPORT.name),
  getPurchasePipelineReportView
);

// Indent Report (Requirement → Indent → PO → Receipt / Invoice)
router.get(
  '/indent-report',
  requirePermission(INDENT_REPORT.name),
  getIndentReportView
);

// Dispatch Report (Sales Invoices = dispatched goods)
router.get(
  '/dispatch-report',
  requirePermission(DISPATCH_REPORT.name),
  getDispatchReportView
);

// Item Wise Purchase History Report (PO lines for one item in a date range)
router.get(
  '/item-wise-purchase-history-report',
  requirePermission(ITEM_WISE_PURCHASE_HISTORY_REPORT.name),
  getItemWisePurchaseHistoryReportView
);

module.exports = router;
