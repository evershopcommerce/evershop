const { hookable } = require('@evershop/evershop/src/lib/util/hookable');
const { getValueSync } = require('@evershop/evershop/src/lib/util/registry');

function addNotification(request, message, type = 'info') {
  const notification = {
    message: getValueSync('notificationMessage', message),
    type // Suppport 'success', 'error', 'info', 'warning'
  };
  const { session } = request;
  session.notifications = session.notifications || [];
  session.notifications.push(notification);
}

function getNotifications(request) {
  const { session } = request;
  const notifications = session.notifications || [];
  session.notifications = [];
  return notifications;
}

module.exports = {
  addNotification: (request, message, type) =>
    hookable(addNotification)(request, message, type),
  getNotifications
};
