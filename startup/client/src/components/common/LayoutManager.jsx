import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  TextField,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Checkbox,
} from '@mui/material';
import { parseDateValue } from '@utils/dateTimeUtils';
import { spacing } from '@startup/constants/theme';
import { BaseModal } from '@startup/components/base_components/master';
import {
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { ApiService as layoutApi } from '@services/ApiService';
import { getLayoutTypeIcon, getLayoutTypeColor } from './layoutTypeHelpers';
import { SearchableDropdown } from '@startup/components/base_components/fields/SearchableDropdown';

const LAYOUT_TYPE_OPTIONS = [
  { value: 'private', label: 'Private (Only you can see)' },
  { value: 'public', label: 'Public (Everyone can see)' },
  { value: 'temp', label: 'Temporary (Auto-deleted after 7 days)' },
];

const LayoutManager = ({
  open,
  onClose,
  documentName,
  currentColumnConfig,
  columnVisibilityModel = {},
  onLayoutLoad,
  onLayoutSave,
  onSetDefaultLayout,
  onUnsetDefaultLayout,
}) => {
  const [layouts, setLayouts] = useState({ private: [], public: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [newLayoutType, setNewLayoutType] = useState('private');

  // Load layouts when dialog opens
  useEffect(() => {
    if (open && documentName) {
      loadLayouts();
    }
  }, [open, documentName]);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await layoutApi.getLayoutsByDocument(documentName);
      setLayouts(response.data.data);
    } catch (err) {
      console.error('LayoutManager: Error loading layouts', {
        documentName,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message || 'Failed to load layouts');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLayout = async () => {
    if (!newLayoutName.trim()) {
      setError('Layout name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      console.log('=== LAYOUT MANAGER DEBUG ===');
      console.log('currentColumnConfig:', currentColumnConfig);
      console.log('columnVisibilityModel:', columnVisibilityModel);
      
      // Generate correct column config using columnVisibilityModel
      const columnConfig = currentColumnConfig.map(col => {
        const visibilityValue = columnVisibilityModel[col.field];
        const isVisible = visibilityValue === true; // Only true means visible, false or undefined means hidden
        const hide = !isVisible;
        console.log(`LayoutManager - Column ${col.field}: visibility=${visibilityValue}, isVisible=${isVisible}, hide=${hide}`);
        
        return {
          ...col,
          hide: hide
        };
      });

      console.log('Final columnConfig for save:', columnConfig.map(col => ({ field: col.field, hide: col.hide })));
      console.log('=== END LAYOUT MANAGER DEBUG ===');

      const layoutData = {
        document_name: documentName,
        layout_name: newLayoutName.trim(),
        type: newLayoutType,
        column_config: columnConfig,
      };

      // Let the parent component handle the API call to avoid duplication
      if (onLayoutSave) {
        await onLayoutSave(layoutData);
      }
      
      // Refresh layouts
      await loadLayouts();
      
      // Close save dialog
      setSaveDialogOpen(false);
      setNewLayoutName('');
      setNewLayoutType('private');
    } catch (err) {
      console.error('LayoutManager: Error saving layout', {
        documentName,
        layoutName: newLayoutName,
        layoutType: newLayoutType,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message || 'Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadLayout = async (layout) => {
    try {
      setError(null);
      
      if (onLayoutLoad) {
        onLayoutLoad(layout);
      }
      
      onClose();
    } catch (err) {
      console.error('LayoutManager: Error loading layout', {
        documentName,
        layoutId: layout?.id,
        layoutName: layout?.layout_name,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message || 'Failed to load layout');
    }
  };

  const handleDeleteLayout = async (layoutId) => {
    if (!window.confirm('Are you sure you want to delete this layout?')) {
      return;
    }

    try {
      setError(null);
      await layoutApi.deleteLayout(layoutId);
      
      // Refresh layouts
      await loadLayouts();
    } catch (err) {
      console.error('LayoutManager: Error deleting layout', {
        documentName,
        layoutId,
        error: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.message || 'Failed to delete layout');
    }
  };

  const handleSetDefault = async (layout, isDefault) => {
    try {
      setError(null);
      if (isDefault && onSetDefaultLayout) {
        await onSetDefaultLayout(layout.id);
      } else if (!isDefault && onUnsetDefaultLayout) {
        await onUnsetDefaultLayout(documentName);
      }
      
      // Refresh layouts to update is_default flags
      await loadLayouts();
    } catch (err) {
      console.error('LayoutManager: Error setting default layout', {
        documentName,
        layoutId: layout.id,
        error: err.message,
      });
      setError(err.message || 'Failed to set default layout');
    }
  };

  const renderLayoutList = (layoutList, title) => (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title} ({layoutList.length})
      </Typography>
      {layoutList.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          No {title.toLowerCase()} layouts found
        </Typography>
      ) : (
        <List dense>
          {layoutList.map((layout) => (
            <ListItem key={layout.id} sx={{ px: 0 }}>
              <ListItemIcon>
                <Checkbox
                  edge="start"
                  checked={layout.is_default || false}
                  onChange={(e) => handleSetDefault(layout, e.target.checked)}
                  tabIndex={-1}
                  disableRipple
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                    {layout.layout_name}
                    {layout.is_default && (
                      <Chip label="Default" size="small" color="warning" variant="outlined" />
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm, mt: spacing.xs }}>
                    <Chip
                      icon={getLayoutTypeIcon(layout.type)}
                      label={layout.type}
                      size="small"
                      color={getLayoutTypeColor(layout.type)}
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {parseDateValue(layout.created_at)?.toLocaleDateString() ?? ''}
                    </Typography>
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  onClick={() => handleLoadLayout(layout)}
                  size="small"
                  sx={{ mr: spacing.sm }}
                >
                  <LoadIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  onClick={() => handleDeleteLayout(layout.id)}
                  size="small"
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );

  const openSaveDialog = () => setSaveDialogOpen(true);
  const closeSaveDialog = () => setSaveDialogOpen(false);
  const clearError = () => setError(null);
  const handleLayoutNameChange = (e) => setNewLayoutName(e.target.value);

  return (
    <>
      <BaseModal
        isOpen={open}
        onClose={onClose}
        title={(
          <Box sx={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            <SaveIcon />
            {`Layout Manager - ${documentName}`}
          </Box>
        )}
        maxWidth="md"
        showAudit={false}
        actions={(
          <>
            <Button onClick={openSaveDialog} startIcon={<SaveIcon />}>
              Save Current Layout
            </Button>
            <Button onClick={onClose}>Close</Button>
          </>
        )}
      >
        {error && (
          <Alert severity="error" sx={{ mb: spacing.md }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: spacing.xl }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
            {renderLayoutList(layouts.private, 'Private Layouts')}

            <Divider />

            {renderLayoutList(layouts.public, 'Public Layouts')}
          </Box>
        )}
      </BaseModal>

      {/* Save Layout Dialog */}
      <BaseModal
        isOpen={saveDialogOpen}
        onClose={closeSaveDialog}
        title="Save Layout"
        maxWidth="xs"
        showAudit={false}
        actions={(
          <>
            <Button onClick={closeSaveDialog}>Cancel</Button>
            <Button
              onClick={handleSaveLayout}
              variant="contained"
              disabled={saving || !newLayoutName.trim()}
              startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            >
              {saving ? 'Saving...' : 'Save Layout'}
            </Button>
          </>
        )}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing.md, pt: spacing.sm }}>
          <TextField
            label="Layout Name"
            value={newLayoutName}
            onChange={handleLayoutNameChange}
            fullWidth
            placeholder="Enter a name for this layout"
          />

          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Layout Type
            </Typography>
            <SearchableDropdown
              options={LAYOUT_TYPE_OPTIONS}
              selectedValues={newLayoutType}
              onChange={setNewLayoutType}
              placeholder="Select layout type"
              multiple={false}
            />
          </Box>
        </Box>
      </BaseModal>
    </>
  );
};

LayoutManager.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  documentName: PropTypes.string.isRequired,
  currentColumnConfig: PropTypes.array.isRequired,
  columnVisibilityModel: PropTypes.object,
  onLayoutLoad: PropTypes.func.isRequired,
  onLayoutSave: PropTypes.func.isRequired,
  onSetDefaultLayout: PropTypes.func,
  onUnsetDefaultLayout: PropTypes.func,
};

export { LayoutManager };
