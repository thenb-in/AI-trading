import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download } from 'lucide-react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';

const QRCodeDisplay = ({ content, heading, message, onDownload, showCopyableValue = false, valueLabel }) => {
  const qrRef = useRef(null);

  const handleDownload = async () => {
    try {
      if (!qrRef.current) return;

      const svgElement = qrRef.current.querySelector('svg');
      if (!svgElement) return;

      // Convert SVG to canvas, then to image
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // Set canvas size (add padding for heading and message)
      const qrSize = 256;
      const padding = 40;
      const headingHeight = heading ? 60 : 0;
      const messageHeight = message ? 40 : 0;
      canvas.width = qrSize + (padding * 2);
      canvas.height = qrSize + (padding * 2) + headingHeight + messageHeight;

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      img.onload = () => {
        // Draw heading
        if (heading) {
          ctx.fillStyle = '#1f2937';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(heading, canvas.width / 2, 35);
        }

        // Draw QR code
        ctx.drawImage(img, padding, padding + headingHeight, qrSize, qrSize);

        // Draw message
        if (message) {
          ctx.fillStyle = '#4b5563';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          const maxWidth = canvas.width - (padding * 2);
          const words = message.split(' ');
          let line = '';
          let y = qrSize + headingHeight + padding + 30;

          words.forEach((word) => {
            const testLine = line + word + ' ';
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line !== '') {
              ctx.fillText(line, canvas.width / 2, y);
              line = word + ' ';
              y += 25;
            } else {
              line = testLine;
            }
          });
          ctx.fillText(line, canvas.width / 2, y);
        }

        // Convert to blob and download
        canvas.toBlob((blob) => {
          if (!blob) {
            toast.error('Failed to generate QR code image');
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `qr-code-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          if (onDownload) {
            onDownload();
          }
          toast.success('QR code downloaded successfully!');
        }, 'image/png');
      };

      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    } catch {
      toast.error('Failed to download QR code');
    }
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy. Please try again.');
    }
  };

  return (
    <div className="flex flex-col items-center p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      {heading && (
        <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
          {heading}
        </h3>
      )}
      <div ref={qrRef} className="p-4 bg-white rounded-lg border border-gray-300">
        <QRCodeSVG
          value={content}
          size={256}
          level="H"
          includeMargin={true}
        />
      </div>
      {message && (
        <p className="text-sm text-gray-600 mt-4 text-center max-w-xs">
          {message}
        </p>
      )}
      {showCopyableValue && content && (
        <div className="mt-4 w-full max-w-xs">
          {valueLabel && (
            <p className="text-xs text-gray-500 mb-1 text-center">{valueLabel}</p>
          )}
          <button
            type="button"
            onClick={handleCopyContent}
            title="Click to copy"
            className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors text-xs font-mono text-gray-700"
          >
            <span className="truncate">{content}</span>
            <Copy size={14} className="flex-shrink-0 text-gray-500" />
          </button>
        </div>
      )}
      <button
        onClick={handleDownload}
        className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Download size={18} />
        Download QR Code
      </button>
    </div>
  );
};

QRCodeDisplay.propTypes = {
  content: PropTypes.string.isRequired,
  heading: PropTypes.string,
  message: PropTypes.string,
  onDownload: PropTypes.func,
  showCopyableValue: PropTypes.bool,
  valueLabel: PropTypes.string,
};

export { QRCodeDisplay };

