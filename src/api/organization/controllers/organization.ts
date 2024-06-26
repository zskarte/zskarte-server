'use strict';

/**
 *  organization controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::organization.organization', ({ strapi }) => ({
  async forLogin(ctx) {
    await this.validateQuery(ctx);
    const { results } = await strapi.service('api::organization.organization').find({
      fields: ['name'],
      populate: {
        users: {
          fields: ['username','email'],
        },
        logo: {}
      },
      pagination: {limit: -1},
      sort: ['name']
    });

    const sanitizedResults = await this.sanitizeOutput(results, ctx);
    return this.transformResponse(sanitizedResults);
  }
}));
