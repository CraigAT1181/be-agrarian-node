const {
  fetchNotifications,
  processNotifications,
  postNotification,
  markNotificationAsRead,
} = require("../models/notifications.model");

exports.getNotifications = async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({ error: "No user_id received." });
  }

  try {
    const notifications = await fetchNotifications(userId);
    const detailedNotifications = await processNotifications(notifications);

    res.status(200).json(detailedNotifications);
  } catch (error) {
    next(error);
  }
};

exports.addNotification = async (req, res, next) => {
  const { userId, associatedId, associatedType, notificationType, message } =
    req.body;
  const notificationDetails = {
    userId,
    associatedId,
    associatedType,
    notificationType,
  };

  try {
    const newNotification = await postNotification(notificationDetails);

    res.status(201).json({ newNotification, message });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  const { notification_id } = req.params;

  if (!notification_id) {
    res.status(400).json({ error: "notification_id required." });
  }

  try {
    await markNotificationAsRead(notification_id);

    res.status(200).send();
  } catch (error) {
    console.error(
      `Error patching notification with notification_id: ${notification_id}`,
      error
    );
    next(error);
  }
};
