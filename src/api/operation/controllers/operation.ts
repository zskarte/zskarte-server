'use strict';

/**
 *  operation controller
 */

import { factories } from '@strapi/strapi';
import { updateMapState } from '../../../state/operations';

export default factories.createCoreController('api::operation.operation', ({ strapi }) => ({
  async patch(ctx) {
    const { identifier, operationid } = ctx.request.headers;
    if (!identifier || !operationid) {
      ctx.status = 400;
      ctx.body = `Missing headers: identifier or operationId`;
      return;
    }
    const patches = ctx.request.body;
    updateMapState(operationid, identifier, patches);
    ctx.status = 200;
  },
}));
