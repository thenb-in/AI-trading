// app_routes.js
//
// The app's own HTTP routes, mounted by buildApp() under the framework's
// /api/v1 prefix. An app adds a router by requiring it here and calling
// app.use(`${prefix}/<path>`, router) below.
//
// Empty in the reference scaffold apart from the two routers every app gets:
// the report router the socket runner indexes, and the framework's layouts.

const logger = require('@startup/logger');
const reportRoutes = require('../routes/reportRoutes');
const layoutRoutes = require('@startup/src/routes/layoutRoutes');
const registerUndoables = require('../undo/registerUndoables');

const costCenterRoutes = require('./costCenterRoute');
const indentRoutes = require('./indentRoute');
const inventoryRoutes = require('./inventoryRoutes');
const letterHeadRoutes = require('./letterHeadRoute');
const bomRoutes = require('./manufacturing_routes/bomRoutes');
const workOrderRoutes = require('./manufacturing_routes/workOrderRoutes');
const workOrderTransactionRoutes = require('./manufacturing_routes/workOrderTransactionRoutes');
const workOrderMaterialTransferRoutes = require('./manufacturing_routes/workOrderMaterialTransferRoutes');
const workOrderTimeLogRoutes = require('./manufacturing_routes/workOrderTimeLogRoutes');
const materialIssueRoutes = require('./materialIssueRoute');
const materialReturnRoutes = require('./materialReturnRoute');
const repairWorkRoutes = require('./repairWorkRoute');
const gatePassRoutes = require('./gatePassRoute');
const personRoutes = require('./personRoute');
const printFormatMasterRoutes = require('./printFormatMasterRoute');
const printMasterRoutes = require('./printMasterRoute');
const printRoutes = require('./printRoute');
const purchaseQuotationRoutes = require('./purchase_master_routes/purchaseQuotationRoutes');
const reportRoutes = require('./reportRoutes');
const fixKuberSummaryReportRoutes = require('./fixKuberSummaryReportRoute');
const kuberProductionPlanningRoutes = require('./kuberProductionPlanningRoutes');
const requirementRoutes = require('./requirementRoute');
const rfqRoutes = require('./rfqRoute');
const purchaseInvoiceRoutes = require('./sale_master_routes/purchaseInvoiceRoutes');
const purchaseOrderRoutes = require('./sale_master_routes/purchaseOrderRoutes');
const purchaseReceiptRoutes = require('./sale_master_routes/purchaseReceiptRoutes');
const purchaseReturnRoutes = require('./sale_master_routes/purchaseReturnRoutes');
const enquiryRoutes = require('./sale_master_routes/enquiryRoutes');
const quotationRoutes = require('./sale_master_routes/quotationRoutes');
const salesInvoiceRoutes = require('./sale_master_routes/salesInvoiceRoutes');
const brokerRoutes = require('./brokerRoute');
const customerPaymentRoutes = require('./customerPaymentRoute');
const dispatchRoutes = require('./sale_master_routes/dispatchRoutes');
const scrapSalesRoutes = require('./sale_master_routes/scrapSalesRoutes');
const salesOrderRoutes = require('./sale_master_routes/salesOrderRoutes');
const salesPaymentRegisterRoutes = require('./sale_master_routes/salesPaymentRegisterRoutes');
const customerRoutes = require('./setup_master_routes/customerRoutes');
const emailMasterRoutes = require('./setup_master_routes/emailMasterRoutes');
const hsnCodeRoutes = require('./setup_master_routes/hsnCodeRoute');
const itemGroupRoutes = require('./setup_master_routes/itemGroupRoutes');
const itemRoutes = require('./setup_master_routes/itemRoutes');
const machineRoutes = require('./setup_master_routes/machineRoute');
const operationRoutes = require('./setup_master_routes/operationRoutes');
const paymentTermsRoutes = require('./setup_master_routes/paymentTermsRoutes');
const paymentReminderRoutes = require('./setup_master_routes/paymentReminderRoutes');
const paymentCollectionRoutes = require('./setup_master_routes/paymentCollectionRoutes');
const incotermsRoutes = require('./setup_master_routes/incotermsRoutes');
const categoryMasterRoutes = require('./setup_master_routes/categoryMasterRoutes');
const inspectionTemplateRoutes = require('./setup_master_routes/inspectionTemplateRoutes');
const parameterRoutes = require('./setup_master_routes/parameterRoutes');
const stockReconciliationRoutes = require('./setup_master_routes/stockReconciliationRoute');
const termsAndConditionsRoutes = require('./setup_master_routes/termsAndConditionsRoutes');
const uomRoutes = require('./setup_master_routes/uomRoutes');
const warehouseRoutes = require('./setup_master_routes/warehouseRoutes');
const supplierRoutes = require('./supplierRoute');
const transporterRoutes = require('./transporterRoute');
// export a function that takes in app and returns the app with the routes
const appRoutes = (app, prefix) => {
  // todo: automatically add prefix to app routes
  // current routes in app route need to manually add prefix
  app.use(`${prefix}/item-groups`, itemGroupRoutes);
  app.use(`${prefix}/items`, itemRoutes);
  app.use(`${prefix}/hsn-codes`, hsnCodeRoutes);
  app.use(`${prefix}/uoms`, uomRoutes);
  app.use(`${prefix}/warehouse`, warehouseRoutes);
  app.use(`${prefix}/customers`, customerRoutes);
  app.use(`${prefix}/suppliers`, supplierRoutes);
  app.use(`${prefix}/transporters`, transporterRoutes);
  app.use(`${prefix}/persons`, personRoutes);
  app.use(`${prefix}/cost-centers`, costCenterRoutes);
  app.use(`${prefix}/print-masters`, printMasterRoutes);
  app.use(`${prefix}/print-format-masters`, printFormatMasterRoutes);
  app.use(`${prefix}/letter-heads`, letterHeadRoutes);
  app.use(`${prefix}/print`, printRoutes);
  app.use(`${prefix}/stock-reconciliation`, stockReconciliationRoutes);
  app.use(`${prefix}/requirements`, requirementRoutes);
  app.use(`${prefix}/machines`, machineRoutes);
  app.use(`${prefix}/operations`, operationRoutes);
  app.use(`${prefix}/material-issues`, materialIssueRoutes);
  app.use(`${prefix}/material-returns`, materialReturnRoutes);
  app.use(`${prefix}/repair-works`, repairWorkRoutes);
  app.use(`${prefix}/gate-passes`, gatePassRoutes);
  app.use(`${prefix}/indent`, indentRoutes);
  app.use(`${prefix}/rfq`, rfqRoutes);
  app.use(`${prefix}/purchase-quotations`, purchaseQuotationRoutes);
  app.use(`${prefix}/terms-and-conditions`, termsAndConditionsRoutes);
  app.use(`${prefix}/payment-terms`, paymentTermsRoutes);
  app.use(`${prefix}/payment-reminders`, paymentReminderRoutes);
  app.use(`${prefix}/payment-collections`, paymentCollectionRoutes);
  app.use(`${prefix}/incoterms`, incotermsRoutes);
  app.use(`${prefix}/master-categories`, categoryMasterRoutes);
  app.use(`${prefix}/inspection-templates`, inspectionTemplateRoutes);
  app.use(`${prefix}/parameters`, parameterRoutes);
  app.use(`${prefix}/enquiries`, enquiryRoutes);
  app.use(`${prefix}/quotations`, quotationRoutes);
  app.use(`${prefix}/sales-orders`, salesOrderRoutes);
  app.use(`${prefix}/sales-payments`, salesPaymentRegisterRoutes);
  app.use(`${prefix}/customer-payments`, customerPaymentRoutes);
  app.use(`${prefix}/brokers`, brokerRoutes);
  app.use(`${prefix}/sales-invoices`, salesInvoiceRoutes);
  app.use(`${prefix}/dispatches`, dispatchRoutes);
  app.use(`${prefix}/scrap-sales`, scrapSalesRoutes);
  app.use(`${prefix}/purchase-orders`, purchaseOrderRoutes);
  app.use(`${prefix}/purchase-invoices`, purchaseInvoiceRoutes);
  app.use(`${prefix}/purchase-receipts`, purchaseReceiptRoutes);
  app.use(`${prefix}/purchase-returns`, purchaseReturnRoutes);
  app.use(`${prefix}/inventory`, inventoryRoutes);
  app.use(`${prefix}/bom`, bomRoutes);
  app.use(`${prefix}/work-orders`, workOrderRoutes);
  app.use(`${prefix}/work-order-transactions`, workOrderTransactionRoutes);
  app.use(`${prefix}/work-order-material-transfers`, workOrderMaterialTransferRoutes);
  app.use(`${prefix}/work-order-time-logs`, workOrderTimeLogRoutes);
  app.use(`${prefix}/reports`, reportRoutes);

  app.use(`${prefix}/layouts`, layoutRoutes);

  logger.info(`App routes loaded at ${Date.now()}`);
};

module.exports = appRoutes;
