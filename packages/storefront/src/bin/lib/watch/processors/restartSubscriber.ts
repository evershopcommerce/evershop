export function restartSubscriber() {
  (process as NodeJS.EventEmitter).emit('RESTART_SUBSCRIBER');
}
