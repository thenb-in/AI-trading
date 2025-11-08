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
import MasterCard from "./MasterComponents/MasterCard";
import SearchFilter from "./MasterComponents/SearchFilter";
import getMasterModules from "../../data/getMasterModules";

const MasterContent = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Common Masters");
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));

  const handleOpenMaster = (path) => {
    navigate(path);
  };

  const masterModules = getMasterModules(handleOpenMaster);

  // Sync selectedCategory with URL query param `category`
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    if (categoryParam && categoryParam !== selectedCategory) {
      setSelectedCategory(categoryParam);
    }
    if (!categoryParam && selectedCategory !== "Common Masters") {
      // keep default if no param
    }
  }, [searchParams, selectedCategory]);

  // Calculate categories and their counts
  const categories = useMemo(() => {
    const categoryCounts = {};
    masterModules.forEach((module) => {
      const category = module.category || "Uncategorized";
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // Define the desired order
    const categoryOrder = ["Common Masters", "Management", "Raw Data", "Setup"];
    
    // Create ordered categories array
    const orderedCategories = categoryOrder
      .filter(category => categoryCounts[category])
      .map(name => ({
        name,
        count: categoryCounts[name],
      }));

    // Add any remaining categories not in the order
    const remainingCategories = Object.entries(categoryCounts)
      .filter(([name]) => !categoryOrder.includes(name))
      .map(([name, count]) => ({ name, count }));

    return [...orderedCategories, ...remainingCategories];
  }, [masterModules]);

  const filteredModules = useMemo(() => {
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

  const handleSearchChange = (value) => {
    setSearchTerm(value);
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

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1">
        <Container maxWidth="xl" sx={{ py: isLargeScreen ? 3 : 4 }}>
          <Box sx={{ mb: isLargeScreen ? 4 : 5, textAlign: "center" }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                color: "text.primary",
                fontSize: isLargeScreen ? "2.5rem" : "2rem",
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
              }}
            >
              Streamline organization data management with our comprehensive master modules
            </Typography>
          </Box>

          {/* Mobile Category Filter */}
          <div className="lg:hidden mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Categories</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onClear={handleClearSearch}
            totalCards={masterModules.length}
            filteredCount={filteredModules.length}
          />

          <Divider
            sx={{
              my: isLargeScreen ? 3 : 4,
              "&::before, &::after": {
                borderColor: "divider",
              },
            }}
          />

          <Box sx={{ mb: 3 }}>
            <Grid
              container
              spacing={isLargeScreen ? 4 : 3}
              justifyContent="center"
              sx={{
                maxWidth: isLargeScreen ? "none" : "100%",
                mx: "auto",
              }}
            >
              {filteredModules.map((module, index) => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  lg={4}
                  key={index}
                  sx={{ display: "flex", justifyContent: "center" }}
                >
                  <MasterCard
                    title={module.title}
                    description={module.description}
                    icon={module.icon}
                    color={module.color}
                    onClick={module.onClick}
                    buttonText={module.buttonText}
                    tags={module.tags}
                    isVisible={true}
                    fullWidth={isLargeScreen}
                  />
                </Grid>
              ))}
            </Grid>

            {filteredModules.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No modules found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Try searching with different keywords or clear your search to see all modules
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

export default MasterContent;
