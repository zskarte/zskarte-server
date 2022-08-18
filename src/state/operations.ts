import { Strapi } from '@strapi/strapi';
import _ from 'lodash';
import { Operation, SessionCache, StrapiLifecycleHook, User } from './interfaces';
import { sessionCaches } from './session';
import { applyPatches, Patch, enablePatches } from 'immer';
import { broadcastPatches } from './socketio';
enablePatches();

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
    sessionCaches[operation.id] = { operation, connections: [], users: [], mapState, mapStateChanged: false };
    if (!operation.organization) return;
    const allowedUsers = (await strapi.db.query('plugin::users-permissions.user').findMany({
      where: { organization: operation.organization.id },
    })) as User[];
    sessionCaches[operation.id].users.push(...allowedUsers);
  }
  if (lifecycleHook === StrapiLifecycleHook.AFTER_UPDATE) {
    sessionCaches[operation.id].operation = operation;
  }
  if (lifecycleHook === StrapiLifecycleHook.AFTER_DELETE) {
    delete sessionCaches[operation.id];
  }
};

const updateMapState = async (operationId: string, identifier: string, patches: Patch[]) => {
  const sessionCache = sessionCaches[operationId] as SessionCache;
  if (!sessionCache) return;
  sessionCache.mapState = applyPatches(sessionCache.mapState, patches);
  sessionCache.mapStateChanged = true;
  broadcastPatches(sessionCache, identifier, patches);
};

const persistMapStates = async (strapi: Strapi) => {
  for (const [operationId, sessionCache] of Object.entries(sessionCaches)) {
    if (!sessionCache.mapStateChanged) continue;
    await strapi.entityService.update('api::operation.operation', operationId, {
      data: {
        mapState: sessionCache.mapState,
      },
    });
    sessionCache.mapStateChanged = false;
    strapi.log.info(`MapState of operation ${operationId} Persisted`);
  }
};

export { loadOperations, lifecycleOperation, updateMapState };
