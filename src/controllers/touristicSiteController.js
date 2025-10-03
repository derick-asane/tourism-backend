// controllers/siteAdminController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

// CREATE - Site Admin with Touristic Site
exports.createSiteAdminWithSite = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      siteName,
      siteDescription,
      siteLocation,
      siteLatitude,
      siteLongitude,
      siteOpeningHours,
      siteEntryFee,
      siteCategory,
    } = req.body;

    console.log("Request body:", req.body);
    console.log("Uploaded files:", req.files);

    // Validate required fields
    if (!name || !email || !password || !siteName || !siteLocation) {
      return res.status(400).json({
        error:
          "Missing required fields: name, email, password, siteName, siteLocation",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Process uploaded images
    const siteImages = [];
    if (req.files && req.files) {
      const files = Array.isArray(req.files) ? req.files : [req.files];

      for (const file of files) {
        siteImages.push({
          url: `/uploads/sites/${file.filename || file.name}`,
        });
      }
    }

    // Create transaction
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Create User
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phoneNumber: phoneNumber || null,
          role: "SITE_ADMIN",
        },
      });

      // 2. Create TouristicSite
      const touristicSite = await prisma.touristicSite.create({
        data: {
          name: siteName,
          description: siteDescription || "",
          location: siteLocation,
          latitude: siteLatitude ? parseFloat(siteLatitude) : null,
          longitude: siteLongitude ? parseFloat(siteLongitude) : null,
          openingHours: siteOpeningHours || "",
          entryFee: siteEntryFee ? parseFloat(siteEntryFee) : null,
          category: siteCategory || "",
        },
      });

      // 3. Create TouristicSiteAdmin (linking user and site)
      const siteAdmin = await prisma.touristicSiteAdmin.create({
        data: {
          userId: user.id,
          siteId: touristicSite.id,
        },
      });

      // 4. Create TouristicSiteImages if any
      if (siteImages.length > 0) {
        await prisma.touristicSiteImage.createMany({
          data: siteImages.map((image) => ({
            url: image.url,
            touristicSiteId: touristicSite.id,
          })),
        });
      }

      return { user, touristicSite, siteAdmin };
    });

    // Return success response (excluding password)
    const { password: _, ...userWithoutPassword } = result.user;

    res.status(201).json({
      message: "Site admin and touristic site created successfully",
      data: {
        user: userWithoutPassword,
        site: result.touristicSite,
      },
    });
  } catch (error) {
    console.error("Error creating site admin:", error);
    res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// READ - Get all Site Admins with their sites
exports.getAllSiteAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const siteAdmins = await prisma.touristicSiteAdmin.findMany({
      skip,
      take: parseInt(limit),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
          },
        },
        site: {
          include: {
            images: {
              take: 1, // Get only first image for thumbnail
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.touristicSiteAdmin.count();

    res.status(200).json({
      data: siteAdmins,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching site admins:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// READ - Get single Site Admin by ID
exports.getSiteAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const siteAdmin = await prisma.touristicSiteAdmin.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        site: {
          include: {
            images: true,
            favorites: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        siteEvents: {
          include: {
            touristicSite: {
              select: {
                name: true,
              },
            },
            bookings: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!siteAdmin) {
      return res.status(404).json({
        error: "Site admin not found",
      });
    }

    res.status(200).json({
      data: siteAdmin,
    });
  } catch (error) {
    console.error("Error fetching site admin:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// UPDATE - Update Site Admin and associated data
exports.updateSiteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      phoneNumber,
      siteName,
      siteDescription,
      siteLocation,
      siteLatitude,
      siteLongitude,
      siteOpeningHours,
      siteEntryFee,
      siteCategory,
    } = req.body;

    // Check if site admin exists
    const existingSiteAdmin = await prisma.touristicSiteAdmin.findUnique({
      where: { id },
      include: { user: true, site: true },
    });

    if (!existingSiteAdmin) {
      return res.status(404).json({
        error: "Site admin not found",
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== existingSiteAdmin.user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(409).json({
          error: "Email already taken by another user",
        });
      }
    }

    // Process new images if any
    const newSiteImages = [];
    if (req.files && req.files.siteImages) {
      const files = Array.isArray(req.files.siteImages)
        ? req.files.siteImages
        : [req.files.siteImages];

      for (const file of files) {
        newSiteImages.push({
          url: `/uploads/sites/${file.filename || file.name}`,
          touristicSiteId: existingSiteAdmin.siteId,
        });
      }
    }

    // Update transaction
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Update User
      const user = await prisma.user.update({
        where: { id: existingSiteAdmin.userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(phoneNumber !== undefined && { phoneNumber }),
        },
      });

      // 2. Update TouristicSite
      const touristicSite = await prisma.touristicSite.update({
        where: { id: existingSiteAdmin.siteId },
        data: {
          ...(siteName && { name: siteName }),
          ...(siteDescription !== undefined && {
            description: siteDescription,
          }),
          ...(siteLocation && { location: siteLocation }),
          ...(siteLatitude !== undefined && {
            latitude: siteLatitude ? parseFloat(siteLatitude) : null,
          }),
          ...(siteLongitude !== undefined && {
            longitude: siteLongitude ? parseFloat(siteLongitude) : null,
          }),
          ...(siteOpeningHours !== undefined && {
            openingHours: siteOpeningHours,
          }),
          ...(siteEntryFee !== undefined && {
            entryFee: siteEntryFee ? parseFloat(siteEntryFee) : null,
          }),
          ...(siteCategory !== undefined && { category: siteCategory }),
        },
      });

      // 3. Add new images if any
      if (newSiteImages.length > 0) {
        await prisma.touristicSiteImage.createMany({
          data: newSiteImages,
        });
      }

      return { user, touristicSite };
    });

    // Return updated data
    const { password: _, ...userWithoutPassword } = result.user;

    res.status(200).json({
      message: "Site admin updated successfully",
      data: {
        user: userWithoutPassword,
        site: result.touristicSite,
      },
    });
  } catch (error) {
    console.error("Error updating site admin:", error);
    res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

//

exports.getAllTouristicSites = async (req, res) => {
  try {
    const sites = await prisma.touristicSite.findMany({
      include: {
        images: true,
        favorites: true,
        events: true,
      },
    });
    res.status(200).json({
      sites,
      message: "Touristic sites fetched successfully...",
      success: true,
    });
  } catch (err) {
    console.log(`server errror${err.message}`);
    return res.status(500).json({
      message: `Internal server error: ${err.message}`,
      success: false,
    });
  }
};

// DELETE - Delete Site Admin and associated data (with caution)
exports.deleteSiteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if site admin exists
    const existingSiteAdmin = await prisma.touristicSiteAdmin.findUnique({
      where: { id },
      include: {
        site: {
          include: {
            events: {
              include: {
                bookings: true,
              },
            },
          },
        },
      },
    });

    if (!existingSiteAdmin) {
      return res.status(404).json({
        error: "Site admin not found",
      });
    }

    // Check if there are associated events with bookings
    const hasBookings = existingSiteAdmin.site.events.some(
      (event) => event.bookings && event.bookings.length > 0
    );

    if (hasBookings) {
      return res.status(400).json({
        error:
          "Cannot delete site admin with active bookings. Please handle the bookings first.",
      });
    }

    // Delete transaction
    await prisma.$transaction(async (prisma) => {
      // 1. Delete site events first (cascade should handle this but being explicit)
      await prisma.event.deleteMany({
        where: { siteAdminId: id },
      });

      // 2. Delete site images
      await prisma.touristicSiteImage.deleteMany({
        where: { touristicSiteId: existingSiteAdmin.siteId },
      });

      // 3. Delete site favorites
      await prisma.favorite.deleteMany({
        where: { touristicSiteId: existingSiteAdmin.siteId },
      });

      // 4. Delete TouristicSiteAdmin
      await prisma.touristicSiteAdmin.delete({
        where: { id },
      });

      // 5. Delete TouristicSite
      await prisma.touristicSite.delete({
        where: { id: existingSiteAdmin.siteId },
      });

      // 6. Delete User (this will cascade delete related records)
      await prisma.user.delete({
        where: { id: existingSiteAdmin.userId },
      });
    });

    res.status(200).json({
      message: "Site admin and all associated data deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting site admin:", error);
    res.status(500).json({
      error: "Internal server error",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// READ - Get all sites for a specific site admin
exports.getSitesByAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const sites = await prisma.touristicSite.findMany({
      where: {
        admin: {
          userId: adminId,
        },
      },
      skip,
      take: parseInt(limit),
      include: {
        images: true,
        favorites: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        events: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.touristicSite.count({
      where: {
        admin: {
          userId: adminId,
        },
      },
    });

    res.status(200).json({
      data: sites,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching sites by admin:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};
