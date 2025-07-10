export function restartSubscriberJob() {
  (process as NodeJS.EventEmitter).emit('RESTART_SUBSCRIBER');
}
