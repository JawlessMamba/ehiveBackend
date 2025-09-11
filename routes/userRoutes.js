const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticate } = require("../middleware/authenticate");

router.post("/signup", userController.signUp);
router.post("/signin", userController.signIn);
router.get("/getuser", authenticate, userController.getCurrentUser);

// ADMIN ROUTES
router.get("/all", authenticate, userController.getAllUsers);
router.put("/change-password", authenticate, userController.changeUserPassword);
router.patch("/toggle-status/:userId", authenticate, userController.toggleUserStatus);  // NEW

module.exports = router;