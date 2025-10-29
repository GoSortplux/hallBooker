import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import Notification from '../models/notification.model.js';

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 });
  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, read: false });

  return res.status(200).json(new ApiResponse(200, { notifications, unreadCount }, 'Notifications retrieved successfully'));
});

const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: req.user._id },
    { read: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read'));
});

const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true, readAt: new Date() });

  return res.status(200).json(new ApiResponse(200, {}, 'All notifications marked as read'));
});

const markAsUnread = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: req.user._id },
    { read: false, readAt: null },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(404, 'Notification not found');
  }

  return res.status(200).json(new ApiResponse(200, notification, 'Notification marked as unread'));
});

export { getNotifications, markAsRead, markAllAsRead, markAsUnread };