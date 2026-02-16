import { useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Chip,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { fontSize, colors } from "@theme";
import { HighlightText } from "./HighlightText";

const REPORT = "Report";

const SearchResultItem = ({ item, idx, activeIndex, onMouseEnter, onClick, query }) => {
  const isQueryReport = query.toLowerCase().includes("report");
  const isItemReport = item.type === REPORT;
  
  const handleMouseEnter = useCallback(() => {
    onMouseEnter(idx);
  }, [idx, onMouseEnter]);

  const handleClick = useCallback(() => {
    onClick(item);
  }, [item, onClick]);

  const renderTagChip = useCallback((tag, tagIdx) => (
    <Chip 
      key={tagIdx} 
      size="small" 
      label={<HighlightText text={tag} highlight={query} />} 
      sx={{ fontSize: fontSize.xs, height: "18px" }}
    />
  ), [query]);

  return (
    <ListItemButton
      selected={idx === activeIndex}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      sx={{
        borderRadius: 1,
        mb: 0.5,
        border: isQueryReport && isItemReport ? `1px solid ${colors.warning.light}` : "1px solid transparent",
        backgroundColor: isQueryReport && isItemReport ? "rgba(255, 245, 157, 0.1)" : "inherit",
      }}
    >
      <ListItemText
        primary={
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              <HighlightText text={item.title} highlight={query} />
            </Typography>
            <Chip 
              size="small" 
              label={item.type} 
              color={item.type === REPORT ? "primary" : "default"}
              variant={isQueryReport && isItemReport ? "filled" : "outlined"}
              sx={{ 
                fontWeight: 700,
                boxShadow: isQueryReport && isItemReport ? `0 0 8px ${colors.warning.light}` : "none"
              }}
            />
          </Box>
        }
        secondary={
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="body2" color="text.secondary">
                <HighlightText text={item.category} highlight={query} />
              </Typography>
              {item.tags && item.tags.length > 0 && (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {item.tags.map(renderTagChip)}
                </Box>
              )}
            </Box>
            {item.description ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                <HighlightText text={item.description} highlight={query} />
              </Typography>
            ) : null}
          </Box>
        }
      />
    </ListItemButton>
  );
};

SearchResultItem.propTypes = {
  item: PropTypes.object.isRequired,
  idx: PropTypes.number.isRequired,
  activeIndex: PropTypes.number.isRequired,
  onMouseEnter: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
};

export { SearchResultItem };

