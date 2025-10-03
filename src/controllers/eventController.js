// --- Enhanced Event Controller Functions ---
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
/**
 * Helper function to get web-accessible URL for uploaded image
 * @param {string} filename - The filename from multer
 * @returns {string} - Web-accessible URL
 */
const getImageUrl = (filename) => {
  // Assuming your multer saves files to 'uploads/events/' directory
  // and they're served statically from '/uploads/events/' route
  return `/uploads/events/${filename}`;
};

/**
 * Helper function to get file system path from web URL
 * @param {string} url - The web URL of the image
 * @returns {string} - File system path
 */
const getFilePath = (url) => {
  // Extract filename from URL and construct full path
  const filename = path.basename(url);
  return path.join(__dirname, "..", "uploads", "events", filename);
};

/**
 * Helper function to delete a file
 * @param {string} filePath - Path to the file to delete
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`File deleted: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
  }
};

/**
 * Creates a new event.
 * Expects event details in req.body and uploaded image files in req.files (from Multer).
 * Required role: SITE_ADMIN or GUIDE (based on your schema, siteAdminId or guideId must be present)
 */
exports.createEvent = async (req, res) => {
  const {
    title,
    description,
    price,
    duration,
    maxGroupSize,
    touristicSiteId,
    siteAdminId, // Optional, but expected for SiteAdmin created events
    guideId, // Optional, but expected for Guide created events
  } = req.body;

  // Multer populates req.files for upload.array()
  const files = req.files || [];

  // Enhanced validation
  const errors = [];

  if (!title || title.trim().length === 0) errors.push("Title is required");
  if (!description || description.trim().length === 0)
    errors.push("Description is required");
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)
    errors.push("Valid price is required");
  if (!duration || isNaN(parseInt(duration)) || parseInt(duration) <= 0)
    errors.push("Valid duration is required");
  if (
    !maxGroupSize ||
    isNaN(parseInt(maxGroupSize)) ||
    parseInt(maxGroupSize) <= 0
  )
    errors.push("Valid max group size is required");
  if (!touristicSiteId || touristicSiteId.trim().length === 0)
    errors.push("Touristic site ID is required");

  // Ensure either siteAdminId or guideId is present
  if (!siteAdminId && !guideId) {
    errors.push("Either site admin ID or guide ID is required");
  }

  if (errors.length > 0) {
    // Clean up uploaded files if validation fails
    if (files.length > 0) {
      files.forEach((file) => deleteFile(file.path));
    }

    return res.status(400).json({
      isOk: false,
      message: "Validation failed",
      errors,
    });
  }

  try {
    // Verify touristic site exists
    const touristicSite = await prisma.touristicSite.findUnique({
      where: { id: touristicSiteId },
    });

    if (!touristicSite) {
      // Clean up uploaded files
      if (files.length > 0) {
        files.forEach((file) => deleteFile(file.path));
      }

      return res.status(404).json({
        isOk: false,
        message: "Touristic site not found",
      });
    }

    // Verify site admin exists if provided
    if (siteAdminId) {
      const siteAdmin = await prisma.touristicSiteAdmin.findUnique({
        where: { id: siteAdminId },
      });

      if (!siteAdmin) {
        if (files.length > 0) {
          files.forEach((file) => deleteFile(file.path));
        }

        return res.status(404).json({
          isOk: false,
          message: "Site admin not found",
        });
      }
    }

    // Verify guide exists if provided
    if (guideId) {
      const guide = await prisma.touristGuide.findUnique({
        where: { id: guideId },
      });

      if (!guide) {
        if (files.length > 0) {
          files.forEach((file) => deleteFile(file.path));
        }

        return res.status(404).json({
          isOk: false,
          message: "Guide not found",
        });
      }
    }

    const newEvent = await prisma.event.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        duration: parseInt(duration, 10),
        maxGroupSize: parseInt(maxGroupSize, 10),
        touristicSite: { connect: { id: touristicSiteId } },
        ...(siteAdminId && { siteAdmin: { connect: { id: siteAdminId } } }),
        ...(guideId && { guide: { connect: { id: guideId } } }),
        ...(files.length > 0 && {
          images: {
            create: files.map((file) => ({
              url: getImageUrl(file.filename), // Store web-accessible path
            })),
          },
        }),
      },
      include: {
        images: true,
        touristicSite: { select: { name: true, location: true } },
        siteAdmin: { select: { id: true, user: { select: { name: true } } } },
        guide: { select: { id: true, user: { select: { name: true } } } },
      },
    });

    res.status(201).json({
      isOk: true,
      data: newEvent,
      message: "Event created successfully.",
    });
  } catch (error) {
    console.error("Error creating event:", error);

    // If event creation fails, clean up any uploaded files
    if (files.length > 0) {
      files.forEach((file) => deleteFile(file.path));
    }

    res.status(500).json({
      isOk: false,
      message: "Failed to create event",
      error: error.message,
    });
  }
};

