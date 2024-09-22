const {fetchAllotmentPosts, fetchTownPosts, fetchPostWithParent, fetchReplies, postNewPost, uploadPostMedia, savePostMedia} = require("../models/posts.model")

exports.getAllotmentPosts = async (req, res, next) => {
    const { allotment_id } = req.params;
  
    try {
      const allotmentPosts = await fetchAllotmentPosts(allotment_id);
      res.status(200).json({ posts: allotmentPosts });
    } catch (error) {
      next(error);
    }
  };

  exports.getTownPosts = async (req, res, next) => {
    const { town_id } = req.params;
  
    try {
      const townPosts = await fetchTownPosts(town_id);
      res.status(200).json({ posts: townPosts });
    } catch (error) {
      next(error);
    }
  };

  exports.getSinglePost = async (req, res, next) => {
    const { postId } = req.params;
  
    try {
      // Fetch the specific post and its parent
      const {post, parentPost} = await fetchPostWithParent(postId);
      
      // Fetch replies (children posts)
      const replies = await fetchReplies(postId);
  
      // Combine the results
      res.status(200).json({ post, parentPost, replies });
    } catch (error) {
      console.error("Error fetching single post or replies:", error);
      next(error);
    }
  };

  exports.addPost = async (req, res, next) => {
    try {
      const { user_id, parent_id, content, is_reply, town_id, allotment_id, scope } = req.body;
      const postDetails = {
        user_id,
        parent_id: parent_id || null,
        content,
        is_reply,
        town_id,
        allotment_id,
        scope
      };
  
      const files = req.files;
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