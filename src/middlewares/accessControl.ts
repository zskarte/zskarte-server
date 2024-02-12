/**
 * `accessControl` middleware
 */

import { Strapi, Common } from '@strapi/strapi';
import { Context } from 'koa';
import { Operation, Organization } from '../definitions';

export default (config: {type:Common.UID.ContentType, hasOperation:boolean, hasOrganization:boolean}, { strapi }: { strapi: Strapi }) => {
  //ATTENTION: authenticate role need "find" right on Users-permission -> USER, to make the filter work as expected, otherwise "Invalid parameter users" error occure.
  return async (ctx:Context, next) => {
    const { id:userId } = ctx.state?.user;
    const { jwt } = strapi.plugins['users-permissions'].services;
    const { operationId:jwtOperationId } = await jwt.getToken(ctx);
    if (userId == null && jwtOperationId == null){
      return ctx.unauthorized('This action is unauthorized.');
    }
    const handler:string = ctx.state?.route?.handler;
    if (handler.endsWith('.find')) {
      //add filter to make sure only elements that are allowed are returned.
      const statusFilter = ctx.query?.status;
      //override any existing filter given from query (they are not allowed / are not secure / could bypass the accessControl logic)
      ctx.query.filters = undefined;
      //TODO: also remove any "population" (for same reasons) and add separate endpoint for the usecases
      //ctx.query.population = undefined;
      if (config.hasOperation){
        if (jwtOperationId != null){
          ctx.query.filters = {'operation':{'id':{'$eq':jwtOperationId}}} as any;
        } else {
          ctx.query.filters = {'operation':{'organization':{'users':{'id':{'$eq':userId}}}}} as any;
        }
        if (statusFilter == 'all'){
          //no filter needed
        } else if (statusFilter == 'archived'){
          (ctx.query.filters as any).operation['status'] = {'$eq':'archived'};
        } else {
          //active or not set
          (ctx.query.filters as any).operation['status'] = {'$eq':'active'};
        }
      } else if (config.hasOrganization) {
        if (config.type == 'api::operation.operation'){
          if (jwtOperationId != null){
            ctx.query.filters = {'id':{'$eq':jwtOperationId}} as any;
          } else {
            ctx.query.filters = {'organization':{'users':{'id':{'$eq':userId}}}} as any;
          }
          if (statusFilter == 'all'){
            //no filter needed
          } else if (statusFilter == 'archived'){
            (ctx.query.filters as any)['status'] = {'$eq':'archived'};
          } else {
            //active or not set
            (ctx.query.filters as any)['status'] = {'$eq':'active'};
          }
        } else {
          if (jwtOperationId != null){
            return ctx.unauthorized('This action is unauthorized, unknown context.');
          } else {
            ctx.query.filters = {'organization':{'users':{'id':{'$eq':userId}}}} as any;
          }
        }
      } else {
        return ctx.forbidden('This action is forbidden, unknown context.');
      }
      return next();
    } else {
      //load destination object and check if loggedin user has right to use it before call real controller function.
      const entryId:number = ctx.params?.id ?? ctx.request.headers?.operationid;
      let entry:any = null;
      let operation:Operation = null;
      let organization:Organization = null;
      let allowedUserIds:number[] = [];
      if (entryId && config.hasOperation) {
        entry = await strapi.entityService.findOne(
          config.type,
          entryId,
          { populate: ['operation.organization.users'] }
        );
        if (entry){
          operation = entry.operation;
        }
      } else if (entryId && config.hasOrganization) {
        entry = await strapi.entityService.findOne(
          config.type,
          entryId,
          { populate: ['organization.users'], }
        );
        if (config.type == 'api::operation.operation'){
          operation = entry;
        } else {
          organization = operation.organization;
        }
      }
      if (operation) {
        organization = operation.organization;
      }
      if (organization) {
        allowedUserIds = organization.users.map(u => u.id);
      }

      //prevent update archived operations
      if (config.type == 'api::operation.operation' && (handler.endsWith('.patch') || handler.endsWith('.update'))){
        if (operation?.status == 'archived'){
          return ctx.forbidden('The operation is archived, no update allowed.');
        }
      }

      if (jwtOperationId != null && jwtOperationId == operation.id) {
        //share link login try to access defined operation
        return next();
      } else if (userId != null && allowedUserIds.includes(userId)) {
        //loggedin user is in corresponding organization
        return next();
      } else {
        //return ctx.forbidden('This action is forbidden.');
      }
    }
    return ctx.forbidden('This action is forbidden.');
  };
};
