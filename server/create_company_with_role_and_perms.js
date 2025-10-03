"use strict";
const bcrypt = require("bcrypt");
const { Sequelize, Op } = require("sequelize");
const readline = require("readline");
const db = require("./models"); // Sequelize models index
const logger = require("./logger");

// Utility to get user input from terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const askQuestion = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Create roles in the system
 */
async function createRoles(transaction) {
  logger.info("Creating roles...");
  const roles = await db.Role.bulkCreate(
    [
      { name: "sadmin", description: "Super Administrator with full system access" },
      { name: "admin", description: "Administrator with elevated permissions" },
      { name: "user", description: "Standard user with basic access" },
    ],
    { transaction, returning: true }
  );
  logger.info(`Roles created: ${roles.map((r) => r.name).join(", ")}`);
  return roles;
}

/**
 * Create a company
 */
async function createCompany(transaction, userRole) {
  const companyName = await askQuestion("Enter company name: ");
  logger.info(`Creating company: ${companyName}`);
  const company = await db.Company.create(
    {
      name: companyName || "default",
      mobileApp: false,
      desktopWeb: true,
      mobileWeb: false,
      roleId: userRole.id,
    },
    { transaction }
  );
  logger.info(`Company created with ID: ${company.id}`);
  return company;
}

/**
 * Create permissions
 */
async function createPermissions(transaction) {
  logger.info("Creating permissions...");
  const permissions = await db.Permission.bulkCreate(
    [
      { name: "Approve User", description: "Permission to approve new users" },
      { name: "Deactivate User", description: "Permission to deactivate users" },
      { name: "Get Company Settings", description: "Permission to view company settings" },
      { name: "Update Company Settings", description: "Permission to update company settings" },
      { name: "Add Role", description: "Permission to add a new role" },
      { name: "Link Role Permission", description: "Permission to map permissions to roles" },
      { name: "isAdmin", description: "Flag for admin-level access" },
      { name: "View Company Settings", description: "Permission to view company settings" },
      { name: "View AdminLayout", description: "Permission to access admin layout view" },
    ],
    { transaction, returning: true }
  );
  logger.info(`Permissions created: ${permissions.map((p) => p.name).join(", ")}`);
  return permissions;
}

/**
 * Create a user and assign to company
 */
async function createUser(transaction, company) {
  const createUserAnswer = await askQuestion("Do you want to create a user? (yes/no): ");
  if (createUserAnswer.toLowerCase() !== "yes") return null;

  const username = await askQuestion("Enter username: ");
  const password = await askQuestion("Enter password: ");
  const hashedPassword = await bcrypt.hash(password, 10);

  logger.info(`Creating user: ${username}`);
  const user = await db.User.create(
    {
      username,
      password:hashedPassword,
      phone: "1234567890",
      name: username,
      companyId: company.id,
    },
    { transaction }
  );

  // Assign user to company
  await user.setCompany(company, { transaction });
  logger.info(`User ${username} created and assigned to company ID: ${company.id}`);
  return user;
}

/**
 * Main setup function
 */
async function main() {
  const transaction = await db.sequelize.transaction();
  try {
    const roles = await createRoles(transaction);
    const sadminRole = roles.find((r) => r.name === "sadmin");
    const userRole = roles.find((r) => r.name === "user");

    const company = await createCompany(transaction, userRole);
    const permissions = await createPermissions(transaction);

    // Assign all permissions to sadmin role
    logger.info(`Assigning permissions to sadmin role...`);
    await sadminRole.setPermissions(permissions, { transaction });

    await createUser(transaction, company);

    await transaction.commit();
    logger.info("Setup completed successfully!");
    rl.close();
  } catch (err) {
    logger.error("Error occurred during setup:", err);
    await transaction.rollback();
    rl.close();
  }
}

main();
