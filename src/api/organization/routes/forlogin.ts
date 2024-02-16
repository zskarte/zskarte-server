import { CreateAccessControlMiddlewareConfig } from '../../../middlewares/AccessControlMiddlewareConfig';
import { AccessControlType } from '../../../definitions';

export default {
  routes: [
    {
      method: 'GET',
      path: '/organizations/forlogin',
      handler: 'organization.forLogin',
      config: {
        //no real accessControl needed as no query parameter used inside => AccessControlType.NO_CHECK
        middlewares: [CreateAccessControlMiddlewareConfig({type:'api::organization.organization', hasOperation:false, hasOrganization:false, check: AccessControlType.NO_CHECK})]
      }
    },
  ],
};
