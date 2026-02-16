import PropTypes from "prop-types";
import { Box } from "@mui/material";
import { colors } from "@theme";

const HighlightText = ({ text, highlight }) => {
  const highlightTrimmed = highlight ? highlight.trim() : "";
  if (!highlightTrimmed) {
    return <span>{text}</span>;
  }
  const regex = new RegExp(`(${highlightTrimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = String(text).split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Box
            key={i}
            component="mark"
            sx={{
              backgroundColor: colors.warning.light,
              color: "inherit",
              padding: "0 2px",
              borderRadius: "2px",
              fontWeight: "bold",
            }}
          >
            {part}
          </Box>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

HighlightText.propTypes = {
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  highlight: PropTypes.string,
};

export { HighlightText };

