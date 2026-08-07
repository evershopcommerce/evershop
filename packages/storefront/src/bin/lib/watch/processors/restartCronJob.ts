export function restartCronJob() {
  (process as NodeJS.EventEmitter).emit('RESTART_CRONJOB');
}
