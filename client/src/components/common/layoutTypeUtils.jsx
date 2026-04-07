import { Public as PublicIcon, Lock as PrivateIcon, Schedule as TempIcon } from '@mui/icons-material';

const getTypeIcon = (type) => {
  switch (type) {
    case 'public': return <PublicIcon fontSize="small" />;
    case 'private': return <PrivateIcon fontSize="small" />;
    case 'temp': return <TempIcon fontSize="small" />;
    default: return null;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case 'public': return 'success';
    case 'private': return 'default';
    case 'temp': return 'warning';
    default: return 'default';
  }
};

export { getTypeIcon, getTypeColor };
