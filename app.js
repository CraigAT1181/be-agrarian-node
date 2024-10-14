const express = require("express");
const multer = require('multer');
const path = require('path');

const { getEndpoints } = require("./controllers/api.controller");
const { getUsers, addUser, loginUser, deleteUser, getUserInfo, logout, requestPasswordReset, resetPassword } = require("./controllers/users.controller");
const { getAllotmentPosts, getTownPosts, getSinglePost, addPost, deletePost } = require("./controllers/posts.controller");
const {
  handleCustomErrors,
  handle500errors,
} = require("./controllers/errors.controller");

const cors = require("cors");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit to 5MB
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.png', '.jpg', '.jpeg'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});

const app = express();
app.use(express.json());
app.use(cors());

// Routing
app.get("/", getEndpoints);
app.get("/api", getEndpoints);
app.get("/users", getUsers);
app.post("/users", upload.single('profile_pic'), addUser);
app.post("/users/login", loginUser);
app.get("/users/authenticate", getUserInfo);
app.post("/users/logout", logout)
app.post("/password-reset-request", requestPasswordReset);
app.post("/reset-password", resetPassword);
app.delete("/users/:user_id/:auth_id", deleteUser);

app.get("/posts/allotments/:allotment_id", getAllotmentPosts);
app.get("/posts/towns/:town_id", getTownPosts);
app.get("/post/:postId", getSinglePost);
app.post("/posts", upload.array('media_files'), addPost);
app.delete("/posts", deletePost);

// Error-handling
app.use(handleCustomErrors);
app.use(handle500errors);

app.all("/*", (req, res) => {
  res.status(404).send({ message: "Please check your path is correct." });
});

module.exports = app;