/**
 * Retrieves all events with optional filtering and pagination.
 * Query parameters: page, limit, search, status, siteId, adminId, guideId
 */
exports.getAllEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      siteId,
      adminId,
      guideId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for filtering
    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { touristicSite: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (siteId) where.touristicSiteId = siteId;
    if (adminId) where.siteAdminId = adminId;
    if (guideId) where.guideId = guideId;

    // Get total count for pagination
    const totalEvents = await prisma.event.count({ where });

    const events = await prisma.event.findMany({
      where,
      include: {
        images: {
          select: { id: true, url: true },
        },
        touristicSite: {
          select: { id: true, name: true, location: true },
        },
        bookings: {
          select: {
            id: true,
            status: true,
            numberOfPeople: true,
            tourist: { select: { id: true, name: true } },
          },
        },
        siteAdmin: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
          },
        },
        guide: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take,
    });

    // Format events for frontend compatibility
    const formattedEvents = events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }));

    const totalPages = Math.ceil(totalEvents / take);

    res.status(200).json({
      isOk: true,
      events: formattedEvents,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalEvents,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1,
      },
      message: "Events fetched successfully.",
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      isOk: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
};

/**
 * Retrieves a single event by ID.
 */
exports.getEventById = async (req, res) => {
  const { id } = req.params;

  // Validate ID format (assuming UUID)
  if (!id || id.trim().length === 0) {
    return res.status(400).json({
      isOk: false,
      message: "Event ID is required",
    });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        images: true,
        touristicSite: {
          select: {
            id: true,
            name: true,
            location: true,
            description: true,
            openingHours: true,
            entryFee: true,
          },
        },
        bookings: {
          include: {
            tourist: { select: { id: true, name: true, email: true } },
            payment: { select: { id: true, status: true, amount: true } },
          },
        },
        siteAdmin: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        guide: {
          select: {
            id: true,
            user: { select: { id: true, name: true, email: true } },
            rating: true,
            pricePerHour: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        isOk: false,
        message: "Event not found.",
      });
    }

    // Format dates
    const formattedEvent = {
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };

    res.status(200).json({
      isOk: true,
      data: formattedEvent,
      message: "Event fetched successfully.",
    });
  } catch (error) {
    console.error(`Error fetching event with ID ${id}:`, error);
    res.status(500).json({
      isOk: false,
      message: "Failed to fetch event",
      error: error.message,
    });
  }
};

exports.getSiteAdminEvents = async (req, res) => {
  const { adminId } = req.params;
  if (!adminId || adminId.trim().length === 0) {
    return res.status(400).json({
      isOk: false,
      message: "Site admin ID is required",
    });
  }
  try {
    const events = await prisma.event.findMany({
      where: { siteAdminId: String(adminId) },
      include: {
        images: true,
        touristicSite: { select: { id: true, name: true, location: true } },
        siteAdmin: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
          },
        },
        guide: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
          },
        },
        bookings: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const formattedEvents = events.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    }));
    res.status(200).json({
      isOk: true,
      events: formattedEvents,
      message: "Site admin events fetched successfully.",
    });
  } catch (error) {
    console.error(
      `Error fetching events for site admin with ID ${adminId}:`,
      error
    );
    res.status(500).json({
      isOk: false,
      message: "Failed to fetch site admin events",
      error: error.message,
    });
  }
};

