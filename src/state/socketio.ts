import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { sessionCaches } from './session';
import { SessionCache, User } from './interfaces';
import { Patch } from 'immer';

const socketConnection = async ({ strapi }, socket: Socket) => {
  try {
    strapi.log.info(`Socket Connecting: ${socket.id}`);
    const { token } = socket.handshake.auth;
    const operationId = socket.handshake.query.operationId as unknown as number;
    const identifier = socket.handshake.query.identifier as string;
    if (!operationId || !token || !identifier) {
      strapi.log.warn(`Socket: ${socket.id} - Empty token, operationId or identifier in handshake`);
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
    sessionCache.connections.push({ user, socket, identifier });
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

const broadcastPatches = (sessionCache: SessionCache, identifier: string, patches: Patch[]) => {
  const connections = _.filter(sessionCache.connections, (c) => c.identifier !== identifier);
  for (const connection of connections) {
    connection.socket.emit('patches', patches);
  }
};

export { socketConnection, broadcastPatches };
