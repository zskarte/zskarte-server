import { Strapi } from '@strapi/strapi';
import { Operation } from './interfaces';
import { operationCaches } from './operation';

const HOUR = 1000 * 60 * 60;
const WEEK = 1000 * 60 * 60 * 24 * 7;

/** Set intervals for recurrent jobs */
const loadJobs = () => {
  setInterval(() => persistMapStates(strapi), 5000);
  setInterval(() => archiveOperations(strapi), HOUR);
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

const archiveOperations = async (strapi: Strapi) => {
  try {
    const operations = (await strapi.db.query('api::operation.operation').findMany({
      where: { status: 'active' },
    })) as Operation[];
    for (const operation of operations) {
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

export { persistMapStates, loadJobs };
