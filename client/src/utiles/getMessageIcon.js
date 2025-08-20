import { FileText, Image, Video, Music } from 'lucide-react';

export const getMessageIcon = (message) => {
    if (!message || typeof message !== 'string') return null;

    // Map MIME types to file extensions and icons
    const fileExtensions = {
      // Images
      'image/jpeg': { extension: 'jpg', icon: Image, color: 'text-green-500', label: 'Photo' },
      'image/png': { extension: 'png', icon: Image, color: 'text-green-500', label: 'Photo' },
      'image/gif': { extension: 'gif', icon: Image, color: 'text-green-500', label: 'GIF' },
      'image/webp': { extension: 'webp', icon: Image, color: 'text-green-500', label: 'Photo' },
      // Documents
      'application/pdf': { extension: 'pdf', icon: FileText, color: 'text-red-500', label: 'PDF' },
      'application/msword': { extension: 'doc', icon: FileText, color: 'text-blue-500', label: 'Document' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: 'docx', icon: FileText, color: 'text-blue-500', label: 'Document' },
      'application/vnd.ms-excel': { extension: 'xls', icon: FileText, color: 'text-blue-500', label: 'Spreadsheet' },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extension: 'xlsx', icon: FileText, color: 'text-blue-500', label: 'Spreadsheet' },
      // Videos
      'video/mp4': { extension: 'mp4', icon: Video, color: 'text-purple-500', label: 'Video' },
      'video/webm': { extension: 'webm', icon: Video, color: 'text-purple-500', label: 'Video' },
      'video/quicktime': { extension: 'mov', icon: Video, color: 'text-purple-500', label: 'Video' },
      // Audio
      'audio/mpeg': { extension: 'mp3', icon: Music, color: 'text-orange-500', label: 'Audio' },
      'audio/wav': { extension: 'wav', icon: Music, color: 'text-orange-500', label: 'Audio' },
      'audio/ogg': { extension: 'ogg', icon: Music, color: 'text-orange-500', label: 'Audio' },
      'audio/webm': { extension: 'weba', icon: Music, color: 'text-orange-500', label: 'Audio' },
      // Existing text file
      txt: { icon: FileText, color: 'text-gray-500', label: 'Text' },
      rtf: { icon: FileText, color: 'text-blue-500', label: 'Document' },
    };

    // Check for file extensions in the message
    const fileMatch = message.match(/\.([a-zA-Z0-9]+)(?:\?|$)/i);
    if (fileMatch) {
      const extension = fileMatch[1].toLowerCase();
      // Find the MIME type that corresponds to this extension
      const mimeType = Object.keys(fileExtensions).find(
        (key) => fileExtensions[key].extension === extension
      );
      if (mimeType) {
        return fileExtensions[mimeType];
      }
    }

    // Check if the message contains a MIME type directly
    const mimeTypeMatch = Object.keys(fileExtensions).find((mime) =>
      message.toLowerCase().includes(mime)
    );
    if (mimeTypeMatch) {
      return fileExtensions[mimeTypeMatch];
    }

    return null;
};