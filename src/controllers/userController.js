// userController.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

// Set the number of salt rounds for bcrypt
const saltRounds = 10;

// --- User CRUD Operations ---

/**
 * Registers a new user with the default 'TOURIST' role.
 * Hashes the password before storing it.
 * @route POST /api/users/register
 */
exports.registerUser = async (req, res) => {
  const { email, name, password, phoneNumber, profilePicture, role } = req.body;

  if (!email || !name || !password) {
    return res
      .status(400)
      .json({ error: "Email, name, and password are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    let newUser;
    if (role === "TOURIST") {
      newUser = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          phoneNumber: phoneNumber || null,
          profilePicture: profilePicture || null,
          role, // Default role for new registrations
        },
      });
    } else {
      newUser = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          phoneNumber: phoneNumber || null,
          profilePicture: profilePicture || null,
          role, // Allow role to be set if provided
        },
      });
    }
    // Exclude password from the response
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
      isOk: true,
    });
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target.includes("email")) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Could not register user." });
  }
};

/**
 * Retrieves all users, excluding their passwords.
 * @route GET /api/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        profilePicture: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Could not retrieve users." });
  }
};

/**
 * Retrieves a user by their ID, excluding the password and including related role data.
 * @route GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        touristGuides: true, // Include TouristGuide data if user is a guide
        siteAdmins: {
          // Include TouristicSiteAdmin data if user is a site admin
          include: { site: true }, // Also include the related TouristicSite for site admins
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        profilePicture: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        touristGuides: true,
        siteAdmins: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error(`Error fetching user with ID ${id}:`, error);
    res.status(500).json({ error: "Could not retrieve user." });
  }
};

/**
 * Updates an existing user's information.
 * Hashes a new password if provided.
 * @route PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, password, phoneNumber, profilePicture, role } = req.body; // Role update should be handled carefully, often requires admin privileges

  try {
    const userData = {};
    if (name) userData.name = name;
    if (email) userData.email = email;
    if (phoneNumber) userData.phoneNumber = phoneNumber;
    if (profilePicture) userData.profilePicture = profilePicture;
    if (role) userData.role = role; // Be cautious about allowing role updates via a simple endpoint, usually requires auth checks

    if (password) {
      userData.password = await bcrypt.hash(password, saltRounds);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        profilePicture: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target.includes("email")) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found." });
    }
    console.error(`Error updating user with ID ${id}:`, error);
    res.status(500).json({ error: "Could not update user." });
  }
};

/**
 * Deletes a user by their ID.
 * This operation will also trigger cascade deletes for related TouristGuide or TouristicSiteAdmin records
 * IF your Prisma schema has `onDelete: Cascade` configured for those relations.
 * If not, you'd need to handle deletions of related records explicitly within a transaction.
 * For this example, we assume proper `onDelete` configuration in the schema.
 * @route DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({
      where: { id },
    });
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({ error: "User not found." });
    }
    console.error(`Error deleting user with ID ${id}:`, error);
    res.status(500).json({ error: "Could not delete user." });
  }
};

// --- TouristGuide CRUD Operations ---

/**
 * Creates a new Tourist Guide.
 * This operation involves creating a User and then linking it to a TouristGuide profile in a transaction.
 * @route POST /api/guides
 */
exports.createTouristGuide = async (req, res) => {
  const {
    email,
    name,
    password,
    phoneNumber,
    profilePicture,
    bio,
    languages, // Expects an array, e.g., ["English", "French"]
    pricePerHour,
    availability, // Expects a JSON object/array
  } = req.body;

  if (
    !email ||
    !name ||
    !password ||
    !bio ||
    !languages ||
    pricePerHour === undefined ||
    !availability
  ) {
    return res
      .status(400)
      .json({ error: "Missing required fields for Tourist Guide creation." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          phoneNumber,
          profilePicture,
          role: "GUIDE", // Set role to GUIDE
        },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          profilePicture: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const newTouristGuide = await tx.touristGuide.create({
        data: {
          userId: newUser.id,
          bio,
          languages: languages, // Prisma handles JSON type directly if the input is valid
          pricePerHour: parseFloat(pricePerHour),
          availability: availability, // Prisma handles JSON type directly if the input is valid
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phoneNumber: true,
              profilePicture: true,
              role: true,
            },
          },
        },
      });
      return newTouristGuide;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target.includes("email")) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }
    console.error("Error creating Tourist Guide:", error);
    res.status(500).json({ error: "Could not create Tourist Guide." });
  }
};

