import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Container,
  Divider,
  Grid,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { MasterCard } from "./master_components/MasterCard";
import { SearchFilter } from "./master_components/SearchFilter";
import { getMasterModules, getMasterCategoriesForUser } from "../data/getMasterModules";
import { canSeeModule } from "../data/canSeeModule";
import { spacing } from "@startup/constants/theme";
import { SearchableDropdown } from "@startup/components/base_components/fields/SearchableDropdown";
import { useDataContext } from "@context/useDataContext";


const MasterContent = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));
  const { userData } = useDataContext();
  const handleOpenMaster = (path) => {
    navigate(path);
  };

  const masterModules = getMasterModules(handleOpenMaster);
  const categories = getMasterCategoriesForUser(userData);

  // Sync selectedCategory with URL query param `category` (no param = show All masters)
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory("All");
    }
  }, [searchParams]);

  const filteredMasterModules = useMemo(() => {
    let filtered = masterModules;

    // Filter by search term first (search across all categories)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((module) => {
        // Log modules with missing data for debugging
        if (!module.title || !module.description || !module.keywords || !Array.isArray(module.tags)) {
          console.warn('Module with missing data:', module);
        }

        if (!module) return false;

        const title = module.title || '';
        const description = module.description || '';
        const keywords = module.keywords || '';
        const tags = Array.isArray(module.tags) ? module.tags : [];

        return (
          title.toLowerCase().includes(term) ||
          description.toLowerCase().includes(term) ||
          keywords.toLowerCase().includes(term) ||
          tags.some((tag) => tag && tag.toLowerCase().includes(term))
        );
      });
    }

    // Then filter by category (only if no search term or if we want to show category filter)
    if (selectedCategory !== "All" && !searchTerm.trim()) {
      filtered = filtered.filter((module) => module.category === selectedCategory);
    }

    return filtered;
  }, [searchTerm, selectedCategory, masterModules]);

  // What the grid shows: the search/category result, minus what this user may
  // not see. Everything below counts these — the cards, Enter-to-open, and the
  // "no masters found" message.
  const visibleMasterModules = useMemo(
    () => filteredMasterModules.filter((master) => canSeeModule(master, userData)),
    [filteredMasterModules, userData]
  );

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  // Pressing Enter opens the master when the search narrows to a single result
  const handleSearchEnter = () => {
    visibleMasterModules[0].onClick();
  };

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    if (category && category !== "All") {
      setSearchParams({ category });
    } else {
      setSearchParams({});
    }
  };

  const categoryOptions = [
    { value: "All", label: "All Categories" },
    ...categories.map((category) => ({
      value: category.name,
      label: `${category.name} (${category.count})`,
    })),
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1">
        <Container
          maxWidth="xl"
          sx={{
            py: { xs: 2, sm: 3, lg: 3 },
            px: { xs: 1.5, sm: 3 },
          }}
        >
          <Box sx={{ mb: { xs: 3, sm: 4, lg: 4 }, textAlign: "center" }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: "text.primary",
                fontSize: { xs: "1.5rem", sm: "2rem", lg: "2.5rem" },
                background: "linear-gradient(45deg, #1976d2, #9c27b0)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                textShadow: "none",
              }}
            >
              Master Modules
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{
                maxWidth: 700,
                mx: "auto",
                lineHeight: 1.5,
                fontWeight: 400,
                fontSize: { xs: "0.875rem", sm: "1rem" },
                px: { xs: 1, sm: 0 },
              }}
            >
              Streamline organization data management with our comprehensive master modules
            </Typography>
          </Box>

          {/* Mobile Category Filter */}
          <div className="lg:hidden mb-6" data-tour="masters-categories">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <SearchableDropdown
                options={categoryOptions}
                selectedValues={selectedCategory}
                onChange={handleCategoryChange}
                placeholder="All Categories"
                multiple={false}
                defaultOptionValue="All"
              />
            </div>
          </div>

          <div data-tour="masters-search">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              onClear={handleClearSearch}
              onEnter={handleSearchEnter}
              totalCards={masterModules.length}
              filteredCount={visibleMasterModules.length}
            />
          </div>

          <Divider
            sx={{
              my: isLargeScreen ? 3 : 4,
              "&::before, &::after": {
                borderColor: "divider",
              },
            }}
          />

          <Box data-tour="masters-grid" sx={{ mb: 3 }}>
            <Grid
              container
              spacing={{ xs: 2, sm: 3, lg: 4 }}
              justifyContent="center"
              sx={{
                maxWidth: isLargeScreen ? "none" : "100%",
                mx: "auto",
              }}
            >
              {visibleMasterModules.map((master, index) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  lg={4}
                  key={index}
                  sx={{ display: "flex", justifyContent: "center" }}
                >
                  <MasterCard
                    title={master.title}
                    description={master.description}
                    icon={master.icon}
                    color={master.color}
                    onClick={master.onClick}
                    buttonText={master.buttonText}
                    tags={master.tags}
                    isVisible={true}
                    fullWidth={isLargeScreen}
                  />
                </Grid>
              ))}
            </Grid>

            {visibleMasterModules.length === 0 && (
              <Box sx={{ textAlign: "center", py: spacing.xl }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No masters found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try searching with different keywords or clear your search to see all masters
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: isLargeScreen ? 4 : 5, textAlign: "center", pb: 2 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontStyle: "italic",
                opacity: 0.8,
              }}
            >
              Select a module to begin managing your organization&apos;s data
            </Typography>
          </Box>
        </Container>
      </div>
    </div>
  );
};


export { MasterContent };
