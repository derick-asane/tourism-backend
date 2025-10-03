const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*", // Adjust this in production to restrict to your frontend domain
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(helmet());
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    // Set the Cross-Origin-Resource-Policy header for images to 'cross-origin'
    // This is the direct solution for the ERR_BLOCKED_BY_RESPONSE error
    setHeaders: (res, path, stat) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Test if static files are being served
app.get("/test-image", (req, res) => {
  const imagePath = path.join(
    __dirname,
    "uploads/events/eventImages_1759072979502_924113441.jpeg"
  );

  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({
      status: false,
      message: "Image file not found at path",
      path: imagePath,
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "realestate API is running",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

try {
  //
  app.use("/tour-site", require("./routes/tourSiteRoutes"));
  console.log("Users route loaded");
  app.use("/users", require("./routes/userRoutes"));
  console.log("users routes loaded");
  app.use("/events", require("./routes/eventRoutes"));
  console.log("events routes loaded");
  //   app.use("/favorite", require("./routes/favoriteRouter"));
  //   console.log("Favorite routes loaded");
} catch (err) {
  console.error("Error loading user routes:", err.message);
  console.error("Stack:", err.stack);
  process.exit(1); // Exit if routes can't be loaded
}

// 404 handle
app.use("*", (req, res) => {
  res.status(400).json({
    status: false,
    message: "route not found",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  const message =
    statusCode === 500
      ? "internal server error"
      : err.message || "something went wrong";

  res.status(500).json({
    status: false,
    method: req.method,
    message: message,
    status: statusCode,
  });
});

// CRITICAL: Process-level error handlers to prevent crashes
process.on("unhandledRejection", (reason, promise) => {
  console.error("=== UNHANDLED REJECTION ===");
  console.error("Promise:", promise);
  console.error("Reason:", reason);
  // DON'T exit the process - just log it
});

process.on("uncaughtException", (error) => {
  console.error("=== UNCAUGHT EXCEPTION ===");
  console.error("Error:", error);
  // DON'T exit the process - just log it
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RealEstate server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
  });
});
