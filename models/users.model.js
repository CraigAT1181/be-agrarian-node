const supabase = require("../config/supabase");

exports.fetchUsers = async () => {
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    throw error;
  }

  return data;
};

exports.createUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error signing up:", error);
      throw error;
    }

    console.log("Auth Response:", data);

    if (!data.user) {
      console.error("Auth Response does not contain user data");
      throw new Error("User creation failed");
    }

    return data;
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
};

exports.uploadProfilePicture = async (authUserId, file) => {
  try {
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
  } catch (error) {
    console.error("Error in uploadProfilePicture:", error);
    throw error;
  }
};

exports.fetchTownAllotmentID = async (townName, allotmentName) => {
  try {
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
  } catch (error) {
    console.error("Error fetching town or allotment ID:", error);
    throw error;
  }
};


exports.insertUserDetails = async (userDetails) => {
  const { auth_user_id, user_name, email, town_id, allotment_id, plot, profile_pic } = userDetails;

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        auth_user_id,
        user_name,
        email,
        town_id,
        allotment_id,
        plot,
        profile_pic,
      },
    ])
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

exports.signInUser = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Error signing in:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in signInUser", error);
    throw error;
  }
};

exports.authenticateUser = async (token) => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error("Invalid token");
    }

    return user;
  } catch (error) {
    throw error;
  }
};

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

exports.logUserOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error("Error during sign out");
    }

    return { message: "Signed out successfully." };
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

exports.deleteUserById = async (userId) => {
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(error.message);
  }

  return { message: "User deleted successfully" };
};
