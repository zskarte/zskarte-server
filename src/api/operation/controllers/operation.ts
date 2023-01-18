'use strict';

/**
 *  operation controller
 */

import { factories } from '@strapi/strapi';
import { Patch } from 'immer';
import _ from 'lodash';
import { PatchExtended } from '../../../definitions';
import { updateMapState } from '../../../state/operation';

export default factories.createCoreController('api::operation.operation', ({ strapi }) => ({
  patch(ctx) {
    const { identifier, operationid } = ctx.request.headers;
    if (!identifier || !operationid) {
      ctx.status = 400;
      ctx.body = `Missing headers: identifier or operationId`;
      return;
    }
    const patches: PatchExtended[] = ctx.request.body;
    if (!validatePatchesPayload(patches)) {
      ctx.status = 400;
      ctx.body = `Body is in a wrong format. Expected is an array of immer patches with the following structure: [{op: '', path: [''], value: {} }, ...]`;
      return;
    }
    updateMapState(operationid, identifier, patches);
    ctx.status = 200;
    return {};
  },
}));

const validatePatchesPayload = (patches: Patch[]) => {
  if (!_.isArray(patches)) return false;
  return patches.every((patch) => {
    return 'op' in patch && 'path' in patch && 'value' in patch;
  });
};
