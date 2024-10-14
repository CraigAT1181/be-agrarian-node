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

exports.sendPasswordResetEmail = async (email) => {
  // Supabase built-in password reset function
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  });
  
  if (error) throw error;
  return { message: "Email sent" };
};

exports.handleResetPassword = async (access_token, newPassword) => {
  const { error } = await supabase.auth.updateUser({
    access_token,
    password: newPassword
  });

  if (error) throw error;
  return { message: "Password updated" };
};

exports.deletePublicUser = async (publicUserId) => {
  const { error } = await supabase
  .from('users')
  .delete()
  .eq('user_id', publicUserId);

if (error) {
  throw new Error("Error deleting user from public.users table: " + error.message);
}

  return { message: "User deleted from public table." };
};

exports.deleteAuthUser = async (authUserId) => {
  const { error } = await supabase.auth.admin.deleteUser(authUserId);

  if (error) {
    throw new Error("Error deleting user from auth.users table: " + error.message);
  }

  return { message: "User deleted from auth table." };
};

exports.deleteProfilePicFromStorage = async (auth_id) => {
  const bucketName = 'profile-pictures';
  const folderPath = `${auth_id}/`;

  // List files in the folder to check if they exist
  const { data: files, error: listError } = await supabase
    .storage
    .from(bucketName)
    .list(folderPath);

  if (listError) {
    console.error("Error listing files:", listError);
    return { error: listError };
  }

  if (!files || files.length === 0) {
    console.log("No files found to delete in folder:", folderPath);   
    return { error: null };  // No files to delete
  }

  // Extract file paths to delete
  const filePaths = files.map(file => `${folderPath}${file.name}`);

  // Attempt to delete the files
  const { error: deleteError } = await supabase
    .storage
    .from(bucketName)
    .remove(filePaths);

  if (deleteError) {
    console.error("Error deleting files:", deleteError);
  }

  return { error: deleteError };
};
