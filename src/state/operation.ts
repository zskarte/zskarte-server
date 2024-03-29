import { applyPatches, enablePatches, Patch } from 'immer';
import { Strapi } from '@strapi/strapi';
import _ from 'lodash';
import crypto from 'crypto';

import { Operation, OperationCache, OperationStates, PatchExtended, StrapiLifecycleHook, StrapiLifecycleHooks, User } from '../definitions';
import { broadcastConnections, broadcastPatches } from './socketio';

import type { Attribute } from '@strapi/strapi';

const WEEK = 1000 * 60 * 60 * 24 * 7;
const MIN = 1000 * 60;

enablePatches();

const operationCaches: { [key: number]: OperationCache } = {};

/** Loads all active operations initially and generates the in-memory cache */
const loadOperations = async (strapi: Strapi) => {
  try {
    const activeOperations = (await strapi.entityService.findMany('api::operation.operation', {
      where: { status: OperationStates.ACTIVE },
      populate: ['organization'],
      limit: -1,
    })) as Operation[];
    for (const operation of activeOperations) {
      await lifecycleOperation(StrapiLifecycleHooks.AFTER_CREATE, operation);
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
    ((await strapi.entityService.findOne('api::operation.operation', operation.id, {
      populate: ['organization.users'],
    })) as Operation) || operation;
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_CREATE) {
    const mapState = operation.mapState || {};
    operationCaches[operation.id] = { operation, connections: [], users: [], mapState, mapStateChanged: false };
    if (!operation.organization) return;
    operationCaches[operation.id].users.push(...operation.organization.users);
  }
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_UPDATE) {
    if (operation.status === OperationStates.ARCHIVED) {
      delete operationCaches[operation.id];
      return;
    }
    operationCaches[operation.id].operation = operation;
  }
  if (lifecycleHook === StrapiLifecycleHooks.AFTER_DELETE) {
    delete operationCaches[operation.id];
  }
};

const isValidImmerPatch = (patch: Patch) => {
  if (typeof patch !== 'object' || patch === null) return false;
  if (!['replace', 'add', 'delete'].includes(patch.op)) return false;
  if (!Array.isArray(patch.path)) return false;
  if (patch.op === 'replace' || patch.op === 'add') {
    if (patch.value === undefined) return false;
  }
  return true;
};

const validatePatches = (patches: PatchExtended[]) => {
  if (!patches || !_.isArray(patches)) return [];
  return _.orderBy(_.filter(patches, isValidImmerPatch), ['timestamp'], ['asc']);
};

/** Uses the immer library to patch the server map state */
const updateMapState = async (operationId: string, identifier: string, patches: PatchExtended[]) => {
  const operationCache: OperationCache = operationCaches[operationId];
  if (!operationCache) return;
  const validatedPatches = validatePatches(patches);
  if (!validatedPatches.length) return;
  const oldMapState = operationCache.mapState;
  try {
    operationCache.mapState = applyPatches(oldMapState, validatedPatches);
  } catch (error) {
    strapi.log.error(error);
  }
  const jsonOldMapState = JSON.stringify(oldMapState);
  const jsonNewMapState = JSON.stringify(operationCache.mapState);
  const hashOldMapState = crypto.createHash('sha256').update(jsonOldMapState).digest('hex');
  const hashNewMapState = crypto.createHash('sha256').update(jsonNewMapState).digest('hex');
  const stateChanged = hashOldMapState !== hashNewMapState;

  if (!stateChanged) return;

  operationCache.mapStateChanged = true;
  broadcastPatches(operationCache, identifier, patches);
};

/** Updates the current location of a connection */
const updateCurrentLocation = async (operationId: string, identifier: string, longLat: { long: number; lat: number }) => {
  const operationCache: OperationCache = operationCaches[operationId];
  if (!operationCache) return;
  for (const connection of operationCache.connections) {
    try {
      if (connection.identifier !== identifier) continue;
      connection.currentLocation = longLat;
      broadcastConnections(operationCache);
    } catch (error) {
      connection.socket.disconnect();
      strapi.log.error(error);
    }
  }
};

/** Persist the map state to the database if something has changed */
const persistMapStates = async (strapi: Strapi) => {
  try {
    for (const [operationId, operationCache] of Object.entries(operationCaches)) {
      if (!operationCache.mapStateChanged) continue;
      await strapi.entityService.update('api::operation.operation', operationId, {
        data: {
          mapState: operationCache.mapState as any,
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
    const activeOperations = (await strapi.entityService.findMany('api::operation.operation', {
      where: { status: OperationStates.ACTIVE },
      limit: -1,
    })) as Operation[];
    for (const operation of activeOperations) {
      if (new Date(operation.updatedAt).getTime() + WEEK > new Date().getTime()) continue;
      await strapi.entityService.update('api::operation.operation', operation.id, {
        data: {
          status: OperationStates.ARCHIVED,
        },
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

const deleteGuestOperations = async (strapi: Strapi) => {
  try {
    const guestUsers = (await strapi.entityService.findMany('plugin::users-permissions.user', {
      fields: ['id', 'username', 'email'],
      filters: { username: 'zso_guest' },
      populate: ['organization.operations'],
      limit: 1,
    })) as User[];
    const guestUser = _.first(guestUsers);
    if (!guestUser?.organization?.operations) return;
    const { operations } = guestUser.organization;
    for (const operation of operations) {
      strapi.log.info(`Deleting operation ${operation.name} of guest user`);
      await strapi.db.query('api::map-snapshot.map-snapshot').deleteMany({ filters: { operation: { id: operation.id } } });
      await strapi.db.query('api::access.access').deleteMany({ filters: { operation: { id: operation.id } } });
      await strapi.entityService.delete('api::operation.operation', operation.id);
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

const createMapStateSnapshots = async (strapi: Strapi) => {
  try {
    const activeOperations = (await strapi.entityService.findMany('api::operation.operation', {
      where: { status: OperationStates.ACTIVE },
      limit: -1,
    })) as unknown as Operation[];

    strapi.log.debug(`Found ${activeOperations.length} operation to create snapshots from`);

    for (const operation of activeOperations) {
      const fiveMins = MIN * 5;
      // If the operation has not been updated in the last 5mins don't create a snapshot
      if (new Date(operation.updatedAt).getTime() + fiveMins < new Date().getTime()) continue;

      strapi.log.debug(`Creating snapshot for operation [${operation.id}]`);

      await strapi.entityService.create('api::map-snapshot.map-snapshot', {
        data: {
          operation,
          mapState: operation.mapState as Attribute.JsonValue,
          publishedAt: Date.now(),
        },
      });
    }
  } catch (error) {
    strapi.log.error(error);
  }
};

export {
  operationCaches,
  loadOperations,
  lifecycleOperation,
  updateMapState,
  updateCurrentLocation,
  persistMapStates,
  archiveOperations,
  deleteGuestOperations,
  createMapStateSnapshots,
};
