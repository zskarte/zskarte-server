import _ from 'lodash';
import { AccessControlConfig, AccessControlType } from '../definitions';

export const CreateAccessControlMiddlewareConfig = (config: AccessControlConfig) => {
  return { name: 'global::accessControl', config: config };
}

export const AccessControlMiddlewareRoutesConfig = (config: AccessControlConfig, otherConf:any = {}) => {
  return _.merge({
    config: {
      find: {
        middlewares: [CreateAccessControlMiddlewareConfig({ ...config, check: AccessControlType.LIST })],
      },
      findOne: {
        middlewares: [CreateAccessControlMiddlewareConfig({ ...config, check: AccessControlType.BY_ID })],
      },
      create: {
        middlewares: [CreateAccessControlMiddlewareConfig({ ...config, check: AccessControlType.CREATE })],
      },
      update: {
        middlewares: [CreateAccessControlMiddlewareConfig({ ...config, check: AccessControlType.UPDATE_BY_ID })],
      },
      delete: {
        middlewares: [CreateAccessControlMiddlewareConfig({ ...config, check: AccessControlType.BY_ID })],
      },
    },
  }, otherConf);
};
