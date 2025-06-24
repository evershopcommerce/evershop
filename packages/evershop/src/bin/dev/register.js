import { register } from 'node:module';
import { MessageChannel } from 'node:worker_threads';
export const maps = new Map();
const { port1: listenChannel, port2: broadcastChannel } = new MessageChannel();
listenChannel.on('message', (message) => {
  maps.set(message.path, true);
});

register('./hooks.js', {
  parentURL: import.meta.url,
  data: { broadcastChannel },
  transferList: [broadcastChannel],
});

export function has(pathName) {
  return maps.has(pathName);
}