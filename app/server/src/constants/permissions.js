const { buildPermissionSets } = require('@startup/src/constants/permissions');
const { create_master_permission, create_report_permission } = require('@startup/src/constants/base_permissions');
const { MASTERS } = require('./masters');

// ERP's masters and reports. The framework's own sets (users, roles, companies,
// notifications, NBnext Drive, ...) and roles come from buildPermissionSets.
const masters = {
  // Held by roles long before it was declared; the company profile screen saves with it.
  COMPANY_PROFILE: {
    update: {
      name: 'update_company_details',
      display_name: 'Update Company Details',
      description: 'Permission to update the company profile: its details, bank, tax and document settings'
    }
  },
  ITEM_GROUP: create_master_permission(MASTERS.ITEM_GROUP),
  UOM: create_master_permission(MASTERS.UOM),
  CUSTOMER: {
    ...create_master_permission(MASTERS.CUSTOMER),
    mergeCustomer: {
      name: 'merge_customer',
      display_name: 'Merge Customer',
      description: 'Permission to merge duplicate customers into an original customer across the system'
    }
  },
  TERMS_AND_CONDITIONS: create_master_permission(MASTERS.TERMS_AND_CONDITIONS),
  PAYMENT_TERMS: create_master_permission(MASTERS.PAYMENT_TERMS),
  INCOTERMS: create_master_permission(MASTERS.INCOTERMS),
  INSPECTION_TEMPLATE: create_master_permission(MASTERS.INSPECTION_TEMPLATE),
  PARAMETER: create_master_permission(MASTERS.PARAMETER),
  ITEM: {
    ...create_master_permission(MASTERS.ITEM),
    viewRate: {
      name: 'view_item_rate',
      display_name: 'View Item Rate',
      description: 'Permission to view item rate'
    },
    mergeItem: {
      name: 'merge_item',
      display_name: 'Merge Item',
      description: 'Permission to merge duplicate items into an original item across the system'
    }
  },
  WAREHOUSE: create_master_permission(MASTERS.WAREHOUSE),
  SUPPLIER: {
    ...create_master_permission(MASTERS.SUPPLIER),
    mergeSupplier: {
      name: 'merge_supplier',
      display_name: 'Merge Supplier',
      description: 'Permission to merge duplicate suppliers into an original supplier across the system'
    }
  },
  TRANSPORTER: create_master_permission(MASTERS.TRANSPORTER),
  PERSON: create_master_permission(MASTERS.PERSON),
  COST_CENTER: create_master_permission(MASTERS.COST_CENTER),
  COMPANY_DETAILS: create_master_permission(MASTERS.COMPANY_DETAILS),
  REQUIREMENT: create_master_permission(MASTERS.REQUIREMENT, true),
  MATERIAL_ISSUE: {
    ...create_master_permission(MASTERS.MATERIAL_ISSUE, true),
    viewRate: {
      name: 'view_material_issue_rate',
      display_name: 'View Material Issue Rate',
      description: 'Permission to view the FIFO rate and amount stamped on material issue lines at approval'
    }
  },
  MATERIAL_RETURN: create_master_permission(MASTERS.MATERIAL_RETURN, true),
  REPAIR_WORK: create_master_permission(MASTERS.REPAIR_WORK, true),
  GATE_PASS: create_master_permission(MASTERS.GATE_PASS, true),
  INDENT: create_master_permission(MASTERS.INDENT, true),
  ENQUIRY: create_master_permission(MASTERS.ENQUIRY, true),
  QUOTATION: create_master_permission(MASTERS.QUOTATION, true),
  SALES_ORDER: create_master_permission(MASTERS.SALES_ORDER, true),
  SALES_INVOICE: create_master_permission(MASTERS.SALES_INVOICE, true),
  DISPATCH: create_master_permission(MASTERS.DISPATCH, true),
  CUSTOMER_PAYMENT: create_master_permission(MASTERS.CUSTOMER_PAYMENT),
  BROKER: create_master_permission(MASTERS.BROKER),
  SCRAP_SALES: create_master_permission(MASTERS.SCRAP_SALES, true),
  PURCHASE_ORDER: {
    ...create_master_permission(MASTERS.PURCHASE_ORDER, true),
    editApproved: {
      name: 'edit_approved_purchase_order',
      display_name: 'Edit Approved Purchase Order',
      description: 'Permission to edit a purchase order after it has been approved'
    }
  },
  PURCHASE_INVOICE: create_master_permission(MASTERS.PURCHASE_INVOICE, true),
  INVENTORY: create_master_permission(MASTERS.INVENTORY),
  KUBER_ITEM: create_master_permission(MASTERS.KUBER_ITEM),
  BOM: create_master_permission(MASTERS.BOM),
  WORK_ORDER: create_master_permission(MASTERS.WORK_ORDER),
  WORK_ORDER_TRANSACTION: create_master_permission(MASTERS.WORK_ORDER_TRANSACTION),
  MACHINE: create_master_permission(MASTERS.MACHINE),
  OPERATION: create_master_permission(MASTERS.OPERATION),
  HSN_CODE: create_master_permission(MASTERS.HSN_CODE),
  STOCK_RECONCILIATION: create_master_permission(MASTERS.STOCK_RECONCILIATION, true),
  PRINT_MASTER: create_master_permission(MASTERS.PRINT_MASTER),
  PRINT_FORMAT_MASTER: create_master_permission(MASTERS.PRINT_FORMAT_MASTER),
  LETTER_HEAD: create_master_permission(MASTERS.LETTER_HEAD),
  RFQ: create_master_permission(MASTERS.RFQ),
  PURCHASE_QUOTATION: create_master_permission(MASTERS.PURCHASE_QUOTATION, true),
  PURCHASE_RECEIPT: create_master_permission(MASTERS.PURCHASE_RECEIPT, true),
  PURCHASE_RETURN: create_master_permission(MASTERS.PURCHASE_RETURN, true),
  EMAIL_MASTER: create_master_permission(MASTERS.EMAIL_MASTER),
  DOCUMENT_QUALITY_INSPECTION: create_master_permission(MASTERS.DOCUMENT_QUALITY_INSPECTION),
  CATEGORY: create_master_permission(MASTERS.CATEGORY),
  FIX_KUBER_SUMMARY_REPORT: create_master_permission(MASTERS.FIX_KUBER_SUMMARY_REPORT),
  KUBER_PRODUCTION_PLANNING: create_master_permission(MASTERS.KUBER_PRODUCTION_PLANNING),
  SALES_PAYMENT_REGISTER: create_master_permission(MASTERS.SALES_PAYMENT_REGISTER)
};

