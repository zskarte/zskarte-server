import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { sessionCaches } from './session';
import { SessionCache, User } from './interfaces';

const socketConnection = async ({ strapi }, socket: Socket) => {
  try {
    strapi.log.info(`Socket Connecting: ${socket.id}`);
    const { token } = socket.handshake.auth;
    const operationId = socket.handshake.query.operationId as unknown as number;
    if (!operationId || !token) {
      strapi.log.warn(`Socket: ${socket.id} - Invalid operationId or token`);
      socket.disconnect();
      return;
    }
    const { id: userId } = await strapi.plugins['users-permissions'].services.jwt.verify(token);
    const user = (await strapi.plugins['users-permissions'].services.user.fetch(userId)) as User;
    const sessionCache = sessionCaches[operationId];
    if (!sessionCache) {
      strapi.log.warn(`Socket: ${socket.id} - No SessionCache for operationId: ${operationId}`);
      socket.disconnect();
      return;
    }
    if (!_.find(sessionCache.users, (u) => u.id === user.id)) {
      strapi.log.warn(`Socket: ${socket.id} - User: ${user.email} not allowed for operationId: ${operationId}`);
      socket.disconnect();
      return;
    }
    sessionCache.connections.push({ user, socket });
    strapi.log.info(`Socket Connected: ${socket.id}, ${user.email}`);
    socket.on('disconnect', () => socketDisconnect(sessionCache, socket));
  } catch (error) {
    socket.disconnect();
    strapi.log.error(error);
  }
};

const socketDisconnect = async (sessionCache: SessionCache, socket: Socket) => {
  sessionCache.connections = _.filter(sessionCache.connections, (c) => c.socket.id !== socket.id);
  strapi.log.info(`Socket Disconnected: ${socket.id}`);
};

export { socketConnection };
