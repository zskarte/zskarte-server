const utils = require('@strapi/utils');
import { getService } from '@strapi/plugin-users-permissions/server/utils';
import _ from 'lodash';
import { Organization } from '../../definitions';
const { sanitize } = utils;

export default (plugin) => {
  const me = plugin.controllers.user.me;
  const injectOrganization = async (ctx) => {
    await me(ctx);
    const { jwt } = strapi.plugins['users-permissions'].services;
    const { operationId } = await jwt.getToken(ctx);
    if (operationId) {
      const organization: Organization = _.first(
        await strapi.entityService.findMany('api::organization.organization', {
          filters: {
            operations: {
              id: { $eq: operationId },
            },
          },
          populate: ['logo'],
          limit: 1,
        })
      );
      ctx.body.organization = organization;
    }
  };
  plugin.controllers.user.me = injectOrganization;
  return plugin;
};
