const supabase = require("../config/supabase");

exports.processNotifications = async (notifications) => {
  if (notifications.length === 0) return [];

  return await Promise.all(
    notifications.map(async (notification) => {
      let associatedData;

      switch (notification.associated_type) {
        case "post":
          const { data: postData, error: postError } = await supabase
            .from("posts")
            .select("content, post_id, users(profile_pic)")
            .eq("post_id", notification.associated_id);

          if (postError) {
            console.error("Failed to fetch post:", postError);
            throw postError;
          }

          associatedData = postData;

          break;

        case "message":
          const { data: messageData, error: messageError } = await supabase
            .from("messages")
            .select("content, message_id, users(profile_pic)")
            .eq("message_id", notification.associated_id);

          if (messageError) {
            console.error("Failed to fetch message:", messageError);
            throw messageError;
          }

          associatedData = messageData;

          break;

        default:
          console.warn(
            `Unsupported associated_type: ${notification.associated_type}`
          );
          associatedData = null;

          break;
      }

      return {
        ...notification,
        associated_data: associatedData,
      };
    })
  );
};

exports.fetchNotifications = async (user_id) => {
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch notifications", error);
    throw error;
  }

  return notifications;
};

exports.postNotification = async (notificationDetails) => {
  const { userId, associatedId, associatedType, notificationType } =
    notificationDetails;

  const { data, error } = await supabase
    .from("notifications")
    .insert([
      {
        user_id: userId,
        associated_id: associatedId,
        associated_type: associatedType,
        notification_type: notificationType,
      },
    ])
    .select("*");

  if (error) {
    console.error("Failed to add notification", error);
    throw error;
  }

  return data[0];
};

exports.markNotificationAsRead = async (notification_id) => {
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("notification_id", notification_id);

  if (error) {
    console.error("Error marking notification as read:", error);
    throw new Error("Failed to mark notification as read");
  }

  return data;
};
