'use strict';

/**
 * operation router.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::operation.operation', {
  config: {
    findOne: {
      policies: ['api::operation.findone-accesstoken'],
    },
  },
});
