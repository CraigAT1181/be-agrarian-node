const {
  fetchAllotmentPosts,
  fetchTownPosts,
  fetchPostWithParent,
  fetchReplies,
  postNewPost,
  uploadPostMedia,
  savePostMedia,
  removePost,
  deleteMediaFromStorage
} = require("../models/posts.model");

// Retrieves posts for a specific allotment.
exports.getAllotmentPosts = async (req, res, next) => {
  const { allotment_id } = req.params;

  try {
      const allotmentPosts = await fetchAllotmentPosts(allotment_id);
      res.status(200).json({ posts: allotmentPosts });
  } catch (error) {
      console.error("Error fetching allotment posts:", error);
      next(error);
  }
};

// Retrieves posts for a specific town.
exports.getTownPosts = async (req, res, next) => {
  const { town_id } = req.params;

  try {
      const townPosts = await fetchTownPosts(town_id);
      res.status(200).json({ posts: townPosts });
  } catch (error) {
      console.error("Error fetching town posts:", error);
      next(error);
  }
};

// Retrieves a specific post, its parent, and any replies.
exports.getSinglePost = async (req, res, next) => {
  const { postId } = req.params;

  try {
      const { post, parentPost } = await fetchPostWithParent(postId);
      const replies = await fetchReplies(postId);
      res.status(200).json({ post, parentPost, replies });
  } catch (error) {
      console.error("Error fetching single post or replies:", error);
      next(error);
  }
};

// Adds a new post, with optional media files.
exports.addPost = async (req, res, next) => {
  const { user_id, parent_id, content, is_reply, town_id, allotment_id, scope } = req.body;
  const files = req.files;
  
  const postDetails = { user_id, content, is_reply, town_id, allotment_id, scope, parent_id };

  try {
      const newPost = await postNewPost(postDetails);
      const post_id = newPost.post_id;

      let mediaURLs = [];
      if (files && files.length > 0) {
          mediaURLs = await uploadPostMedia(post_id, files);
          await savePostMedia(post_id, mediaURLs);
      }

      res.status(200).json({ post: newPost, mediaURLs });
  } catch (error) {
      console.error("Error adding new post:", error);
      next(error);
  }
};

// Deletes a specific post and its associated media.
exports.deletePost = async (req, res, next) => {
  const { post_id } = req.body;

  if (!post_id) {
      return res.status(400).json({ error: "post_id is required" });
  }

  try {
      const { error: postError } = await removePost(post_id);
      if (postError) {
          console.error("Error removing post:", postError.message);
          return res.status(500).json({ error: postError.message });
      }

      const { error: storageError } = await deleteMediaFromStorage(post_id);
      if (storageError) {
          console.error("Error deleting media from storage:", storageError.message);
          return res.status(500).json({ error: storageError.message });
      }

      res.status(204).send();
  } catch (error) {
      console.error("Error deleting post:", error);
      next(error);
  }
};
