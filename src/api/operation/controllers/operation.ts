'use strict';

/**
 *  operation controller
 */

import { factories } from '@strapi/strapi';
import { Operation, PatchExtended } from '../../../definitions';
import { operationCaches, updateCurrentLocation, updateMapState } from '../../../state/operation';
import _ from 'lodash';

export default factories.createCoreController('api::operation.operation', ({ strapi }) => ({
  async findOne(ctx) {
    const { id } = ctx.params;
    await this.validateQuery(ctx);
    const sanitizedQuery = await this.sanitizeQuery(ctx);
    const entity = await strapi.service('api::operation.operation').findOne(id, sanitizedQuery);
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
      return { message: 'Missing headers: identifier or operationId' }
    }
    const patches: PatchExtended[] = ctx.request.body;
    await updateMapState(operationid, identifier, patches);
    ctx.status = 200;
    return { success: true };
  },
  async currentLocation(ctx) {
    const { identifier, operationid } = ctx.request.headers;
    if (!identifier || !operationid) {
      ctx.status = 400;
      return { message: 'Missing headers: identifier or operationId' }
    }
    const { long, lat } = ctx.request.body;
    if (!_.isEmpty(ctx.request.body) && (typeof(long) !== 'number' || typeof(long) !== 'number')){
      //if value submitted but not number, prevent save / populate to other user
      ctx.status = 400;
      return { message: 'invalid coordinates' }
    }
    await updateCurrentLocation(operationid, identifier, { long, lat });
    ctx.status = 200;
    return { success: true };
  },
}));
