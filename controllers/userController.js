const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { queryRunner } = require("../helpers/queryRunner");

const JWT_SECRET = process.env.JWT_SECRET || "1dikjsaciwndvc";

// ###################### SignUp (Anyone can create account) #######################################
exports.signUp = async function (req, res) {
  try {
    const { name, email, password, role } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Default role = "user" agar role na bheja jaye
    const userRole = role && ["admin", "user"].includes(role) ? role : "user";

    // Check if user already exists
    const [existingUser] = await queryRunner("SELECT id FROM user WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Hash password and insert user
    const hashPassword = await bcrypt.hash(password, 10);
    const insertQuery = `INSERT INTO user (name, email, password, role) VALUES (?,?,?,?)`;
    const [result] = await queryRunner(insertQuery, [name, email, hashPassword, userRole]);

    return res.status(201).json({
      message: "User registered successfully",
      id: result.insertId,
      role: userRole,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ###################### Login (Admin or User) #######################################
exports.signIn = async function (req, res) {
  try {
    const { email, password } = req.body;

    const [rows] = await queryRunner(
      `SELECT id, name, email, password, role, status FROM user WHERE email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Invalid email or password" });
    }

    const user = rows[0];
    
    // Check if user is blocked
    if (user.status === 'blocked') {
      return res.status(403).json({ message: "Your account has been blocked. Please contact administrator." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      token,
      message: "Login successful",
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [rows] = await queryRunner(
      "SELECT id, name, email, role FROM user WHERE id = ?",
      [req.user.id] // now this will work
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
// Add these functions to your existing userController.js file

// ###################### Get All Users (Admin only) #######################################
exports.getAllUsers = async function (req, res) {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const [rows] = await queryRunner(
      "SELECT id, name, email, role, status, created_at FROM user ORDER BY created_at DESC",
      []
    );

    return res.status(200).json({
      message: "Users fetched successfully",
      users: rows,
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// ###################### Change User Password (Admin only) #######################################
exports.changeUserPassword = async function (req, res) {
  try {
    const { userId, newPassword } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Validate inputs
    if (!userId || !newPassword) {
      return res.status(400).json({ message: "User ID and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user exists
    const [userCheck] = await queryRunner("SELECT id FROM user WHERE id = ?", [userId]);
    if (userCheck.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Hash new password and update
    const hashPassword = await bcrypt.hash(newPassword, 10);
    await queryRunner("UPDATE user SET password = ? WHERE id = ?", [hashPassword, userId]);

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


// ###################### Toggle User Status (Admin only) #######################################
exports.toggleUserStatus = async function (req, res) {
  try {
    const { userId } = req.params;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    // Check if user exists and get current status
    const [userCheck] = await queryRunner("SELECT id, status FROM user WHERE id = ?", [userId]);
    if (userCheck.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentStatus = userCheck[0].status || 'active';
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';

    // Update user status
    await queryRunner("UPDATE user SET status = ? WHERE id = ?", [newStatus, userId]);

    return res.status(200).json({
      message: `User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully`,
      status: newStatus
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
