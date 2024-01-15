'use strict';

/**
 *  operation controller
 */

import { factories } from '@strapi/strapi';
import { Operation, PatchExtended } from '../../../definitions';
import { operationCaches, updateCurrentLocation, updateMapState } from '../../../state/operation';

export default factories.createCoreController('api::operation.operation', ({ strapi }) => ({
  async findOne(ctx) {
    const { id } = ctx.params;
    const { query } = ctx;

    const entity: Operation = await strapi.service('api::operation.operation').findOne(id, query);
    const sanitizedEntity = (await this.sanitizeOutput(entity, ctx)) as Operation;

    const operationCache = operationCaches[entity.id];
    if (operationCache) {
      sanitizedEntity.mapState = operationCache.mapState;
    }

    return this.transformResponse(sanitizedEntity);
  },
  async patch(ctx) {
    const { identifier, operationid } = ctx.request.headers;
    if (!identifier || !operationid) {
      ctx.status = 400;
      ctx.body = 'Missing headers: identifier or operationId';
      return;
    }
    const patches: PatchExtended[] = ctx.request.body;
    await updateMapState(operationid, identifier, patches);
    ctx.status = 200;
  },
  async currentLocation(ctx) {
    const { identifier, operationid } = ctx.request.headers;
    if (!identifier || !operationid) {
      ctx.status = 400;
      ctx.body = 'Missing headers: identifier or operationId';
      return;
    }
    const { long, lat } = ctx.request.body;
    await updateCurrentLocation(operationid, identifier, { long, lat });
    ctx.status = 200;
  },
}));
