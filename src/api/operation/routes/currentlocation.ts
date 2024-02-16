import { CreateAccessControlMiddlewareConfig } from '../../../middlewares/AccessControlMiddlewareConfig';
import { AccessControlType } from '../../../definitions';

export default {
  routes: [
    {
      method: 'POST',
      path: '/operations/mapstate/currentlocation',
      handler: 'operation.currentLocation',
      config: {
        middlewares: [CreateAccessControlMiddlewareConfig({type:'api::operation.operation', hasOperation:false, hasOrganization:true, check: AccessControlType.BY_ID})]
      }
    },
  ],
};
