
import PropTypes from "prop-types";
import {
  Box,
  Stack,
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";

const SearchFilter = ({
  searchTerm,
  onSearchChange,
  onClear,
  totalCards,
  filteredCount,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Box sx={{ mb: 1 }}>
      <Stack
        direction={isMobile ? "column" : "row"}
        spacing={2}
        alignItems="center"
        justifyContent="center"
      >
        <TextField
          placeholder="Search modules..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{
            width: isMobile ? "100%" : 500,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: "background.paper",
              "&:hover": {
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "primary.main",
                },
              },
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <Tooltip title="Clear search">
                  <IconButton onClick={onClear} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Stack>
      {searchTerm && (
        <Box sx={{ mt: 1.5, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredCount} of {totalCards} modules
            {filteredCount === 0 && (
              <Typography component="span" color="text.primary" sx={{ ml: 1 }}>
                - Try adjusting your search terms
              </Typography>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SearchFilter;

SearchFilter.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  totalCards: PropTypes.number.isRequired,
  filteredCount: PropTypes.number.isRequired,
};
