const supabase = require("../config/supabase");

// Fetches all users from the users table.
exports.fetchUsers = async () => {
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    throw error;
  }

  return data;
};

// Registers a new user with the provided email and password.
exports.createUser = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error("Error signing up:", error);
    throw error;
  }

  if (!data.user) {
    console.error("Auth Response does not contain user data");
    throw new Error("User creation failed");
  }

  return data;
};

// Uploads a profile picture for a user to the "profile-pictures" bucket.
exports.uploadProfilePicture = async (authUserId, file) => {
  const fileName = `${authUserId}/${Date.now()}_${file.originalname}`;
  const { data, error } = await supabase.storage
    .from("profile-pictures")
    .upload(fileName, file.buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.mimetype,
    });

  if (error) {
    console.error("Error uploading profile picture:", error);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from("profile-pictures")
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
};

// Retrieves the IDs of the specified town and allotment.
exports.fetchTownAllotmentID = async (townName, allotmentName) => {
  const { data: townData, error: townError } = await supabase
    .from("towns")
    .select("town_id")
    .eq("town_name", townName)
    .single();

  if (townError || !townData) {
    throw new Error(`Town not found for name: ${townName}`);
  }

  const { data: allotmentData, error: allotmentError } = await supabase
    .from("allotments")
    .select("allotment_id")
    .eq("allotment_name", allotmentName)
    .single();

  if (allotmentError || !allotmentData) {
    throw new Error(`Allotment not found for name: ${allotmentName}`);
  }

  return {
    town_id: townData.town_id,
    allotment_id: allotmentData.allotment_id,
  };
};

// Inserts user details into the users table.
exports.insertUserDetails = async (userDetails) => {
  const { auth_user_id, user_name, email, town_id, allotment_id, plot, profile_pic } = userDetails;

  const { data, error } = await supabase
    .from("users")
    .insert([{ auth_user_id, user_name, email, town_id, allotment_id, plot, profile_pic }])
    .select("*");

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("email")) {
        throw new Error("Email already exists");
      } else if (error.message.includes("handle")) {
        throw new Error("Handle already exists");
      }
    }

    console.error("Error inserting user details:", error);
    throw error;
  }

  return data[0];
};

// Signs in a user using email and password.
exports.signInUser = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("Error signing in:", error);
    throw error;
  }

  return data;
};

// Authenticates a user using a token.
exports.authenticateUser = async (token) => {
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Invalid token");
  }

  return user;
};

// Retrieves a user's data by user_id.
exports.getUserById = async (user_id) => {
  const trimmedID = user_id.trim();
  const { data, error } = await supabase
    .from("users")
    .select("*, towns(town_name), allotments(allotment_name)")
    .eq("auth_user_id", trimmedID)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    throw error;
  }

  if (!data) {
    console.error("No user found with the provided auth_user_id.");
    throw new Error("No user found with the provided auth_user_id.");
  }

  return data;
};

// Signs the user out.
exports.logUserOut = async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error("Error during sign out");
  }

  return { message: "Signed out successfully." };
};

// Sends a password reset email to the specified address.
exports.sendPasswordResetEmail = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
  });

  if (error) throw error;
  return { message: "Email sent" };
};

// Updates the user's password.
exports.handleResetPassword = async (access_token, newPassword) => {
  const { error } = await supabase.auth.updateUser({ access_token, password: newPassword });

  if (error) throw error;
  return { message: "Password updated" };
};

// Deletes a user from the public.users table.
exports.deletePublicUser = async (publicUserId) => {
  const { error } = await supabase.from("users").delete().eq("user_id", publicUserId);

  if (error) {
    throw new Error("Error deleting user from public.users table: " + error.message);
  }

  return { message: "User deleted from public table." };
};

// Deletes an authenticated user from the auth.users table.
exports.deleteAuthUser = async (authUserId) => {
  const { error } = await supabase.auth.admin.deleteUser(authUserId);

  if (error) {
    throw new Error("Error deleting user from auth.users table: " + error.message);
  }

  return { message: "User deleted from auth table." };
};

// Deletes all profile pictures from the profile-pictures bucket for a specific user.
exports.deleteAllProfilePictures = async (auth_id) => {
  const { data, error } = await supabase.storage
    .from("profile-pictures")
    .remove([`${auth_id}`]);

  if (error) {
    throw new Error("Error deleting profile pictures: " + error.message);
  }

  return { message: "All profile pictures deleted for user." };
};