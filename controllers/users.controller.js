const {
  fetchUsers,
  getUserById,
  createUser,
  uploadProfilePicture,
  insertUserDetails,
  signInUser,
  deleteUserById,
  authenticateUser,
  logUserOut,
  fetchAllotmentPosts,
  fetchTownAllotmentID,
} = require("../models/users.model");

exports.getUsers = async (req, res, next) => {
  try {
    const users = await fetchUsers();
    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

exports.addUser = async (req, res, next) => {
  try {
    const { email, password, user_name, town, allotment, plot } = req.body;

    const file = req.file;

    const authData = await createUser(email, password);

    if (!authData.user) {
      return res.status(400).json({ error: "User creation failed" });
    }

    const authUserId = authData.user.id;

    let profilePicUrl = null;
    if (file) {
      profilePicUrl = await uploadProfilePicture(authUserId, file);
    }

    const { town_id, allotment_id } = await fetchTownAllotmentID(town, allotment);

    const userDetails = {
      auth_user_id: authUserId,
      user_name,
      email,
      town_id,
      allotment_id,
      plot,
      profile_pic: profilePicUrl,
    };

    const user = await insertUserDetails(userDetails);

    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.loginUser = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required." });
  }

  try {
    const { session, user } = await signInUser(email, password);

    if (!session) {
      return res.status(401).json({ message: "Authentication failed" });
    }

    const user_info = await getUserById(user.id);

    res.status(200).json({ session: session, user: user_info });
  } catch (error) {
    next(error);
  }
};

exports.getUserInfo = async (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];

  try {
    const authenticated_user = await authenticateUser(token);

    const user_info = await getUserById(authenticated_user.id);

    res.status(200).json({ user: user_info });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const result = await logUserOut();

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  const user_id = req.params.user_id;

  try {
    const result = await deleteUserById(user_id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAllotmentPosts = async (req, res, next) => {
  const allotment_id = req.params.allotment_id;

  try {
    const allotmentPosts = await fetchAllotmentPosts(allotment_id);
    res.status(200).json({ posts: allotmentPosts });
  } catch (error) {
    next(error);
  }
};
