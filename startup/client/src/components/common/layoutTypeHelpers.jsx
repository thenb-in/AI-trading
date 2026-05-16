import {
  Public as PublicIcon,
  Lock as PrivateIcon,
  Schedule as TempIcon,
} from '@mui/icons-material';

/** MUI icon for a layout's visibility type (public/private/temp). */
const getLayoutTypeIcon = (type) => {
  switch (type) {
    case 'public':
      return <PublicIcon fontSize="small" />;
    case 'private':
      return <PrivateIcon fontSize="small" />;
    case 'temp':
      return <TempIcon fontSize="small" />;
    default:
      return null;
  }
};

/** MUI palette key for the Chip color associated with a layout's visibility type. */
const getLayoutTypeColor = (type) => {
  switch (type) {
    case 'public':
      return 'success';
    case 'private':
      return 'default';
    case 'temp':
      return 'warning';
    default:
      return 'default';
  }
};

export { getLayoutTypeIcon, getLayoutTypeColor };
