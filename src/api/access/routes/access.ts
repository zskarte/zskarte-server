/**
 * access router
 */

import { factories } from '@strapi/strapi';
import { DataAccessMiddlewareRoutesConfig } from '../../../middlewares/DataAccessMiddlewareRoutesConfig';

export default factories.createCoreRouter('api::access.access', DataAccessMiddlewareRoutesConfig('api::access.access', true, false, {
  config: {
    find: {
      policies: ['api::access.find-access'],
    },
    delete: {
      policies: ['api::access.delete-access'],
    }
  },
}));
