// controllers/authController.js

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User"); // If the export is default
const Profile = require('../models/Profile'); // Adjust the path to your Profile model if necessary


const baseUrl = process.env.BASE_URL || 'http://localhost:5000';


// Helper function to hash passwords
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

// Helper function to send verification email
const sendVerificationEmail = async (user, token) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;
  const message = `Hello ${user.name},\n\nPlease verify your email by clicking on the following link:\n${verificationUrl}\n\nThank you!`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Email Verification",
    text: message,
  });
};

// Helper function to send email
const sendEmail = async (email, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    text,
  });
};

// Request password reset
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  // Generate reset token
  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

  // Send reset email
  const resetUrl = `${baseUrl}/api/auth/reset-password?token=${resetToken}`;
  const message = `Hello,\n\nPlease reset your password by clicking the following link:\n${resetUrl}\n\nThank you!`;
  await sendEmail(user.email, "Password Reset Request", message);

  res.status(200).json({
    message: "Password reset email sent successfully."
  });
};

// Reset password
const resetPassword = async (req, res) => {
  const { token } = req.query;
  const { password, confirmPassword } = req.body;
  if (!token) {
    return res.status(400).json({ message: 'Token is missing' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id }); // Use decoded.id to find the user
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update the password
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.status(200).json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// Serve the reset password page (HTML form)
const resetPasswordPage = (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Invalid or missing token');
  }

  res.send(`
    <html>
      <head>
        <title>Reset Password</title>
      </head>
      <body>
        <h1>Reset Your Password</h1>
        <form action="/api/auth/reset-password?token=${token}" method="POST">
          <input type="hidden" name="token" value="${token}" />
          <label for="password">New Password:</label>
          <input type="password" name="password" required /><br /><br />
          <label for="confirmPassword">Confirm Password:</label>
          <input type="password" name="confirmPassword" required /><br /><br />
          <button type="submit">Reset Password</button>
        </form>
      </body>
    </html>
  `);
};

// Check if email is already registered
const checkDuplicateEmail = async (email) => {
  console.log('Checking email:', email);  // For debugging
  const user = await User.findOne({ email });
  return user !== null; // Returns true if the email already exists
};


const register = async (req, res) => {
  try {
    const { name, email, role, college, gender, interests, educationalBackground, portfolioLinks, password } = req.body;

    console.log("Received request data:", req.body);  // Log incoming request data

    if (!name || !email || !role || !college || !gender || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Check if email already exists
    const emailExists = await checkDuplicateEmail(email);
    if (emailExists) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user object with `isVerified: false` and `createdAt` timestamp
    const newUser = new User({
      name,
      email,
      role,
      college,
      gender,
      password: hashedPassword,
      isVerified: false,
      createdAt: new Date()  // Save the time the user was created
    });

    // Save the user temporarily (unverified)
    await newUser.save();
    console.log("User saved temporarily:", newUser);

    // Generate email verification token
    const emailToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    try {
      // Send verification email
      await sendVerificationEmail(newUser, emailToken);
      console.log("Verification email sent.");

      return res.status(201).json({ message: "Registration successful! Please verify your email." });
    } catch (emailError) {
      console.error("Error during email verification:", emailError);
      return res.status(400).json({ message: emailError.message || "Error sending verification email." });
    }

  } catch (error) {
    console.error("Error during registration:", error); 
    return res.status(500).json({ message: "Internal Server Error. Please try again later." });
  }
};





const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // If user doesn't exist
    if (!user) {
      return res.status(400).json({ msg: "Email not found. Please register first." });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(400).json({ msg: "Please verify your email before logging in." });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials." });
    }

    // Generate JWT token
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Fetch profile data for the logged-in user
    const profile = await Profile.findOne({ userId: user._id }).populate('userId', 'name email');

    if (!profile) {
      return res.status(400).json({ msg: "Profile not found." });
    }

    // Send response with user details and token
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        college: user.college,
        gender: user.gender,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      },
      profile: {
        bio: profile.bio,
        profileImageUrl: profile.profileImageUrl,
        hobbies: profile.hobbies,
        interests: profile.interests,
        educationalBackground: profile.educationalBackground,
        portfolioLinks: profile.portfolioLinks
      }
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};



// Admin Login Endpoint
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await User.findOne({ email, isAdmin: true });
    if (!admin) {
      return res.status(403).json({ message: "Unauthorized access." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "1d" });

    return res.status(200).json({ message: "Admin login successful.", token });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error.", error });
  }
};

// Promote User to Admin Endpoint
const promoteToAdmin = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.isAdmin = true;
    await user.save();

    return res.status(200).json({ message: "User successfully promoted to admin." });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error.", error });
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by email in the decoded token
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the token is expired
    if (Date.now() > decoded.exp * 1000) {
      return res.status(400).json({ message: "Token has expired." });
    }

    // If the user is already verified
    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified." });
    }

    // Mark the user as verified
    user.isVerified = true;
    await user.save();

    // Create profile for the user after verification
    const newProfile = new Profile({
      userId: user._id,
      bio: "", // Initially empty
      profileImageUrl: "", // Initially empty
      hobbies: [], // Empty hobbies
      interests: {
        predefined: [], // No predefined interests initially
        custom: [] // No custom interests initially
      },
      educationalBackground: [], // Empty educational background
      professionalExperience: [], // Empty professional experience
      achievements: [], // Empty achievements
      certifications: [], // Empty certifications
      skills: [], // Empty skills
      connectionRequests: [], // No connection requests initially
      connections: [], // No connections initially
      followers: [], // No followers initially
      following: [], // No following initially
      messages: [], // No messages initially
      visibility: "Public", // Default visibility setting
      portfolioLinks: {
        linkedin: "", // Initially empty
        github: "", // Initially empty
        portfolioWebsite: "", // Initially empty
        twitter: "" // Initially empty
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save the new profile
    await newProfile.save();
    console.log("Profile created successfully:", newProfile);

    return res.status(200).json({ message: "Email successfully verified and profile created." });
  } catch (error) {
    console.error("Error during email verification:", error);
    return res.status(400).json({ message: "Invalid or expired token." });
  }
};





module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  resetPasswordPage,
  loginAdmin,
  promoteToAdmin,
  verifyEmail
};
