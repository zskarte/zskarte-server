/**
 * access router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::access.access', {
  config: {
    find: {
      policies: ['api::access.find-access'],
    },
    delete: {
      policies: ['api::access.delete-access'],
    }
  },
});
