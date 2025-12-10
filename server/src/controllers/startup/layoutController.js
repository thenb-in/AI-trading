const LayoutService = require('../../services/startup/layoutService');
const logger = require('../../../logger');

class LayoutController {
  /**
   * Get all layouts for a specific document
   */
  static async getLayoutsByDocument(req, res) {
    try {
      const { document_name } = req.params;
      const { company_id, id: user_id } = req.user;

      if (!document_name) {
        return res.status(400).json({
          success: false,
          message: `Document name is required, document_name: ${document_name}`
        });
      }

      const layouts = await LayoutService.getLayoutsByDocument(document_name, user_id, company_id);
      const publicLayouts = await LayoutService.getPublicLayoutsByDocument(document_name, company_id, user_id);

      res.status(200).json({
        success: true,
        data: {
          private: layouts,
          public: publicLayouts
        },
        message: `Layouts retrieved successfully, private:  ${layouts.length} public: ${publicLayouts.length} records found`
      });
    } catch (error) {
      logger.error('Error fetching layouts by document', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch layouts ${error.message}`,
        error: error.message
      });
    }
  }

  /**
   * Get a specific layout by ID
   */
  static async getLayoutById(req, res) {
    try {
      const { layout_id } = req.params;
      const { company_id, id: user_id } = req.user;

      if (!layout_id) {
        return res.status(400).json({
          success: false,
          message: `Layout ID is required , layout_id: ${layout_id}`
        });
      }

      const layout = await LayoutService.getLayoutById(layout_id, user_id, company_id);

      res.status(200).json({
        success: true,
        data: layout,
        message: `Layout retrieved successfully for id : ${layout_id}`
      });
    } catch (error) {
      logger.error('Error fetching layout by ID', error);
      res.status(500).json({
        success: false,
        message: `Failed to fetch layout ${error.message}`,
        error: error.message
      });
    }
  }

  /**
   * Create or update a layout
   */
  static async createOrUpdateLayout(req, res) {
    try {
      const { company_id, id: user_id } = req.user;
      const layoutData = req.body;

      // Validate required fields
      if (!layoutData.document_name || !layoutData.layout_name || !layoutData.column_config) {
        return res.status(400).json({
          success: false,
          message: 'Document name, layout name, and column config are required'
        });
      }

      const layout = await LayoutService.createOrUpdateLayout(layoutData, user_id, company_id);

      res.status(200).json({
        success: true,
        data: layout,
        message: `Layout saved successfully ${layout.id}`
      });
    } catch (error) {
      logger.error('Error creating or updating layout', error);
      res.status(500).json({
        success: false,
        message: `Failed to create or update layout ${error.message}`,
        error: error.message
      });
    }
  }

  /**
   * Delete a layout
   */
  static async deleteLayout(req, res) {
    try {
      const { layout_id } = req.params;
      const { company_id, id: user_id } = req.user;

      if (!layout_id) {
        return res.status(400).json({
          success: false,
          message: `Layout ID is required , layout_id: ${layout_id}`
        });
      }

      const result = await LayoutService.deleteLayout(layout_id, user_id, company_id);

      res.status(200).json({
        success: true,
        data: result,
        message: `Layout deleted successfully ${layout_id}`
      });
    } catch (error) {
      logger.error('Error deleting layout', error);
      res.status(500).json({
        success: false,
        message: `Failed to delete layout ${error.message}`,
        error: error.message
      });
    }
  }

  /**
   * Set a layout as default for the current user
   */
  static async setDefaultLayout(req, res) {
    try {
      const { layout_id } = req.body;
      const { company_id, id: user_id } = req.user;

      if (!layout_id) {
        return res.status(400).json({
          success: false,
          message: `Layout ID is required, layout_id: ${layout_id}`
        });
      }

      const result = await LayoutService.setDefaultLayout(layout_id, user_id, company_id);

      res.status(200).json({
        success: true,
        data: result,
        message: `Default layout set successfully for layout_id: ${layout_id}`
      });
    } catch (error) {
      logger.error('Error setting default layout', error);
      res.status(500).json({
        success: false,
        message: `Failed to set default layout ${error.message}`,
        error: error.message
      });
    }
  }

  /**
   * Unset default layout for the current user and document
   */
  static async unsetDefaultLayout(req, res) {
    try {
      const { document_name } = req.body;
      const { company_id, id: user_id } = req.user;

      if (!document_name) {
        return res.status(400).json({
          success: false,
          message: `Document name is required, document_name: ${document_name}`
        });
      }

      const result = await LayoutService.unsetDefaultLayout(document_name, user_id, company_id);

      res.status(200).json({
        success: true,
        data: result,
        message: `Default layout removed successfully for document_name: ${document_name}`
      });
    } catch (error) {
      logger.error('Error unsetting default layout', error);
      res.status(500).json({
        success: false,
        message: `Failed to unset default layout ${error.message}`,
        error: error.message
      });
    }
  }

}

module.exports = LayoutController;
