import {
  People as PeopleIcon,
} from "@mui/icons-material";

const getMasterModules = (handleOpenMaster) => [
  {
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
  },
  {
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

export { getMasterModules };
