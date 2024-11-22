require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes"); // Import auth routes
const { authenticateUser } = require("./middlewares/authMiddleware"); // Import auth middleware
const friendRoutes = require("./routes/friendRoutes");
const profileRoutes = require("./routes/profileRoutes");
const connexionRoutes = require('./routes/connexionRoutes'); // Import the connexion routes

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.log("Failed to connect to MongoDB:", error));

// Routes
app.use("/api/auth", authRoutes); // Public routes for registration and login
app.use("/api/friends", friendRoutes);
app.use("/api/profile", profileRoutes);
app.use('/api', connexionRoutes);


// Protected routes example (these will require authentication)
app.get("/api/protected", authenticateUser, (req, res) => {
  res.json({ message: `Welcome, ${req.user.name}` });
});

// Server setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
