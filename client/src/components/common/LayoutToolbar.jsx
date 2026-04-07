import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Typography,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen as LoadIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { getTypeIcon, getTypeColor } from './layoutTypeUtils';
import { LayoutManager } from './LayoutManager';

const LayoutListSection = ({ layouts: list, label, onLoadLayout, onSetDefault }) => (
  <>
    {list.length > 0 && (
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {label} ({list.length})
        </Typography>
      </Box>
    )}
    {list.map((layout) => (
      <MenuItem key={layout.id} onClick={() => onLoadLayout(layout)} sx={{ px: 2 }}>
        <ListItemIcon>{getTypeIcon(layout.type)}</ListItemIcon>
        <ListItemText
          primary={layout.layout_name}
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={layout.type} size="small" color={getTypeColor(layout.type)} variant="outlined" />
              <Typography variant="caption">
                {new Date(layout.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          }
        />
        <ListItemSecondaryAction>
          <IconButton edge="end" size="small" onClick={(e) => onSetDefault(e, layout)} sx={{ mr: 1 }}>
            {layout.is_default ? (
              <StarIcon color="warning" fontSize="small" />
            ) : (
              <StarBorderIcon fontSize="small" />
            )}
          </IconButton>
        </ListItemSecondaryAction>
      </MenuItem>
    ))}
  </>
);

LayoutListSection.propTypes = {
  layouts: PropTypes.array.isRequired,
  label: PropTypes.string.isRequired,
  onLoadLayout: PropTypes.func.isRequired,
  onSetDefault: PropTypes.func.isRequired,
};

const LayoutToolbar = ({
  documentName,
  layouts,
  loading,
  onSaveLayout,
  onLoadLayout,
  onSetDefaultLayout,
  onUnsetDefaultLayout,
  currentColumnConfig = [],
  columnVisibilityModel = {},
  selectedLayout,
  setSelectedLayout
}) => {
  const [layoutManagerOpen, setLayoutManagerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  // Debug: Track selectedLayout changes
  useEffect(() => {
    console.log('selectedLayout prop changed to:', selectedLayout);
  }, [selectedLayout]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    // Don't clear selectedLayout here - it should persist until a new layout is loaded
  };

  const handleLoadLayout = (layout) => {
    console.log('handleLoadLayout called with:', layout);
    console.log('About to call onLoadLayout...');
    onLoadLayout(layout);
    console.log('About to set selectedLayout...');
    setSelectedLayout(layout); // Use the prop setter
    console.log('selectedLayout set to:', layout);
    console.log('About to call handleMenuClose...');
    handleMenuClose();
    console.log('handleLoadLayout completed');
  };

  const handleSaveLayout = () => {
    console.log('handleSaveLayout called, selectedLayout:', selectedLayout);
    if (selectedLayout) {
      // If a layout is currently loaded, update it directly
      const updatedLayout = {
        ...selectedLayout,
        // The column config will be updated by the parent component
      };
      console.log('Updating existing layout:', updatedLayout);
      onSaveLayout(updatedLayout);
    } else {
      // If no layout is loaded, open the create dialog
      console.log('No layout selected, opening create dialog');
      setLayoutManagerOpen(true);
    }
  };



  const handleSetDefault = async (e, layout) => {
    e.stopPropagation(); // Prevent menu item click
    if (layout.is_default && onUnsetDefaultLayout) {
      await onUnsetDefaultLayout(documentName);
    } else if (onSetDefaultLayout) {
      await onSetDefaultLayout(layout.id);
    }
  };

  const allLayouts = [
    ...layouts.private.map(layout => ({ ...layout, section: 'private' })),
    ...layouts.public.map(layout => ({ ...layout, section: 'public' })),
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Debug info */}
      {console.log('LayoutToolbar render - selectedLayout prop:', selectedLayout)}
      
      {/* Save Layout Button */}
      <Button
        size="small"
        startIcon={<SaveIcon />}
        onClick={handleSaveLayout}
        disabled={loading}
      >
        {selectedLayout ? `Update Layout (${selectedLayout.layout_name})` : 'Save Layout'}
      </Button>

      {/* Load Layout Menu */}
      {allLayouts.length > 0 && (
        <>
          <Button
            size="small"
            startIcon={<LoadIcon />}
            onClick={handleMenuOpen}
            disabled={loading}
          >
            Load Layout ({allLayouts.length})
          </Button>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: { maxHeight: 400, width: 300 }
            }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Available Layouts
              </Typography>
            </Box>
            <Divider />

            <LayoutListSection
              layouts={layouts.private}
              label="Private"
              onLoadLayout={handleLoadLayout}
              onSetDefault={handleSetDefault}
            />

            {layouts.private.length > 0 && layouts.public.length > 0 && <Divider />}

            <LayoutListSection
              layouts={layouts.public}
              label="Public"
              onLoadLayout={handleLoadLayout}
              onSetDefault={handleSetDefault}
            />

            <Divider />
            <MenuItem onClick={() => setLayoutManagerOpen(true)} sx={{ px: 2 }}>
              <ListItemIcon>
                <MoreIcon />
              </ListItemIcon>
              <ListItemText primary="Manage All Layouts" />
            </MenuItem>
          </Menu>
        </>
      )}

      {/* Layout Manager Dialog */}
      <LayoutManager
        open={layoutManagerOpen}
        onClose={() => setLayoutManagerOpen(false)}
        documentName={documentName}
        currentColumnConfig={currentColumnConfig}
        columnVisibilityModel={columnVisibilityModel}
        onLayoutLoad={onLoadLayout}
        onLayoutSave={onSaveLayout}
        onSetDefaultLayout={onSetDefaultLayout}
        onUnsetDefaultLayout={onUnsetDefaultLayout}
      />
    </Box>
  );
};

LayoutToolbar.propTypes = {
  documentName: PropTypes.string.isRequired,
  layouts: PropTypes.shape({
    private: PropTypes.array.isRequired,
    public: PropTypes.array.isRequired,
  }).isRequired,
  loading: PropTypes.bool.isRequired,
  onSaveLayout: PropTypes.func.isRequired,
  onLoadLayout: PropTypes.func.isRequired,
  onDeleteLayout: PropTypes.func.isRequired,
  onRefreshLayouts: PropTypes.func,
  onSetDefaultLayout: PropTypes.func,
  onUnsetDefaultLayout: PropTypes.func,
  currentColumnConfig: PropTypes.array,
  columnVisibilityModel: PropTypes.object,
  selectedLayout: PropTypes.object,
  setSelectedLayout: PropTypes.func.isRequired,
};

export { LayoutToolbar };
