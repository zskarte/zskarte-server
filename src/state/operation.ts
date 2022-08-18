import { applyPatches, Patch, enablePatches } from 'immer';
import { Strapi } from '@strapi/strapi';
import _ from 'lodash';

import { Operation, OperationCache, StrapiLifecycleHook, User } from './interfaces';
import { broadcastPatches } from './socketio';

enablePatches();

const operationCaches: { [key: number]: OperationCache } = {};

const loadOperations = async (strapi: Strapi) => {
  try {
    const activeOperations = (await strapi.db.query('api::operation.operation').findMany({
      where: { status: 'active' },
      populate: ['organization'],
    })) as Operation[];
    for (const operation of activeOperations) {
      await lifecycleOperation(StrapiLifecycleHook.AFTER_CREATE, operation);
    }
    setInterval(() => persistMapStates(strapi), 5000);
  } catch (error) {
    strapi.log.error(error);
  }
};

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

const updateMapState = async (operationId: string, identifier: string, patches: Patch[]) => {
  const operationCache = operationCaches[operationId] as OperationCache;
  if (!operationCache) return;
  operationCache.mapState = applyPatches(operationCache.mapState, patches);
  operationCache.mapStateChanged = true;
  broadcastPatches(operationCache, identifier, patches);
};

const persistMapStates = async (strapi: Strapi) => {
  for (const [operationId, operationCache] of Object.entries(operationCaches)) {
    if (!operationCache.mapStateChanged) continue;
    await strapi.entityService.update('api::operation.operation', operationId, {
      data: {
        mapState: operationCache.mapState,
      },
    });
    operationCache.mapStateChanged = false;
    strapi.log.info(`MapState of operation ${operationId} Persisted`);
  }
};

export { operationCaches, loadOperations, lifecycleOperation, updateMapState };
