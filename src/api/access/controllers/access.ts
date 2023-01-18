/**
 * access controller
 */

import { factories } from '@strapi/strapi';
import utils from '@strapi/utils';
import _ from 'lodash';
import { Access, AccessType, Operation, User } from '../../../definitions';
import crypto from 'crypto';
const { sanitize } = utils;

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');

  return sanitize.contentAPI.output(user, userSchema, { auth });
};

export default factories.createCoreController('api::access.access', {
  async refresh(ctx) {
    const { user } = ctx.state;
    const { id } = user;

    const { jwt } = strapi.plugins['users-permissions'].services;
    const { exp, iat, ...origToken } = await jwt.getToken(ctx);
    const token = jwt.issue({ ...origToken, id });

    ctx.send({
      jwt: token,
      user: await sanitizeUser(user, ctx),
    });
  },
  async token(ctx) {
    const { accessToken } = ctx.request.body;
    if (!accessToken) return ctx.badRequest('No access token provided');

    const { jwt } = strapi.plugins['users-permissions'].services;

    const access: Access = _.first(
      await strapi.entityService.findMany('api::access.access', {
        filters: { active: true },
        populate: {
          operation: {
            fields: ['id'],
          },
        },
      })
    );

    if (!access) return ctx.unauthorized('Invalid access token');
    if (!access.active) return ctx.unauthorized('Access is not active anymore');
    if (!access.operation) return ctx.unauthorized('Access has no operation assigned');

    const accessUser: User = _.first(
      await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { username: `operation_${access.type}` },
      })
    );

    if (!accessUser) return ctx.unauthorized(`Couldn't find the default access user for type ${access.type}`);

    const token = jwt.issue({ id: accessUser.id, operationId: access.operation.id });

    ctx.send({
      jwt: token,
      user: await sanitizeUser(accessUser, ctx),
    });
  },
  async generate(ctx) {
    const { user } = ctx.state;
    const { id } = user;
    const { name, type, operationId } = ctx.request.body;

    if (!type) return ctx.badRequest('You must define the "type" property');
    if (!Object.values(AccessType).includes(type))
      return ctx.badRequest('The "type" property has an invalid value. Allowed values are: [read, write, admin]');

    if (!operationId) return ctx.badRequest('You must define the "operationId" property');
    const operation: Operation = _.first(
      await strapi.entityService.findMany('api::operation.operation', {
        filters: {
          id: operationId,
          organization: {
            users: {
              id: { $eq: id },
            },
          },
        },
      })
    );
    if (!operation)
      return ctx.badRequest('The operation you provided does not exist or the operation does not match your account organization!');

    const accessToken = crypto.randomBytes(16).toString('hex');

    await strapi.entityService.create('api::access.access', {
      data: { name, type, accessToken, operation },
    });

    ctx.send({ accessToken });
  },
});
