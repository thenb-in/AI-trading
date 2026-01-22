import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { ApiService } from '../../services/startup/ApiService';

const isPdfByMimeOrUrl = (mimeType, url) => {
  if (mimeType) return mimeType.toLowerCase().includes('pdf');
  if (!url) return false;
  try {
    const pathname = new URL(url, window.location.origin).pathname.toLowerCase();
    return pathname.endsWith('.pdf');
  } catch (err) {
    console.error('FileViewerModal: Error parsing URL for PDF check', {
      url,
      error: err.message,
    });
    return url.toLowerCase().includes('.pdf');
  }
};

const FileViewerModal = ({ isOpen, onClose, fileUrl, mimeType, title = 'View File' }) => {
  const [blobUrl, setBlobUrl] = useState('');
  const [effectiveMime, setEffectiveMime] = useState(mimeType || '');

  // Handle escape key to close modal
  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    let revokedUrl = '';
    const load = async () => {
      if (!isOpen || !fileUrl) return;
      try {
        // Check if fileUrl is a full URL or relative path
        const isFullUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://');
        let response;
        
        if (isFullUrl) {
          // For full URLs, extract the pathname if it's from the same origin
          try {
            const urlObj = new URL(fileUrl);
            const sameOrigin = urlObj.origin === window.location.origin;
            if (sameOrigin) {
              // Use the pathname with ApiService
              response = await ApiService.request('GET', urlObj.pathname, null, {
                responseType: 'blob',
                headers: {},
              });
            } else {
              // For different origin, we need to use fetch but this violates the rule
              // Fallback: use the full URL directly as blob URL
              setBlobUrl(fileUrl);
              setEffectiveMime(mimeType || '');
              return;
            }
          } catch (urlError) {
            console.log(urlError)
            // If URL parsing fails, treat as relative path
            response = await ApiService.request('GET', fileUrl, null, {
              responseType: 'blob',
              headers: {},
            });
          }
        } else {
          // Relative path - use ApiService directly
          response = await ApiService.request('GET', fileUrl, null, {
            responseType: 'blob',
            headers: {},
          });
        }
        
        const blob = response.data instanceof Blob ? response.data : new Blob([response.data]);
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setEffectiveMime(blob.type || mimeType || '');
        revokedUrl = url;
      } catch (err) {
        console.error('FileViewerModal: Error loading file blob', {
          fileUrl,
          mimeType,
          error: err.message,
          status: err.response?.status,
        });
        setBlobUrl(fileUrl);
        setEffectiveMime(mimeType || '');
      }
    };
    load();
    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
      setBlobUrl('');
    };
  }, [isOpen, fileUrl, mimeType]);

  const isPdf = useMemo(() => isPdfByMimeOrUrl(effectiveMime, fileUrl), [effectiveMime, fileUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[80vh] mx-4 flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-gray-200">
          <div className="text-sm font-medium text-gray-700 truncate pr-2">{title}</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 bg-gray-50">
          {isPdf ? (
            <iframe title="PDF Viewer" src={blobUrl || fileUrl} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black">
              <img src={blobUrl || fileUrl} alt="file" className="max-w-full max-h-full object-contain" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

FileViewerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  fileUrl: PropTypes.string,
  mimeType: PropTypes.string,
  title: PropTypes.string,
};

export { FileViewerModal };