const reports = {
  STOCK_LEDGER_REPORT: create_report_permission('stock_ledger_report'),
  STOCK_BALANCE_REPORT: create_report_permission('stock_balance_report'),
  CUSTOMER_STOCK_POSITION_REPORT: create_report_permission('customer_stock_position_report'),
  KUBER_STOCK_SUMMARY_REPORT: create_report_permission('kuber_stock_summary_report'),
  STOCK_AGING_REPORT: create_report_permission('stock_aging_report'),
  FG_STOCK_AGING_REPORT: create_report_permission('fg_stock_aging_report'),
  PRODUCTION_REPORT: create_report_permission('production_report'),
  PURCHASE_REPORT: create_report_permission('purchase_report'),
  KUBER_PURCHASE_REPORT: create_report_permission('kuber_purchase_report'),
  MATERIAL_ISSUE_REPORT: create_report_permission('material_issue_report'),
  SALES_REPORT: create_report_permission('sales_report'),
  SALES_ORDER_REPORT: create_report_permission('sales_order_report'),
  OTIF_REPORT: create_report_permission('otif_report'),
  OVERDUE_ORDER_BOOK_REPORT: create_report_permission('overdue_order_book_report'),
  SALES_DASHBOARD: create_report_permission('sales_dashboard'),
  CUSTOM_KUBER_REPORT: create_report_permission('custom_kuber_report'),
  KUBER_CUSTOMER_ITEM_REPORT: create_report_permission('kuber_customer_item_report'),
  KUBER_SUMMARY_REPORT: create_report_permission('kuber_summary_report'),
  MOTHER_COIL_TRACKING_REPORT: create_report_permission('mother_coil_tracking_report'),
  MONTHLY_FG_RM_DATA_REPORT: create_report_permission('monthly_fg_rm_data_report'),
  MACHINE_ONGOING_REPORT: create_report_permission('machine_ongoing_report'),
  MANUFACTURING_PIPELINE_REPORT: create_report_permission('manufacturing_pipeline_report'),
  SALES_FUNNEL_REPORT: create_report_permission('sales_funnel_report'),
  SCRAP_REPORT: create_report_permission('scrap_report'),
  PURCHASE_PIPELINE_REPORT: create_report_permission('purchase_pipeline_report'),
  INDENT_REPORT: create_report_permission('indent_report'),
  DISPATCH_REPORT: create_report_permission('dispatch_report'),
  BROKER_REPORT: create_report_permission('broker_report'),
  ITEM_WISE_PURCHASE_HISTORY_REPORT: create_report_permission('item_wise_purchase_history_report')
};

const { buildPermissionSets } = require('@startup/src/constants/permissions');
const {
  APP_MASTER_PERMISSION_CONSTANTS,
  APP_MODULE_PERMISSION_CONSTANTS,
  APP_REPORT_PERMISSION_CONSTANTS
} = require('./app_permissions');

module.exports = buildPermissionSets({
  masters: APP_MASTER_PERMISSION_CONSTANTS,
  modules: APP_MODULE_PERMISSION_CONSTANTS,
  reports: APP_REPORT_PERMISSION_CONSTANTS
});
