import {
  People as PeopleIcon,
} from "@mui/icons-material";

const getMasterModules = (handleOpenMaster) => [
  {
    id: "test_master_1",
    title: "Test master 1",
    description:
      "Test master module 1.",
    icon: PeopleIcon,
    color: "primary",
    onClick: () => handleOpenMaster("test-master-1"),
    buttonText: "Test Master 1",
    tags: ["Test", "Master", "Module"],
    keywords:
      "test master module",
    category: "Common Masters",
    permissionName: "read_master_1",
  },
  {
    id: "test_master_2",
    title: "Test master 2",
    description: "Test master module 2.",
    icon: PeopleIcon,
    color: "primary",
    onClick: () => handleOpenMaster("test-master-2"),
    buttonText: "Open Test",
    tags: ["Test"],
    keywords: "test master module",
    category: "Other master categories",
  },
];


const getMasterCategories = () => {
  const categoryCounts = {};
  const masterModules = getMasterModules(() => { });

  masterModules.forEach((module) => {
    const category = module.category || "Uncategorized";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  const categoryOrder = ["Common Masters", "Management", "Raw Data"];

  const orderedCategories = categoryOrder
    .filter((category) => categoryCounts[category])
    .map((name) => ({ name, count: categoryCounts[name] }));

  const remainingCategories = Object.entries(categoryCounts)
    .filter(([name]) => !categoryOrder.includes(name))
    .map(([name, count]) => ({ name, count }));

  // order remaining categories by name
  const orderedRemainingCategories = remainingCategories.sort((a, b) => a.name.localeCompare(b.name));
  return [...orderedCategories, ...orderedRemainingCategories];
};


export { getMasterModules, getMasterCategories };
