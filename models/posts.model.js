const supabase = require("../config/supabase");

exports.fetchAllotmentPosts = async (allotment_id) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
        post_id,
        content,
        created_at,
        updated_at,
        parent_id,
        is_reply,
        reply_count,
        users (
          profile_pic,
          user_name,
          plot
        ),
        media (
          media_url
        )
        `)
        .eq("allotment_id", allotment_id)
        .eq("scope", "allotment")
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error fetching allotment:", error);
        throw error;
      }
  
      if (!data) {
        throw new Error("No allotment found with the provided allotment_id.");
      }
  
      return data;
    } catch (error) {
      console.error("Error caught in catch block:", error);
      throw error;
    }
  };

  exports.fetchTownPosts = async (town_id) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
            `
            post_id,
            content,
            created_at,
            updated_at,
            parent_id,
            is_reply,
            reply_count,
            users (
              profile_pic,
              user_name,
              allotment_id
            ),
            media (
              media_url
            )
          `
          )
        .eq("town_id", town_id)
        .eq("scope", "town")
        .order("created_at", { ascending: false });
  
      if (error) {
        console.error("Error fetching town:", error);
        throw error;
      }
  
      if (!data) {
        throw new Error("No town found with the provided town_id.");
      }
  
      return data;
    } catch (error) {
      console.error("Error caught in catch block:", error);
      throw error;
    }
  };

exports.fetchPostWithParent = async (postId) => {
  console.log("postId received in model:", postId);

  try {
    // Fetch the post details, including the parent_id
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select(
        `
        post_id,
        content,
        created_at,
        updated_at,
        parent_id,
        is_reply,
        reply_count,
        users (
          profile_pic,
          user_name,
          town_id,
          allotment_id,
          plot
        ),
        media (
          media_url
        )
      `
      )
      .eq("id", postId)
      .single();

    if (postError) throw postError;

    // If the post has a parent_id, fetch the parent post, otherwise set parentPost to null
    let parentPost = null;
    if (post.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from("posts")
        .select(
            `
            post_id,
            content,
            created_at,
            updated_at,
            parent_id,
            is_reply,
            reply_count,
            users (
              profile_pic,
              user_name,
              town_id,
              allotment_id,
              plot
            ),
            media (
              media_url
            )
          `
          )
        .eq("id", post.parent_id)
        .single();

      if (parentError) {
        console.error("Error fetching parent post:", parentError);
        throw parentError;
      }
      parentPost = parent;
    }

    console.log("Model - returned from fetchPostWithParent", post);
    return { post, parentPost };
  } catch (error) {
    console.error("Error fetching post with parent:", error);
    throw error;
  }
};

exports.fetchReplies = async (postId) => {
    try {
      const { data: replies, error: repliesError } = await supabase
        .from("posts")
        .select(
            `
            post_id,
            content,
            created_at,
            updated_at,
            parent_id,
            is_reply,
            reply_count,
            users (
              profile_pic,
              user_name,
              town_id,
              allotment_id,
              plot
            ),
            media (
              media_url
            )
          `
          )
        .eq("parent_id", postId)
        .order("created_at", { ascending: true });
  
      if (repliesError) throw repliesError;
  
      console.log("Model - returned from fetchReplies:", replies);
      return replies;
    } catch (error) {
      console.error("Error fetching replies:", error);
      throw error;
    }
  };

  exports.postNewPost = async (postDetails) => {
    const { user_id, parent_id, content, is_reply, town_id, allotment_id, scope } = postDetails;
  
    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([
          {
            user_id,
            parent_id,
            content,
            is_reply,
            town_id,
            allotment_id,
            scope
          },
        ])
        .select("*");
  
      if (error) {
        console.error("Error adding new post:", error);
        throw error;
      }
  
      return data[0];
    } catch (error) {
      console.error("Error in postNewPost:", error);
      throw error;
    }
  };

  exports.uploadPostMedia = async (post_id, files) => {
    try {
      let mediaURLs = [];
  
      for (const file of files) {
        const fileName = `${post_id}/${Date.now()}_${file.originalname}`;
  
        const { data, error } = await supabase.storage
          .from("post-media")
          .upload(fileName, file.buffer, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.mimetype,
          });
  
        if (error) {
          console.error("Error uploading media file:", error);
          throw error;
        }
  
        const { data: publicUrlData } = supabase.storage
          .from("post-media")
          .getPublicUrl(fileName);
  
        if (publicUrlData) {
          mediaURLs.push(publicUrlData.publicUrl);
        }
      }
  
      return mediaURLs;
    } catch (error) {
      console.error("Error in uploadPostMedia:", error);
      throw error;
    }
  };

  exports.savePostMedia = async (post_id, mediaURLs) => {
    try {
      const mediaEntries = mediaURLs.map((url) => ({
        post_id,
        media_url: url,
      }));
      
  
      const { data, error } = await supabase
        .from("posts_media")
        .insert(mediaEntries);
  
      if (error) {
        console.error("Error saving media URLs:", error);
        throw error;
      }
  
      return data;
    } catch (error) {
      console.error("Error in savePostMedia:", error);
      throw error;
    }
  };