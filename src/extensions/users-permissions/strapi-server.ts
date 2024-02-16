import _ from 'lodash';
import { Organization } from '../../definitions';

export default (plugin) => {
  const me = plugin.controllers.user.me;
  const injectOrganization = async (ctx) => {
    //populate organisation and logo (for normal users)
    ctx.query.populate = ['organization.logo'];
    await me(ctx);
    const { jwt } = strapi.plugins['users-permissions'].services;
    const { operationId } = await jwt.getToken(ctx);
    if (operationId) {
      //if it's a share token login, populate corresponding organization
      const organizations = (await strapi.entityService.findMany('api::organization.organization', {
        filters: {
          operations: {
            id: { $eq: operationId },
          },
        },
        populate: ['logo'],
        limit: 1,
      })) as Organization[];
      const organization = _.first(organizations);
      ctx.body.organization = organization;
    }
  };
  plugin.controllers.user.me = injectOrganization;

  const userServiceFunc = plugin.services.user;
  const fetchAuthenticatedUserWithOrganization = (id) => {
    //this is used for load user into ctx.state.user (https://github.com/strapi/strapi/blob/main/packages/plugins/users-permissions/server/strategies/users-permissions.js#L24)
    //changed: also populate organisation
    return strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { id }, populate: ['role', 'organization'] });
  };

  //plugin.services.user is anonymous function not an object
  //to persist the override, set it in the response of the function call
  plugin.services.user = (initParamObj) => {
    const userService = userServiceFunc(initParamObj);
    userService.fetchAuthenticatedUser = fetchAuthenticatedUserWithOrganization;
    return userService
  };

  return plugin;
};
