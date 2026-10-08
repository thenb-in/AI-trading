import { useEffect, useState } from 'react';

/** A browser URL for a File or Blob, revoked when it changes or the component goes. '' for none. */
const useObjectUrl = (fileOrBlob) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!fileOrBlob) {
      setUrl('');
      return undefined;
    }
    const next = URL.createObjectURL(fileOrBlob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [fileOrBlob]);
  return url;
};

export { useObjectUrl };