/**
 * Updates an existing event.
 * Expects event ID in req.params, updated details in req.body,
 * new image files in req.files, and IDs of images to remove in req.body.imagesToRemove.
 */
exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    price,
    duration,
    maxGroupSize,
    touristicSiteId,
    siteAdminId,
    guideId,
    imagesToRemove, // JSON string of array of image IDs to delete
  } = req.body;

  const files = req.files || [];

  // Validate ID
  if (!id || id.trim().length === 0) {
    return res.status(400).json({
      isOk: false,
      message: "Event ID is required",
    });
  }

  try {
    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!existingEvent) {
      // Clean up uploaded files
      if (files.length > 0) {
        files.forEach((file) => deleteFile(file.path));
      }

      return res.status(404).json({
        isOk: false,
        message: "Event not found",
      });
    }

    // Validate updated fields
    const errors = [];

    if (title !== undefined && (!title || title.trim().length === 0)) {
      errors.push("Title cannot be empty");
    }
    if (
      description !== undefined &&
      (!description || description.trim().length === 0)
    ) {
      errors.push("Description cannot be empty");
    }
    if (
      price !== undefined &&
      (isNaN(parseFloat(price)) || parseFloat(price) <= 0)
    ) {
      errors.push("Valid price is required");
    }
    if (
      duration !== undefined &&
      (isNaN(parseInt(duration)) || parseInt(duration) <= 0)
    ) {
      errors.push("Valid duration is required");
    }
    if (
      maxGroupSize !== undefined &&
      (isNaN(parseInt(maxGroupSize)) || parseInt(maxGroupSize) <= 0)
    ) {
      errors.push("Valid max group size is required");
    }

    if (errors.length > 0) {
      if (files.length > 0) {
        files.forEach((file) => deleteFile(file.path));
      }

      return res.status(400).json({
        isOk: false,
        message: "Validation failed",
        errors,
      });
    }

    // Parse images to remove
    const parsedImagesToRemove = imagesToRemove
      ? JSON.parse(imagesToRemove)
      : [];

    // Delete specified images from DB and file system
    if (parsedImagesToRemove.length > 0) {
      const imagesToDelete = await prisma.eventImage.findMany({
        where: { id: { in: parsedImagesToRemove }, eventId: id },
      });

      for (const img of imagesToDelete) {
        deleteFile(getFilePath(img.url));
      }

      await prisma.eventImage.deleteMany({
        where: { id: { in: parsedImagesToRemove }, eventId: id },
      });
    }

    // Prepare data for updating the event
    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (duration !== undefined) updateData.duration = parseInt(duration, 10);
    if (maxGroupSize !== undefined)
      updateData.maxGroupSize = parseInt(maxGroupSize, 10);

    if (touristicSiteId) {
      // Verify site exists
      const site = await prisma.touristicSite.findUnique({
        where: { id: touristicSiteId },
      });

      if (!site) {
        if (files.length > 0) {
          files.forEach((file) => deleteFile(file.path));
        }

        return res.status(404).json({
          isOk: false,
          message: "Touristic site not found",
        });
      }

      updateData.touristicSite = { connect: { id: touristicSiteId } };
    }

    if (siteAdminId !== undefined) {
      updateData.siteAdmin = siteAdminId
        ? { connect: { id: siteAdminId } }
        : { disconnect: true };
    }

    if (guideId !== undefined) {
      updateData.guide = guideId
        ? { connect: { id: guideId } }
        : { disconnect: true };
    }

    // Add new images
    if (files.length > 0) {
      updateData.images = {
        create: files.map((file) => ({
          url: getImageUrl(file.filename),
        })),
      };
    }

    // Perform the update
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        images: true,
        touristicSite: { select: { id: true, name: true, location: true } },
        siteAdmin: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
          },
        },
        guide: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(200).json({
      isOk: true,
      data: {
        ...updatedEvent,
        createdAt: updatedEvent.createdAt.toISOString(),
        updatedAt: updatedEvent.updatedAt.toISOString(),
      },
      message: "Event updated successfully.",
    });
  } catch (error) {
    console.error(`Error updating event with ID ${id}:`, error);

    // If update fails, clean up any newly uploaded files
    if (files.length > 0) {
      files.forEach((file) => deleteFile(file.path));
    }

    res.status(500).json({
      isOk: false,
      message: "Failed to update event",
      error: error.message,
    });
  }
};

