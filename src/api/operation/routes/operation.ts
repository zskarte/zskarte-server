'use strict';

/**
 * operation router.
 */

import { factories } from '@strapi/strapi';
import { DataAccessMiddlewareRoutesConfig } from '../../../middlewares/DataAccessMiddlewareRoutesConfig';

export default factories.createCoreRouter('api::operation.operation', DataAccessMiddlewareRoutesConfig('api::operation.operation', false, true, {
  config: {
    findOne: {
      policies: ['api::operation.findone-accesstoken'],
    },
  },
}));