/**
 * Retrieves all Tourist Guides with their associated user information.
 * @route GET /api/guides
 */
exports.getAllTouristGuides = async (req, res) => {
  try {
    const guides = await prisma.touristGuide.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phoneNumber: true,
            profilePicture: true,
            role: true,
          },
        },
      },
    });
    res.status(200).json(guides);
  } catch (error) {
    console.error("Error fetching tourist guides:", error);
    res.status(500).json({ error: "Could not retrieve tourist guides." });
  }
};

/**
 * Retrieves a single Tourist Guide by their ID, including associated user information.
 * @route GET /api/guides/:id
 */
exports.getTouristGuideById = async (req, res) => {
  const { id } = req.params;

  try {
    const guide = await prisma.touristGuide.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phoneNumber: true,
            profilePicture: true,
            role: true,
          },
        },
      },
    });

    if (!guide) {
      return res.status(404).json({ error: "Tourist Guide not found." });
    }
    res.status(200).json(guide);
  } catch (error) {
    console.error(`Error fetching tourist guide with ID ${id}:`, error);
    res.status(500).json({ error: "Could not retrieve tourist guide." });
  }
};

/**
 * Updates an existing Tourist Guide's information and optionally their associated user's details.
 * Uses a transaction if both guide and user data are updated.
 * @route PUT /api/guides/:id
 */
exports.updateTouristGuide = async (req, res) => {
  const { id } = req.params;
  const {
    bio,
    languages,
    pricePerHour,
    availability,
    // User fields that can be updated through the guide endpoint
    name,
    email,
    password,
    phoneNumber,
    profilePicture,
  } = req.body;

  try {
    const guideData = {};
    if (bio !== undefined) guideData.bio = bio;
    if (languages !== undefined) guideData.languages = languages;
    if (pricePerHour !== undefined)
      guideData.pricePerHour = parseFloat(pricePerHour);
    if (availability !== undefined) guideData.availability = availability;

    const userData = {};
    if (name !== undefined) userData.name = name;
    if (email !== undefined) userData.email = email;
    if (phoneNumber !== undefined) userData.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) userData.profilePicture = profilePicture;
    if (password !== undefined) {
      userData.password = await bcrypt.hash(password, saltRounds);
    }

    // Determine if we need a transaction
    const hasUserDataToUpdate = Object.keys(userData).length > 0;
    const hasGuideDataToUpdate = Object.keys(guideData).length > 0;

    let updatedGuide;

    if (hasUserDataToUpdate) {
      // Find the guide first to get the userId
      const existingGuide = await prisma.touristGuide.findUnique({
        where: { id },
      });
      if (!existingGuide) {
        return res.status(404).json({ error: "Tourist Guide not found." });
      }

      updatedGuide = await prisma.$transaction(async (tx) => {
        // Update user data
        const updatedUser = await tx.user.update({
          where: { id: existingGuide.userId },
          data: userData,
        });

        // Update guide data
        const guideUpdateResult = await tx.touristGuide.update({
          where: { id },
          data: guideData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                phoneNumber: true,
                profilePicture: true,
                role: true,
              },
            },
          },
        });
        return guideUpdateResult;
      });
    } else if (hasGuideDataToUpdate) {
      // Only guide data needs updating, no transaction needed for User
      updatedGuide = await prisma.touristGuide.update({
        where: { id },
        data: guideData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phoneNumber: true,
              profilePicture: true,
              role: true,
            },
          },
        },
      });
    } else {
      return res.status(400).json({ error: "No data provided for update." });
    }

    res.status(200).json(updatedGuide);
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Tourist Guide or related user not found." });
    }
    if (error.code === "P2002" && error.meta?.target.includes("email")) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }
    console.error(`Error updating tourist guide with ID ${id}:`, error);
    res.status(500).json({ error: "Could not update tourist guide." });
  }
};

