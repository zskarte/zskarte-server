/**
 * `accessControl` middleware
 */

import { Strapi } from '@strapi/strapi';
import { Operation, Organization, AccessControlConfig, AccessControlType } from '../definitions';

export default (config: AccessControlConfig, { strapi }: { strapi: Strapi }) => {
  return async (ctx, next) => {
    ctx.state.accessControlExecuted = true;
    if (config.check == AccessControlType.NO_CHECK) {
        //function is explicit marked as no filter/check needed
        return next();
    }

    const { id:userOrganisationId } = ctx.state?.user?.organization ?? {};
    const { jwt } = strapi.plugins['users-permissions'].services;
    const { operationId:jwtOperationId } = (await jwt.getToken(ctx)) ?? {};
    if (userOrganisationId == null && jwtOperationId == null){
      return ctx.unauthorized('This action is unauthorized.');
    }
    if (jwtOperationId != null && config.notForShare){
      strapi.log.warn('[global::accessControl]: access not allowed, notForShare endpoint, url:' + ctx.request.url + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
      return ctx.forbidden('This action is forbidden.');
    }

    const handler:string = ctx.state?.route?.handler;
    if (config.check == AccessControlType.CREATE) {
      //verify relations are allowed values
      if (ctx.request.body.data?.id !== undefined){
        //submitting / forcing entry id not allowed
        strapi.log.warn('[global::accessControl]: create with forcing entry id, url:' + ctx.request.url + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', ctx.request.body.data?.id:' + JSON.stringify(ctx.request.body.data?.id) + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
        return ctx.forbidden('This action is forbidden.');
      }
      if (config.hasOperation){
        if (!ctx.request.body.data?.operation){
          //null, undefined, 0 are all not allowed
          strapi.log.warn('[global::accessControl]: create with no operation, url:' + ctx.request.url + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', ctx.request.body.data?.operation:' + JSON.stringify(ctx.request.body.data?.operation) + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
          return ctx.forbidden('This action is forbidden.');
        }
        if (jwtOperationId != null) {
          if (ctx.request.body.data?.operation != jwtOperationId){
            strapi.log.warn('[global::accessControl]: create with other operation, url:' + ctx.request.url + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', ctx.request.body.data?.operation:' + JSON.stringify(ctx.request.body.data?.operation) + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
            return ctx.forbidden('This action is forbidden.');
          }
        } else {
          let operation = null;
          try {
            operation = await strapi.entityService.findOne(
              'api::operation.operation',
              ctx.request.body.data?.operation,
              { populate: ['organization.id'], }
            );
          } catch (ex){
            //e.g. if ctx.request.body.data?.operation is an object not an id
          }
          if (!operation || operation.organization?.id != userOrganisationId){
            strapi.log.warn('[global::accessControl]: create with other operation, url:' + ctx.request.url + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', ctx.request.body.data?.operation:' + JSON.stringify(ctx.request.body.data?.operation) + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
            return ctx.forbidden('This action is forbidden.');
          }
        }
      }
      if (config.hasOrganization){
        if (!ctx.request.body.data?.organization || ctx.request.body.data?.organization != userOrganisationId) {
          strapi.log.warn('[global::accessControl]: create with other/no organization, url:' + ctx.request.url + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', ctx.request.body.data?.organization:' + JSON.stringify(ctx.request.body.data?.organization) + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
          return ctx.forbidden('This action is forbidden.');
        }
      }
      return next();

    } else if (config.check == AccessControlType.LIST) {
      //add filter to make sure only elements that are allowed are returned.
      const statusFilter = ctx.query?.status;
      const operationIdFilter = ctx.query?.operationId;
      if (config.hasOperation){
        if (jwtOperationId != null){
          ctx.query.filters = {'operation':{'id':{'$eq':jwtOperationId}}};
        } else {
          ctx.query.filters = {'operation':{'organization':{'id':{'$eq':userOrganisationId}}}};
          if (operationIdFilter) {
            ctx.query.filters.operation['id'] = {'$eq':operationIdFilter};
          }
        }
        if (statusFilter == 'all'){
          //no filter needed
        } else if (statusFilter == 'archived'){
          ctx.query.filters.operation['status'] = {'$eq':'archived'};
        } else {
          //active or not set
          ctx.query.filters.operation['status'] = {'$eq':'active'};
        }
        return next();
      } else if (config.hasOrganization) {
        if (config.type == 'api::operation.operation'){
          if (jwtOperationId != null){
            ctx.query.filters = {'id':{'$eq':jwtOperationId}};
          } else {
            ctx.query.filters = {'organization':{'id':{'$eq':userOrganisationId}}};
            if (operationIdFilter) {
              ctx.query.filters['id'] = {'$eq':operationIdFilter};
            }
          }
          if (statusFilter == 'all'){
            //no filter needed
          } else if (statusFilter == 'archived'){
            ctx.query.filters['status'] = {'$eq':'archived'};
          } else {
            //active or not set
            ctx.query.filters['status'] = {'$eq':'active'};
          }
        } else {
          if (jwtOperationId != null){
            return ctx.unauthorized('This action is unauthorized, unknown context.');
          } else {
            ctx.query.filters = {'organization':{'id':{'$eq':userOrganisationId}}};
          }
        }
        return next();
      } else if (config.type == 'api::organization.organization') {
        if (jwtOperationId != null){
          ctx.query.filters = {'operations':{'id':{'$eq':jwtOperationId}}};
        } else {
          ctx.query.filters = {'id':{'$eq':userOrganisationId}};
        }
        return next();
      } else {
        strapi.log.error(`[global::accessControl] unknown context, handler: ${handler}, url: ${ctx.request.url}`);
        return ctx.forbidden('This action is forbidden, unknown context.');
      }

    } else if (config.check == AccessControlType.BY_ID || config.check == AccessControlType.UPDATE_BY_ID) {
      //load desired object and check if loggedin user has right to use it, before call real controller function.
      const paramId = ctx.params?.id
      //ctx.params?.id is url encoded, abort on try NewLine-Log-Injection (in db error message)
      //if (paramId != paramId?.replace(/[\r\n]/gm, '')){
      if (paramId && !/^\d+$/.test(paramId)){
        //prevent requests with invalid paramId's (not numbers)
        return ctx.forbidden('This action is forbidden.');
      }
      const headerOperationId = ctx.request.headers?.operationid;
      if (headerOperationId && !/^\d+$/.test(headerOperationId)){
        //prevent requests with invalid headerOperationId's (not numbers)
        return ctx.forbidden('This action is forbidden.');
      }
      const entryId = (config.type == 'api::operation.operation') ? (paramId ?? headerOperationId) : paramId;
      let entry:any = null;
      let operation:Operation = null;
      let organization:Organization = null;
      if (config.hasOperation) {
        if (entryId){
          entry = await strapi.entityService.findOne(
            config.type,
            entryId,
            { fields:['id'], populate: {'operation': {'fields':['id'], 'populate': {'organization':{'fields':['id']}}}} as any }
          );
          if (entry){
            operation = entry.operation;
          }
        }
      } else if (config.hasOrganization) {
        if (entryId){
          entry = await strapi.entityService.findOne(
            config.type,
            entryId,
            { fields:['id'], populate: {'organization':{'fields':['id']}} as any }
          );
          if (entry){
            if (config.type == 'api::operation.operation'){
              operation = entry;
            } else {
              organization = entry.organization;
            }
          }
        }
      } else if (config.type == 'api::organization.organization') {
        organization = {id: entryId} as Organization;
      } else {
        strapi.log.error(`[global::accessControl] unknown context, handler: ${handler}, url: ${ctx.request.url}`);
        return ctx.forbidden('This action is forbidden, unknown context.');
      }
      if (operation) {
        organization = operation.organization;
      }

      //prevent update archived operations
      if (config.type == 'api::operation.operation' && (handler.endsWith('.patch') || handler.endsWith('.update'))){
        if (operation?.status == 'archived'){
          return ctx.forbidden('The operation is archived, no update allowed.');
        }
      }

      if (jwtOperationId != null && operation != null && jwtOperationId == operation.id) {
        //share link login accessing valid operation
      } else if (userOrganisationId != null && organization != null && userOrganisationId == organization.id) {
        //loggedin user is in corresponding organization
      } else if (!operation && !organization){
        //entry not found
        //return ctx.notFound();
        //don't leak this information
        return ctx.forbidden('This action is forbidden.');
      } else {
        strapi.log.warn('[global::accessControl]: access not allowed, url:' + ctx.request.url + ', entry:' + JSON.stringify(entry) + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', paramId:' + paramId + ', headerOperationId:' + headerOperationId + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
        return ctx.forbidden('This action is forbidden.');
      }

      if(config.check == AccessControlType.UPDATE_BY_ID) {
        //verify entryId/relations of data to update/save are allowed values
        if (ctx.request.body.data?.id && (ctx.request.body.data?.id === null || (ctx.request.body.data?.id !== undefined && ctx.request.body.data?.id != entryId))){
          strapi.log.warn('[global::accessControl]: update to other id, url:' + ctx.request.url + ', entry:' + JSON.stringify(entry) + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', paramId:' + paramId + ', ctx.request.body.id:' + JSON.stringify(ctx.request.body.data?.id) + ', headerOperationId:' + headerOperationId + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
          return ctx.forbidden('This action is forbidden.');
        }
        if (config.hasOperation && (ctx.request.body.data?.operation === null || (ctx.request.body.data?.operation !== undefined && operation?.id != ctx.request.body.data?.operation))){
          strapi.log.warn('[global::accessControl]: update to other operation, url:' + ctx.request.url + ', entry:' + JSON.stringify(entry) + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', paramId:' + paramId + ', ctx.request.body.operation:' + JSON.stringify(ctx.request.body.data?.operation) + ', headerOperationId:' + headerOperationId + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
          return ctx.forbidden('This action is forbidden.');
        }
        if (config.hasOrganization && (ctx.request.body.data?.organization === null || (ctx.request.body.data?.organization !== undefined && organization?.id != ctx.request.body.data?.organization))){
          strapi.log.warn(config.hasOrganization + ' ' + (ctx.request.body.data?.organization == null) + ' ' + (ctx.request.body.data?.organization !== undefined) + ' ' + (organization?.id != ctx.request.body.data?.organization));
          strapi.log.warn('[global::accessControl]: update to other organization, url:' + ctx.request.url + ', entry:' + JSON.stringify(entry) + ', userOrganisationId:' + userOrganisationId + ', jwtOperationId:' + jwtOperationId + ', paramId:' + paramId + ', ctx.request.body.organization:' + JSON.stringify(ctx.request.body.data?.organization) + ', headerOperationId:' + headerOperationId + ', ip:' + ctx.request.ip + ', user-agent:' + ctx.request.headers['user-agent']);
          return ctx.forbidden('This action is forbidden.');
        }
      }
      return next();

    } else {
      strapi.log.error(`[global::accessControl]: config.check value missing for handler: ${handler}, url: ${ctx.request.url}`);
      return ctx.forbidden('This action is forbidden, unknown mode.');
    }
  };
};