/**
 * Deletes an event by ID.
 * All associated images will also be deleted from the database and file system.
 */
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  // Validate ID
  if (!id || id.trim().length === 0) {
    return res.status(400).json({
      isOk: false,
      message: "Event ID is required",
    });
  }

  try {
    // Check if event exists and has active bookings
    const eventWithBookings = await prisma.event.findUnique({
      where: { id },
      include: {
        bookings: {
          where: {
            status: {
              in: ["PENDING", "CONFIRMED"],
            },
          },
        },
        images: true,
      },
    });

    if (!eventWithBookings) {
      return res.status(404).json({
        isOk: false,
        message: "Event not found",
      });
    }

    // Check for active bookings
    if (eventWithBookings.bookings.length > 0) {
      return res.status(400).json({
        isOk: false,
        message: `Cannot delete event with ${eventWithBookings.bookings.length} active booking(s). Please cancel all bookings first.`,
        activeBookings: eventWithBookings.bookings.length,
      });
    }

    // Delete associated images from file system
    for (const img of eventWithBookings.images) {
      deleteFile(getFileSystemPathFromWebPath(img.url));
    }

    // Delete the event (cascade will handle related records)
    await prisma.event.delete({
      where: { id },
    });

    res.status(200).json({
      isOk: true,
      message: "Event deleted successfully.",
    });
  } catch (error) {
    console.error(`Error deleting event with ID ${id}:`, error);
    res.status(500).json({
      isOk: false,
      message: "Failed to delete event",
      error: error.message,
    });
  }
};

/**
 * Get all bookings for a specific event
 */
exports.getEventBookings = async (req, res) => {
  const { id } = req.params; // Event ID
  const { status, page = 1, limit = 10 } = req.query;

  if (!id || id.trim().length === 0) {
    return res.status(400).json({
      isOk: false,
      message: "Event ID is required",
    });
  }

  try {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = { eventId: id };
    if (status) where.status = status;

    // Get total count
    const totalBookings = await prisma.booking.count({ where });

    const eventWithBookings = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        price: true,
        duration: true,
        maxGroupSize: true,
        bookings: {
          where,
          include: {
            tourist: {
              select: { id: true, name: true, email: true, phoneNumber: true },
            },
            guide: {
              select: {
                id: true,
                user: { select: { id: true, name: true } },
              },
            },
            payment: {
              select: { id: true, status: true, amount: true, method: true },
            },
            review: {
              select: { id: true, rating: true, comment: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take,
        },
      },
    });

    if (!eventWithBookings) {
      return res.status(404).json({
        isOk: false,
        message: "Event not found.",
      });
    }

    const totalPages = Math.ceil(totalBookings / take);

    res.status(200).json({
      isOk: true,
      data: {
        event: {
          id: eventWithBookings.id,
          title: eventWithBookings.title,
          price: eventWithBookings.price,
          duration: eventWithBookings.duration,
          maxGroupSize: eventWithBookings.maxGroupSize,
        },
        bookings: eventWithBookings.bookings,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalBookings,
        hasNextPage: parseInt(page) < totalPages,
        hasPreviousPage: parseInt(page) > 1,
      },
      message: "Event bookings fetched successfully.",
    });
  } catch (error) {
    console.error(`Error fetching bookings for event ${id}:`, error);
    res.status(500).json({
      isOk: false,
      message: "Failed to fetch event bookings",
      error: error.message,
    });
  }
};
