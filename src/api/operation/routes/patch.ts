import { CreateAccessControlMiddlewareConfig } from '../../../middlewares/AccessControlMiddlewareConfig';
import { AccessControlType } from '../../../definitions';

export default {
  routes: [
    {
      method: 'POST',
      path: '/operations/mapstate/patch',
      handler: 'operation.patch',
      config: {
        middlewares: [CreateAccessControlMiddlewareConfig({type:'api::operation.operation', hasOperation:false, hasOrganization:true, check: AccessControlType.BY_ID})]
      }
    },
  ],
};
