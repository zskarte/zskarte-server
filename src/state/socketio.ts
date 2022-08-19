import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { operationCaches } from './operation';
import { OperationCache, User, WEBSOCKET_EVENT } from './interfaces';
import { Patch } from 'immer';

/** Handles new socket connections, checks the token and the needed query parameters. */
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
    const operationCache = operationCaches[operationId];
    if (!operationCache) {
      strapi.log.warn(`Socket: ${socket.id} - No operationCache for operationId: ${operationId}`);
      socket.disconnect();
      return;
    }
    if (!_.find(operationCache.users, (u) => u.id === user.id)) {
      strapi.log.warn(`Socket: ${socket.id} - User: ${user.email} not allowed for operationId: ${operationId}`);
      strapi.log.info(`Allowed users for operationId: ${operationId}`);
      for (const user of operationCache.users) {
        strapi.log.info(`   ${user.email}`);
      }
      socket.disconnect();
      return;
    }
    operationCache.connections.push({ user, socket, identifier });
    strapi.log.info(`Socket Connected: ${socket.id}, ${user.email}`);
    socket.on('disconnect', () => socketDisconnect(operationCache, socket));
  } catch (error) {
    socket.disconnect();
    strapi.log.error(error);
  }
};

/** Removes disconnected socket connections from the connection stack. */
const socketDisconnect = async (operationCache: OperationCache, socket: Socket) => {
  operationCache.connections = _.filter(operationCache.connections, (c) => c.socket.id !== socket.id);
  strapi.log.info(`Socket Disconnected: ${socket.id}`);
};

/** Broadcast received patches to all currently connected sockets of an operation */
const broadcastPatches = (operationCache: OperationCache, identifier: string, patches: Patch[]) => {
  const connections = _.filter(operationCache.connections, (c) => c.identifier !== identifier);
  for (const connection of connections) {
    try {
      connection.socket.emit(WEBSOCKET_EVENT.STATE_PATCHES, patches);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

export { socketConnection, broadcastPatches };