/**
 * Deletes a Tourist Guide by their ID.
 * This function also allows for deleting the associated user or changing their role back to 'TOURIST'.
 * For simplicity, this example implements deleting both the guide record and the user record.
 * @route DELETE /api/guides/:id
 */
exports.deleteTouristGuide = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      // First, find the guide to get the userId
      const guideToDelete = await tx.touristGuide.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!guideToDelete) {
        throw new Error("Tourist Guide not found."); // Propagate to catch block
      }

      // Delete the TouristGuide record
      await tx.touristGuide.delete({
        where: { id },
      });

      // Optionally, delete the associated User record
      // Or update the user's role back to 'TOURIST' if you want to keep the user account
      await tx.user.delete({
        where: { id: guideToDelete.userId },
      });
      // Alternative:
      // await tx.user.update({
      //   where: { id: guideToDelete.userId },
      //   data: { role: 'TOURIST' },
      // });
    });

    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    if (error.message === "Tourist Guide not found.") {
      // Custom error from transaction
      return res.status(404).json({ error: error.message });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Tourist Guide or associated user not found." });
    }
    console.error(`Error deleting tourist guide with ID ${id}:`, error);
    res.status(500).json({ error: "Could not delete tourist guide." });
  }
};

// --- TouristicSiteAdmin CRUD Operations ---

/**
 * Creates a new Touristic Site Admin.
 * This operation involves creating a User and then linking it to a TouristicSiteAdmin profile in a transaction.
 * @route POST /api/site-admins
 */
exports.createTouristicSiteAdmin = async (req, res) => {
  const {
    email,
    name,
    password,
    phoneNumber,
    profilePicture,
    siteId, // Required to link the admin to a specific site
  } = req.body;

  if (!email || !name || !password || !siteId) {
    return res.status(400).json({
      error: "Missing required fields for Touristic Site Admin creation.",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          phoneNumber,
          profilePicture,
          role: "SITE_ADMIN", // Set role to SITE_ADMIN
        },
        select: {
          id: true,
          email: true,
          name: true,
          phoneNumber: true,
          profilePicture: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const newSiteAdmin = await tx.touristicSiteAdmin.create({
        data: {
          userId: newUser.id,
          siteId,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phoneNumber: true,
              profilePicture: true,
              role: true,
            },
          },
          site: true, // Include site details
        },
      });
      return newSiteAdmin;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.code === "P2002" && error.meta?.target.includes("email")) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }
    if (error.code === "P2025" && error.meta?.modelName === "TouristicSite") {
      return res
        .status(404)
        .json({ error: `Touristic Site with ID ${siteId} not found.` });
    }
    console.error("Error creating Touristic Site Admin:", error);
    res.status(500).json({ error: "Could not create Touristic Site Admin." });
  }
};

/**
 * Retrieves all Touristic Site Admins with their associated user and site information.
 * @route GET /api/site-admins
 */
exports.getAllTouristicSiteAdmins = async (req, res) => {
  try {
    const siteAdmins = await prisma.touristicSiteAdmin.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phoneNumber: true,
            profilePicture: true,
            role: true,
          },
        },
        site: true,
      },
    });
    res.status(200).json(siteAdmins);
  } catch (error) {
    console.error("Error fetching touristic site admins:", error);
    res
      .status(500)
      .json({ error: "Could not retrieve touristic site admins." });
  }
};

/**
 * Retrieves a single Touristic Site Admin by their ID, including associated user and site information.
 * @route GET /api/site-admins/:id
 */
exports.getTouristicSiteAdminById = async (req, res) => {
  const { id } = req.params;

  try {
    const siteAdmin = await prisma.touristicSiteAdmin.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phoneNumber: true,
            profilePicture: true,
            role: true,
          },
        },
        site: true,
      },
    });

    if (!siteAdmin) {
      return res.status(404).json({ error: "Touristic Site Admin not found." });
    }
    res.status(200).json(siteAdmin);
  } catch (error) {
    console.error(`Error fetching touristic site admin with ID ${id}:`, error);
    res.status(500).json({ error: "Could not retrieve touristic site admin." });
  }
};

/**
 * Updates an existing Touristic Site Admin's information and optionally their associated user's details.
 * Uses a transaction if both admin and user data are updated.
 * @route PUT /api/site-admins/:id
 */
