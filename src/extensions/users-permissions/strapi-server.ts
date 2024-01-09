import _ from 'lodash';
import { Organization } from '../../definitions';

export default (plugin) => {
  const me = plugin.controllers.user.me;
  const injectOrganization = async (ctx) => {
    await me(ctx);
    const { jwt } = strapi.plugins['users-permissions'].services;
    const { operationId } = await jwt.getToken(ctx);
    if (operationId) {
      const organizations = (await strapi.entityService.findMany('api::organization.organization', {
        filters: {
          operations: {
            id: { $eq: operationId },
          },
        },
        populate: ['logo'],
        limit: 1,
      })) as unknown as Organization[];
      const organization = _.first(organizations);
      ctx.body.organization = organization;
    }
  };
  plugin.controllers.user.me = injectOrganization;
  return plugin;
};
