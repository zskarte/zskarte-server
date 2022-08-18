import { Strapi } from '@strapi/strapi';
import _ from 'lodash';
import { Operation, StrapiLifecycleHook, User } from './interfaces';
import { sessionCaches } from './session';

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
  }
};

const lifecycleOperation = async (lifecycleHook: StrapiLifecycleHook, operation: Operation) => {
  if (lifecycleHook === StrapiLifecycleHook.AFTER_CREATE) {
    sessionCaches[operation.id] = { operation, connections: [], users: [] };
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

export { loadOperations, lifecycleOperation };
