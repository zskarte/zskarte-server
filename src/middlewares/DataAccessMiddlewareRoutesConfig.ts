import { Common } from '@strapi/strapi';
import _ from 'lodash';

export const DataAccessMiddlewareRoutesConfig = (type:Common.UID.ContentType, hasOperation:boolean, hasOrganization:boolean, otherConf:any = {}) => {
  const middlewaresConf = [{ name: 'global::accessControl', config: {type:type, hasOperation:hasOperation, hasOrganization:hasOrganization} }];
  return _.merge({
    config: {
      find: {
        middlewares: middlewaresConf,
      },
      findOne: {
        middlewares: middlewaresConf,
      },
      // create: {
      //   middlewares: middlewaresConf,
      // },
      update: {
        middlewares: middlewaresConf,
      },
      delete: {
        middlewares: middlewaresConf,
      },
    },
  }, otherConf);
};
