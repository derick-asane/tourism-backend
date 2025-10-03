const express = require("express");

const router = express.Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

router.post("/create", userController.registerUser);
router.get("/alluser", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.put("/update/:id", userController.updateUser);
router.delete("/delete/:id", userController.deleteUser);

router.post("/login", authController.Login);
module.exports = router;
