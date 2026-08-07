import { hookable } from '../../../lib/util/hookable.js';
import { getValueSync } from '../../../lib/util/registry.js';

function addNotificationMessage(request, message, type = 'info') {
  const notification = {
    message: getValueSync('notificationMessage', message),
    type // Suppport 'success', 'error', 'info', 'warning'
  };
  const { session } = request;
  session.notifications = session.notifications || [];
  session.notifications.push(notification);
}

export const getNotifications = (request) => {
  const { session } = request;
  const notifications = session.notifications || [];
  session.notifications = [];
  return notifications;
};

export const addNotification = (request, message, type) =>
  hookable(addNotificationMessage)(request, message, type);
