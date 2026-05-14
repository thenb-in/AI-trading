const express = require('express');
const router = express.Router();

const { protect } = require('@startup/src/middleware/authMiddleware');
const requirePermission = require('@startup/src/middleware/requirePermission');

const {
  validateCreatePrescription,
  validateUpdatePrescription,
  validateGetPrescriptionById,
  validateDeletePrescription,
  handleValidationErrors
} = require('../validator/prescriptionValidation');

const {
  getAllPrescriptionsView,
  getPrescriptionByIdView,
  createPrescriptionView,
  updatePrescriptionView,
  deletePrescriptionView
} = require('../view/prescriptionView');

const { MASTER_PERMISSION_CONSTANTS } = require('@startup/server/src/constants/permissions');
const { PRESCRIPTION } = MASTER_PERMISSION_CONSTANTS;

/**
 * GET /prescription
 * Get all prescriptions for the company
 */
router.get(
  '/',
  protect,
  requirePermission(PRESCRIPTION.read.name),
  getAllPrescriptionsView
);

/**
 * GET /prescription/:id
 * Get a specific prescription by ID
 */
router.get(
  '/:id',
  protect,
  requirePermission(PRESCRIPTION.read.name),
  validateGetPrescriptionById,
  handleValidationErrors,
  getPrescriptionByIdView
);

/**
 * POST /prescription
 * Create a new prescription
 */
router.post(
  '/',
  protect,
  requirePermission(PRESCRIPTION.create.name),
  validateCreatePrescription,
  handleValidationErrors,
  createPrescriptionView
);

/**
 * PUT /prescription/:id
 * Update an existing prescription
 */
router.put(
  '/:id',
  protect,
  requirePermission(PRESCRIPTION.update.name),
  validateUpdatePrescription,
  handleValidationErrors,
  updatePrescriptionView
);

/**
 * DELETE /prescription/:id
 * Delete a prescription
 */
router.delete(
  '/:id',
  protect,
  requirePermission(PRESCRIPTION.delete.name),
  validateDeletePrescription,
  handleValidationErrors,
  deletePrescriptionView
);

module.exports = router;
