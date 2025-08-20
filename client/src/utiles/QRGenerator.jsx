import PropTypes from "prop-types";
import { QRCodeCanvas } from "qrcode.react";


export default function QRGenerator({ data, size = 120 }) {
  // Ensure value is a string
  const value = data?.phone;

  return (
    <div className="flex justify-center  border-b border-gray-200">
      <QRCodeCanvas 
        value={value} 
        size={size} 
        level="H" // High error correction
        includeMargin={true} // Adds padding around QR
      />
    </div>
  );
}

QRGenerator.propTypes = {
  data: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  size: PropTypes.number, // optional size of QR code
};
