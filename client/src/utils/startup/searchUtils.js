/**
 * Calculates a relevance score for a search item against a search term.
 * Scores are weighted by match location: title > tags > keywords > category > description.
 * @param {Object} item - Searchable item with title, description, category, tags, keywords
 * @param {string} term - Lowercase search term
 * @returns {number} Relevance score (0 = no match, higher = more relevant)
 */
const calculateMatchScore = (item, term) => {
  if (!term) return 0;
  
  const title = String(item.title || "").toLowerCase();
  const description = String(item.description || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  const tags = Array.isArray(item.tags) ? item.tags.map(t => String(t).toLowerCase()) : [];
  const keywords = String(item.keywords || "").toLowerCase();
  
  let score = 0;

  // Title Match (Priority 1)
  if (title === term) {
    score += 10000;
  } else if (title.startsWith(term)) {
    score += 8000;
  } else if (title.includes(term)) {
    score += 6000;
  }

  // Tags Match (Priority 2)
  if (tags.some(tag => tag === term)) {
    score += 5000;
  } else if (tags.some(tag => tag.includes(term))) {
    score += 4000;
  }

  // Keywords Match (Priority 3)
  if (keywords.includes(term)) {
    score += 3000;
  }

  // Category Match (Priority 4)
  if (category === term) {
    score += 2000;
  } else if (category.includes(term)) {
    score += 1500;
  }

  // Description Match (Priority 5)
  if (description.includes(term)) {
    score += 500;
  }

  return score;
};

/**
 * Filter and sort items based on search term
 */
const filterAndSortItems = (items, query, maxResults) => {
  const term = query.trim().toLowerCase();
  
  if (!term) {
    return {
      items: items.slice(0, maxResults),
      total: items.length
    };
  }

  const scoredItems = items
    .map(item => ({
      ...item,
      score: calculateMatchScore(item, term)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return {
    items: scoredItems.slice(0, maxResults),
    total: scoredItems.length
  };
};

export { calculateMatchScore, filterAndSortItems };

