const { Layout, UserDefaultLayout } = require('../../models');
const logger = require('../../../logger');

class LayoutService {
  /**
   * Get all layouts for a specific document and user
   * Adds is_default flag to indicate which layout is the user's default
   */
  static async getLayoutsByDocument(documentName, userId, companyId) {
    try {
      const layouts = await Layout.findByDocumentAndUserId(documentName, userId, companyId);

      // Get the default layout for this user and document
      const defaultLayout = await UserDefaultLayout.findByUserAndDocument(userId, documentName, companyId);
      const defaultLayoutId = defaultLayout?.layout_id || null;

      // Add is_default flag to each layout
      const layoutsWithDefault = layouts.map(layout => {
        const layoutJson = layout.toJSON();
        return {
          ...layoutJson,
          is_default: layoutJson.id === defaultLayoutId
        };
      });

      return layoutsWithDefault;
    } catch (error) {
      logger.error('Error fetching layouts by document', error);
      throw error;
    }
  }

  /**
   * Get public layouts for a specific document
   * Adds is_default flag to indicate which layout is the user's default
   */
  static async getPublicLayoutsByDocument(documentName, companyId, userId = null) {
    try {
      const layouts = await Layout.findPublicByDocument(documentName, companyId);

      // If userId is provided, check for default layout
      let defaultLayoutId = null;
      if (userId) {
        const defaultLayout = await UserDefaultLayout.findByUserAndDocument(userId, documentName, companyId);
        defaultLayoutId = defaultLayout?.layout_id || null;
      }

      // Add is_default flag to each layout
      const layoutsWithDefault = layouts.map(layout => {
        const layoutJson = layout.toJSON();
        return {
          ...layoutJson,
          is_default: layoutJson.id === defaultLayoutId
        };
      });

      return layoutsWithDefault;
    } catch (error) {
      logger.error('Error fetching public layouts by document', error);
      throw error;
    }
  }

  /**
   * Get a specific layout by ID
   */
  static async getLayoutById(layoutId, userId, companyId) {
    try {
      const layout = await Layout.findOne({
        where: {
          id: layoutId,
          company_id: companyId,
          [require('sequelize').Op.or]: [
            { user_id: userId },
            { type: 'public' }
          ]
        }
      });

      if (!layout) {
        throw new Error(`Layout not found or you do not have permission to access it ,id ${layoutId}`);
      }

      return layout;
    } catch (error) {
      logger.error('Error fetching layout by ID', error);
      throw error;
    }
  }

  /**
   * Create or update a layout
   */
  static async createOrUpdateLayout(layoutData, userId, companyId) {
    try {
      const { id, document_name, layout_name, type = 'private', column_config } = layoutData;

      // Validate required fields
      if (!document_name || !layout_name || !column_config) {
        throw new Error(`Document name, layout name, and column config are required , document_name: ${document_name}, layout_name: ${layout_name}, column_config: ${column_config}`);
      }

      let layout;
      let isNew = false;

      if (id) {
        // Update existing layout

        layout = await Layout.findOne({
          where: {
            id: id,
            user_id: userId,
            company_id: companyId
          }
        });

        if (!layout) {
          throw new Error(`Layout not found or you do not have permission to update it ,id ${id}`);
        }

        // Update the layout
        await layout.update({
          document_name,
          layout_name,
          type,
          column_config
        });

      } else {
        // Create new layout

        layout = await Layout.create({
          document_name,
          layout_name,
          type,
          user_id: userId,
          company_id: companyId,
          column_config
        });
        isNew = true;

      }

      return { ...layout.toJSON(), isNew };
    } catch (error) {
      logger.error('Error creating or updating layout', error);
      throw error;
    }
  }

  /**
   * Delete a layout
   * Also removes it as default if it was set as default
   */
  static async deleteLayout(layoutId, userId, companyId) {
    try {
      const layout = await Layout.findOne({
        where: {
          id: layoutId,
          user_id: userId,
          company_id: companyId
        }
      });

      if (!layout) {
        throw new Error(`Layout not found or you do not have permission to delete it ,id ${layoutId}`);
      }

      // Check if this layout is set as default for any user and remove it
      await UserDefaultLayout.destroy({
        where: {
          layout_id: layoutId,
          company_id: companyId
        }
      });

      await layout.destroy();
      return { success: true, message: 'Layout deleted successfully' };
    } catch (error) {
      logger.error('Error deleting layout', error);
      throw error;
    }
  }

  /**
   * Set a layout as default for a user
   */
  static async setDefaultLayout(layoutId, userId, companyId) {
    try {
      // First, verify the layout exists and user has access to it
      const layout = await Layout.findOne({
        where: {
          id: layoutId,
          company_id: companyId,
          [require('sequelize').Op.or]: [
            { user_id: userId },
            { type: 'public' }
          ]
        }
      });

      if (!layout) {
        throw new Error(`Layout not found or you do not have permission to set it as default, id: ${layoutId}`);
      }

      // Remove any existing default for this user/document/company combination
      await UserDefaultLayout.destroy({
        where: {
          user_id: userId,
          document_name: layout.document_name,
          company_id: companyId
        }
      });

      // Create new default
      const defaultLayout = await UserDefaultLayout.create({
        user_id: userId,
        document_name: layout.document_name,
        layout_id: layoutId,
        company_id: companyId
      });

      return defaultLayout;
    } catch (error) {
      logger.error('Error setting default layout', error);
      throw error;
    }
  }

  /**
   * Unset default layout for a user and document
   */
  static async unsetDefaultLayout(documentName, userId, companyId) {
    try {
      const result = await UserDefaultLayout.destroy({
        where: {
          user_id: userId,
          document_name: documentName,
          company_id: companyId
        }
      });

      return { success: true, message: 'Default layout removed successfully', deleted: result > 0 };
    } catch (error) {
      logger.error('Error unsetting default layout', error);
      throw error;
    }
  }

  /**
   * Get default layout for a user and document
   */
  static async getDefaultLayout(documentName, userId, companyId) {
    try {
      const defaultLayout = await UserDefaultLayout.findByUserAndDocument(userId, documentName, companyId);
      if (!defaultLayout) {
        return null;
      }

      // Get the full layout details
      const layout = await Layout.findOne({
        where: {
          id: defaultLayout.layout_id,
          company_id: companyId
        }
      });

      return layout;
    } catch (error) {
      logger.error('Error getting default layout', error);
      throw error;
    }
  }

}

module.exports = LayoutService;
