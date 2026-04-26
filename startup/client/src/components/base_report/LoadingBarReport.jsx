import { CircularProgress, Box } from "@mui/material";
import PropTypes from "prop-types";
import { colors } from "@startup/constants/theme";

const LoadingBarReport = ({ isVisible, isFiltering = false }) => {
  if (!isVisible && !isFiltering) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.background.default,
        opacity: 0.85,
        zIndex: 50,
        borderRadius: "16px",
        backdropFilter: "blur(4px)",
        transition: "all 0.3s ease-in-out",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          animation: "fadeIn 0.5s ease-in-out",
        }}
      >
        <CircularProgress size={50} thickness={4} />
        <span className="text-gray-700 text-sm font-medium tracking-wide mt-2 animate-pulse">
          {isFiltering ? "Applying filters..." : "Loading report data..."}
        </span>
      </Box>
    </Box>
  );
};

LoadingBarReport.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  isFiltering: PropTypes.bool,
};

export { LoadingBarReport };
