import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { sessionCaches } from './session';

export default [
  {
    name: 'connection',
    handler: async ({ strapi }, socket: Socket) => {
      try {
        const { token } = socket.handshake.auth;
        const operationId = socket.handshake.query.operationId as unknown as number;
        if (!operationId || !token) {
          socket.disconnect();
          return;
        }
        const { id: userId } = await strapi.plugins['users-permissions'].services.jwt.verify(token);
        const sessionCache = sessionCaches[operationId];
        if (!sessionCache) {
          socket.disconnect();
          return;
        }
        if (!_.find(sessionCache.users, (u) => u.id === userId)) {
          socket.disconnect();
          return;
        }
        sessionCache.connections.push(socket);
        socket.on('disconnect', () => {
          sessionCache.connections = _.filter(sessionCache.connections, (s) => s.id !== socket.id);
        });
      } catch (error) {
        socket.disconnect();
        strapi.log.error(error);
      }
    },
  },
  {
    name: 'state-patch',
    handler: ({ strapi }, patch) => {},
  },
];
