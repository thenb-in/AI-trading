import {
  People as PeopleIcon,
} from "@mui/icons-material";

const getMasterModules = (handleOpenMaster) => [
  {
    title: "Employee Master",
    description:
      "Comprehensive employee database management including personal details, salary administration, leave policies, and performance tracking with advanced reporting capabilities.",
    icon: PeopleIcon,
    color: "primary",
    onClick: () => handleOpenMaster("employee"),
    buttonText: "Manage Employees",
    tags: ["Employee", "Database", "Salary", "Leave", "Performance"],
    keywords:
      "employee staff personnel database management salary leave performance tracking HR human resources",
    category: "Common Masters",
  },
];

export default getMasterModules;
