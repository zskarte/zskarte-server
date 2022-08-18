import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { sessionCaches } from './session';
import { SessionCache, User } from './interfaces';

const socketConnection = async ({ strapi }, socket: Socket) => {
  try {
    const { token } = socket.handshake.auth;
    const operationId = socket.handshake.query.operationId as unknown as number;
    if (!operationId || !token) {
      socket.disconnect();
      return;
    }
    const user = (await strapi.plugins['users-permissions'].services.jwt.verify(token)) as User;
    const sessionCache = sessionCaches[operationId];
    if (!sessionCache) {
      socket.disconnect();
      return;
    }
    if (!_.find(sessionCache.users, (u) => u.id === user.id)) {
      socket.disconnect();
      return;
    }
    sessionCache.connections.push({ user, socket });
    socket.on('disconnect', () => socketDisconnect(sessionCache, socket));
  } catch (error) {
    socket.disconnect();
    strapi.log.error(error);
  }
};

const socketDisconnect = async (sessionCache: SessionCache, socket: Socket) => {
  sessionCache.connections = _.filter(sessionCache.connections, (c) => c.socket.id !== socket.id);
};

export { socketConnection };
