import { applyPatches, Patch, enablePatches } from 'immer';
import { Strapi } from '@strapi/strapi';
import _ from 'lodash';

import { Operation, OperationCache, StrapiLifecycleHook, User } from './interfaces';
import { broadcastPatches } from './socketio';

enablePatches();

const operationCaches: { [key: number]: OperationCache } = {};

/** Loads all active operations initially and generates the in-memory cache */
const loadOperations = async (strapi: Strapi) => {
  try {
    const activeOperations = (await strapi.db.query('api::operation.operation').findMany({
      where: { status: 'active' },
      populate: ['organization'],
    })) as Operation[];
    for (const operation of activeOperations) {
      await lifecycleOperation(StrapiLifecycleHook.AFTER_CREATE, operation);
    }
  } catch (error) {
    strapi.log.error(error);
    strapi.log.info('Error while loading the active operations, shutdown the strapi server.');
    process.exit(1);
  }
};

/** The implementation of the Strapi Lifecylce hooks of the operation collection type */
const lifecycleOperation = async (lifecycleHook: StrapiLifecycleHook, operation: Operation) => {
  if (lifecycleHook === StrapiLifecycleHook.AFTER_CREATE) {
    const mapState = operation.mapState || {};
    operationCaches[operation.id] = { operation, connections: [], users: [], mapState, mapStateChanged: false };
    if (!operation.organization) return;
    const allowedUsers = (await strapi.db.query('plugin::users-permissions.user').findMany({
      where: { organization: operation.organization.id },
    })) as User[];
    operationCaches[operation.id].users.push(...allowedUsers);
  }
  if (lifecycleHook === StrapiLifecycleHook.AFTER_UPDATE) {
    operationCaches[operation.id].operation = operation;
  }
  if (lifecycleHook === StrapiLifecycleHook.AFTER_DELETE) {
    delete operationCaches[operation.id];
  }
};

/** Uses the immer library to patch the server map state */
const updateMapState = async (operationId: string, identifier: string, patches: Patch[]) => {
  const operationCache = operationCaches[operationId] as OperationCache;
  if (!operationCache) return;
  operationCache.mapState = applyPatches(operationCache.mapState, patches);
  operationCache.mapStateChanged = true;
  broadcastPatches(operationCache, identifier, patches);
};

export { operationCaches, loadOperations, lifecycleOperation, updateMapState };
