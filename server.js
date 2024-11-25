require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require('body-parser');
const cron = require('node-cron');  // Import node-cron for scheduled tasks
const path = require('path');

const authRoutes = require("./routes/authRoutes"); // Import auth routes
const { authenticateUser } = require("./middlewares/authMiddleware"); // Import auth middleware
const profileRoutes = require("./routes/profileRoutes");
const connexionRoutes = require('./routes/connexionRoutes'); // Import the connexion routes
const messageRoutes = require('./routes/messages'); // Import the message routes
const User = require('./models/User'); // Import User model to access the database
const WelcomePageRoutes = require("./routes/welcomepage");

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Parse JSON requests


mongoose.set('strictQuery', true);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.log("Failed to connect to MongoDB:", error));


app.use("/api/manage-welcome-page", WelcomePageRoutes);

// Routes
app.use("/api/auth", authRoutes); // Public routes for registration and login
app.use("/api/profile", profileRoutes);
app.use('/api', connexionRoutes);
app.use('/api/messages', messageRoutes);

// Protected routes example (these will require authentication)
app.get("/api/protected", authenticateUser, (req, res) => {
  res.json({ message: `Welcome, ${req.user.name}` });
});



// Cron job setup to delete unverified users after 1 hour
cron.schedule('0 * * * *', async () => {
  try {
    // Find users who are unverified and created more than 1 hour ago
    const usersToDelete = await User.find({
      isVerified: false,
      createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }  // 2 minutes ago
    });

    if (usersToDelete.length > 0) {
      // Delete unverified users
      await User.deleteMany({ _id: { $in: usersToDelete.map(user => user._id) } });
      console.log(`${usersToDelete.length} unverified user(s) deleted.`);
    }
  } catch (error) {
    console.error("Error cleaning up unverified users:", error);
  }
});

// Server setup
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
