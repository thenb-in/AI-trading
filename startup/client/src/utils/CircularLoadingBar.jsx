import PropTypes from "prop-types";
import { useRef, useEffect } from "react";

const CircularLoadingBar = ({ size = 24, thickness = 5, color = "#2e7d32" }) => {
  const loadingBarRef = useRef(null);
  const colorWithOpacity = `${color}20`;

  useEffect(() => {
    if (loadingBarRef.current) {
      loadingBarRef.current.style.setProperty('--loading-size', `${size}px`);
      loadingBarRef.current.style.setProperty('--loading-thickness', `${thickness}px`);
      loadingBarRef.current.style.setProperty('--loading-color', color);
      loadingBarRef.current.style.setProperty('--loading-color-opacity', colorWithOpacity);
    }
  }, [size, thickness, color, colorWithOpacity]);

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        ref={loadingBarRef}
        className="rounded-full animate-spin circular-loading-bar"
      />
    </>
  );
};

CircularLoadingBar.propTypes = {
  size: PropTypes.number,
  thickness: PropTypes.number,
  color: PropTypes.string,
};

export { CircularLoadingBar };

