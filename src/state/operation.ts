import { applyPatches, enablePatches, produce } from 'immer';
import { Strapi } from '@strapi/strapi';
import _ from 'lodash';
import crypto from 'crypto';

import { Operation, OperationCache, PatchExtended, StrapiLifecycleHook, User } from './interfaces';
import { broadcastPatches } from './socketio';

const WEEK = 1000 * 60 * 60 * 24 * 7;

enablePatches();

const operationCaches: { [key: number]: OperationCache } = {};

/** Loads all active operations initially and generates the in-memory cache */
const loadOperations = async (strapi: Strapi) => {
  try {
    const activeOperations: Operation[] = await strapi.entityService.findMany('api::operation.operation', {
      where: { status: 'active' },
      populate: ['organization'],
    });
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
  operation =
    (await strapi.entityService.findOne('api::operation.operation', operation.id, {
      populate: ['organization.users'],
    })) || operation;
  if (lifecycleHook === StrapiLifecycleHook.AFTER_CREATE) {
    const mapState = operation.mapState || {};
    operationCaches[operation.id] = { operation, connections: [], users: [], mapState, mapStateChanged: false };
    if (!operation.organization) return;
    operationCaches[operation.id].users.push(...operation.organization.users);
  }
  if (lifecycleHook === StrapiLifecycleHook.AFTER_UPDATE) {
    operationCaches[operation.id].operation = operation;
  }
  if (lifecycleHook === StrapiLifecycleHook.AFTER_DELETE) {
    delete operationCaches[operation.id];
  }
};

/** Uses the immer library to patch the server map state */
const updateMapState = async (operationId: string, identifier: string, patches: PatchExtended[]) => {
  const operationCache: OperationCache = operationCaches[operationId];
  if (!operationCache) return;
  const orderedPatches = _.orderBy(patches, ['timestamp'], ['asc']);
  const oldMapState = operationCache.mapState;
  operationCache.mapState = applyPatches(oldMapState, orderedPatches);

  const jsonOldMapState = JSON.stringify(oldMapState);
  const jsonNewMapState = JSON.stringify(operationCache.mapState);
  const hashOldMapState = crypto.createHash('sha256').update(jsonOldMapState).digest('hex');
  const hashNewMapState = crypto.createHash('sha256').update(jsonNewMapState).digest('hex');
  const stateChanged = hashOldMapState !== hashNewMapState;

  console.log('stateChanged', stateChanged);
  if (!stateChanged) return;

  operationCache.mapStateChanged = true;
  broadcastPatches(operationCache, identifier, patches);
};

/** Persist the map state to the database if something has changed */
const persistMapStates = async (strapi: Strapi) => {
  try {
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
  } catch (error) {
    strapi.log.error(error);
  }
};

/** Archive operations who are active and are not updated since 7 days */
const archiveOperations = async (strapi: Strapi) => {
  try {
    const activeOperations: Operation[] = await strapi.entityService.findMany('api::operation.operation', {
      where: { status: 'active' },
    });
    for (const operation of activeOperations) {
      if (new Date(operation.updatedAt).getTime() + WEEK > new Date().getTime()) continue;
      await strapi.entityService.update('api::operation.operation', operation.id, {
        data: {
          status: 'archived',
        },
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

export { operationCaches, loadOperations, lifecycleOperation, updateMapState, persistMapStates, archiveOperations };
