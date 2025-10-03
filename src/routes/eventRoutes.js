const express = require("express");

const router = express.Router();
const authController = require("../controllers/authController");
const eventController = require("../controllers/eventController");
const upload = require("../services/multerEvent");
router.post(
  "/create",
  upload.uploadPropertyImages.array("eventImages", 20),
  eventController.createEvent
);
router.get("/all", eventController.getAllEvents);
router.get("/siteadmin/events/:adminId", eventController.getSiteAdminEvents);
router.get("/:id", eventController.getEventById);
router.put("/update/:id", eventController.updateEvent);
router.delete("/delete/:id", eventController.deleteEvent);

module.exports = router;