exports.updateTouristicSiteAdmin = async (req, res) => {
  const { id } = req.params;
  const {
    siteId, // Can update the site the admin is linked to
    // User fields that can be updated through the site admin endpoint
    name,
    email,
    password,
    phoneNumber,
    profilePicture,
  } = req.body;

  try {
    const adminData = {};
    if (siteId !== undefined) adminData.siteId = siteId;

    const userData = {};
    if (name !== undefined) userData.name = name;
    if (email !== undefined) userData.email = email;
    if (phoneNumber !== undefined) userData.phoneNumber = phoneNumber;
    if (profilePicture !== undefined) userData.profilePicture = profilePicture;
    if (password !== undefined) {
      userData.password = await bcrypt.hash(password, saltRounds);
    }

    const hasUserDataToUpdate = Object.keys(userData).length > 0;
    const hasAdminDataToUpdate = Object.keys(adminData).length > 0;

    let updatedSiteAdmin;

    if (hasUserDataToUpdate) {
      // Find the admin first to get the userId
      const existingAdmin = await prisma.touristicSiteAdmin.findUnique({
        where: { id },
      });
      if (!existingAdmin) {
        return res
          .status(404)
          .json({ error: "Touristic Site Admin not found." });
      }

      updatedSiteAdmin = await prisma.$transaction(async (tx) => {
        // Update user data
        const updatedUser = await tx.user.update({
          where: { id: existingAdmin.userId },
          data: userData,
        });

        // Update admin data
        const adminUpdateResult = await tx.touristicSiteAdmin.update({
          where: { id },
          data: adminData,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                phoneNumber: true,
                profilePicture: true,
                role: true,
              },
            },
            site: true,
          },
        });
        return adminUpdateResult;
      });
    } else if (hasAdminDataToUpdate) {
      // Only admin data needs updating
      updatedSiteAdmin = await prisma.touristicSiteAdmin.update({
        where: { id },
        data: adminData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phoneNumber: true,
              profilePicture: true,
              role: true,
            },
          },
          site: true,
        },
      });
    } else {
      return res.status(400).json({ error: "No data provided for update." });
    }

    res.status(200).json(updatedSiteAdmin);
  } catch (error) {
    if (error.code === "P2025") {
      const modelName = error.meta?.modelName;
      if (modelName === "TouristicSite") {
        return res
          .status(404)
          .json({ error: `Touristic Site with ID ${siteId} not found.` });
      }
      return res
        .status(404)
        .json({ error: "Touristic Site Admin or related entities not found." });
    }
    if (error.code === "P2002" && error.meta?.target.includes("email")) {
      return res
        .status(409)
        .json({ error: "User with this email already exists." });
    }
    console.error(`Error updating touristic site admin with ID ${id}:`, error);
    res.status(500).json({ error: "Could not update touristic site admin." });
  }
};

/**
 * Deletes a Touristic Site Admin by their ID.
 * This function also allows for deleting the associated user.
 * For simplicity, this example implements deleting both the admin record and the user record.
 * @route DELETE /api/site-admins/:id
 */
exports.deleteTouristicSiteAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.$transaction(async (tx) => {
      // First, find the admin to get the userId
      const adminToDelete = await tx.touristicSiteAdmin.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!adminToDelete) {
        throw new Error("Touristic Site Admin not found."); // Propagate to catch block
      }

      // Delete the TouristicSiteAdmin record
      await tx.touristicSiteAdmin.delete({
        where: { id },
      });

      // Optionally, delete the associated User record
      // Or update the user's role back to 'TOURIST' if you want to keep the user account
      await tx.user.delete({
        where: { id: adminToDelete.userId },
      });
      // Alternative:
      // await tx.user.update({
      //   where: { id: adminToDelete.userId },
      //   data: { role: 'TOURIST' },
      // });
    });

    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    if (error.message === "Touristic Site Admin not found.") {
      // Custom error from transaction
      return res.status(404).json({ error: error.message });
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ error: "Touristic Site Admin or associated user not found." });
    }
    console.error(`Error deleting touristic site admin with ID ${id}:`, error);
    res.status(500).json({ error: "Could not delete touristic site admin." });
  }
};
