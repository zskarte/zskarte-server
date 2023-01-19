import { Socket } from 'socket.io/dist/socket';
import _ from 'lodash';
import { operationCaches } from './operation';
import { OperationCache, PatchExtended, User, WEBSOCKET_EVENT } from '../definitions';

/** Handles new socket connections, checks the token and the needed query parameters. */
const socketConnection = async ({ strapi }, socket: Socket) => {
  try {
    strapi.log.info(`Socket Connecting: ${socket.id}`);
    const { token } = socket.handshake.auth;
    const operationId = parseInt(socket.handshake.query.operationId as string);
    const identifier = socket.handshake.query.identifier as string;
    if (isNaN(operationId) || !token || !identifier) {
      strapi.log.warn(`Socket: ${socket.id} - Empty token, operationId or identifier in handshake`);
      socket.disconnect();
      return;
    }
    const { jwt, user: userService } = strapi.plugins['users-permissions'].services;
    const { id: userId, operationId: tokenOperationId }: { id: number; operationId: number } = await jwt.verify(token);
    // Check if the token operationId matches the query operationId
    if (tokenOperationId && operationId !== tokenOperationId) {
      strapi.log.warn(
        `Socket: ${socket.id} - OperationId: ${operationId} does not match provided access token OperationId: ${tokenOperationId}`
      );
      socket.disconnect();
      return;
    }
    const user = (await userService.fetch(userId)) as User;
    const operationCache = operationCaches[operationId];
    // Check if the operationCache exists
    if (!operationCache) {
      strapi.log.warn(`Socket: ${socket.id} - No operationCache for operationId: ${operationId}`);
      socket.disconnect();
      return;
    }
    // Check if the user is allowed to connect to the operation or if it is a token connection then pass the check
    if (!tokenOperationId && !_.find(operationCache.users, (u) => u.id === user.id)) {
      strapi.log.warn(`Socket: ${socket.id} - User: ${user.email} not allowed for operationId: ${operationId}`);
      strapi.log.info(`Allowed users for operationId: ${operationId}`);
      for (const user of operationCache.users) {
        strapi.log.info(`   ${user.username}`);
      }
      socket.disconnect();
      return;
    }
    operationCache.connections.push({ user, socket, identifier });
    strapi.log.info(`Socket Connected: ${socket.id}, ${user.email}, OperationId: ${operationId}`);
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
const broadcastPatches = (operationCache: OperationCache, identifier: string, patches: PatchExtended[]) => {
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
