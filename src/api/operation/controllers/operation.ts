'use strict';

/**
 *  operation controller
 */

import { factories } from '@strapi/strapi';
import { updateMapState } from '../../../state/operation';

export default factories.createCoreController('api::operation.operation', ({ strapi }) => ({
  patch(ctx) {
    const { identifier, operationid } = ctx.request.headers;
    if (!identifier || !operationid) {
      ctx.status = 400;
      ctx.body = `Missing headers: identifier or operationId`;
      return;
    }
    const patches = ctx.request.body;
    updateMapState(operationid, identifier, patches);
    ctx.status = 200;
    return {};
  },
}));
