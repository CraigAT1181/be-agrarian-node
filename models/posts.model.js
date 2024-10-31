const supabase = require("../config/supabase");

/*
  Fetches all posts associated with a given allotment, 
  including user details and media for each post.
  Filters posts by `allotment_id` and ensures the scope is set to "allotment".
*/
exports.fetchAllotmentPosts = async (allotment_id) => {
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
      scope,
      users (
        profile_pic,
        user_name,
        plot
      ),
      posts_media (
        media_url
      )
    `)
    .eq("allotment_id", allotment_id)
    .eq("scope", "allotment")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) throw new Error("No allotment found with the provided allotment_id.");

  return data;
};

/*
  Fetches all posts associated with a given town, 
  including user details, associated allotment names, and post media.
  Filters posts by `town_id` and ensures the scope is set to "town".
*/
exports.fetchTownPosts = async (town_id) => {
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
      scope,
      users (
        profile_pic,
        user_name,
        allotments (
          allotment_name
        )
      ),
      posts_media (
        media_url
      )
    `)
    .eq("town_id", town_id)
    .eq("scope", "town")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) throw new Error("No town found with the provided town_id.");

  return data;
};

/*
  Fetches a specific post and, if applicable, its parent post.
  This includes detailed user and allotment information for both posts.
*/
exports.fetchPostWithParent = async (postId) => {
  const { data: post, error: postError } = await supabase
    .from("posts")
    .select(`
      post_id,
      content,
      created_at,
      updated_at,
      parent_id,
      is_reply,
      reply_count,
      scope,
      users (
        profile_pic,
        user_name,
        town_id,
        allotment_id,
        plot,
        allotments (
          allotment_name
        )
      ),
      posts_media (
        media_url
      )
    `)
    .eq("post_id", postId)
    .single();

  if (postError) throw postError;

  // If a parent post exists, fetch its details; otherwise, return null for the parent post
  let parentPost = null;
  if (post.parent_id) {
    const { data: parent, error: parentError } = await supabase
      .from("posts")
      .select(`
        post_id,
        content,
        created_at,
        updated_at,
        parent_id,
        is_reply,
        reply_count,
        scope,
        users (
          profile_pic,
          user_name,
          town_id,
          allotment_id,
          plot,
          allotments (
            allotment_name
          )
        ),
        posts_media (
          media_url
        )
      `)
      .eq("post_id", post.parent_id)
      .single();

    if (parentError) throw parentError;
    parentPost = parent;
  }

  return { post, parentPost };
};

/*
  Fetches replies for a given post, ordered by creation date.
  Each reply includes user information, associated allotments, and media details.
*/
exports.fetchReplies = async (postId) => {
  const { data: replies, error: repliesError } = await supabase
    .from("posts")
    .select(`
      post_id,
      content,
      created_at,
      updated_at,
      parent_id,
      is_reply,
      reply_count,
      scope,
      users (
        profile_pic,
        user_name,
        town_id,
        allotment_id,
        plot,
        allotments (
          allotment_name
        )
      ),
      posts_media (
        media_url
      )
    `)
    .eq("parent_id", postId)
    .order("created_at", { ascending: false });

  if (repliesError) throw repliesError;

  return replies;
};

/*
  Inserts a new post into the `posts` table and returns the created post.
  This includes fields for user ID, parent post (if a reply), content, and scope.
*/
exports.postNewPost = async (postDetails) => {
  const { user_id, parent_id, content, is_reply, town_id, allotment_id, scope } = postDetails;

  const { data, error } = await supabase
    .from("posts")
    .insert([
      {
        user_id,
        ...(parent_id && { parent_id }),
        content,
        is_reply,
        town_id,
        allotment_id,
        scope
      },
    ])
    .select("*");

  if (error) throw error;

  return data[0];
};

/*
  Uploads media files for a post to Supabase storage.
  Returns an array of URLs pointing to the uploaded media files.
*/
exports.uploadPostMedia = async (post_id, files) => {
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

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("post-media")
      .getPublicUrl(fileName);

    if (publicUrlData) {
      mediaURLs.push(publicUrlData.publicUrl);
    }
  }

  return mediaURLs;
};

// Inserts media URLs into the `posts_media` table associated with a post.
exports.savePostMedia = async (post_id, mediaURLs) => {
  const mediaEntries = mediaURLs.map((url) => ({
    post_id,
    media_url: url,
  }));

  const { data, error } = await supabase
    .from("posts_media")
    .insert(mediaEntries);

  if (error) throw error;

  return data;
};

// Deletes a post with the specified `post_id` from the `posts` table.
exports.removePost = async (post_id) => {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("post_id", post_id);

  return { error };
};

/*
  Deletes media files associated with a post from Supabase storage.
  Lists all files in the post's storage folder and deletes them.
*/
exports.deleteMediaFromStorage = async (post_id) => {
  const bucketName = 'post-media';
  const folderPath = `${post_id}/`;

  // List all files in the folder
  const { data: files, error: listError } = await supabase
    .storage
    .from(bucketName)
    .list(folderPath);

  if (listError) return { error: listError };
  if (!files || files.length === 0) return { error: null };

  // Extract file paths and delete files
  const filePaths = files.map(file => `${folderPath}${file.name}`);
  const { error: deleteError } = await supabase
    .storage
    .from(bucketName)
    .remove(filePaths);

  return { error: deleteError };
};