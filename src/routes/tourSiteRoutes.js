const express = require("express");

const router = express.Router();

const touristicSite = require("../controllers/touristicSiteController");
const upload = require("../services/multer");

router.post(
  "/create",
  upload.uploadPropertyImages.array("siteImages", 20),
  touristicSite.createSiteAdminWithSite
);
router.get("/allsites", touristicSite.getAllTouristicSites);
router.get("/all", touristicSite.getAllSiteAdmins);
router.get("/:id", touristicSite.getSiteAdminById);
router.put("/update/:id", touristicSite.updateSiteAdmin);
router.delete("/delete/:id", touristicSite.deleteSiteAdmin);
router.get("/sites/:adminId", touristicSite.getSitesByAdmin);

module.exports = router;
