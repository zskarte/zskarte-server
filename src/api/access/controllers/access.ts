/**
 * access controller
 */

import { factories } from '@strapi/strapi';
import utils from '@strapi/utils';
const { sanitize } = utils;

export const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');

  return sanitize.contentAPI.output(user, userSchema, { auth });
};

export default factories.createCoreController('api::access.access', {
  async refresh(ctx) {
    const { user } = ctx.state;
    const { id } = user;

    const { jwt } = strapi.plugins['users-permissions'].services;
    const token = jwt.issue({ id });

    ctx.send({
      jwt: token,
      user: await sanitizeUser(user, ctx),
    });
  },
});
