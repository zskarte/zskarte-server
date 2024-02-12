/**
 * map-snapshot router
 */

import { factories } from '@strapi/strapi';
import { DataAccessMiddlewareRoutesConfig } from '../../../middlewares/DataAccessMiddlewareRoutesConfig';

export default factories.createCoreRouter('api::map-snapshot.map-snapshot', DataAccessMiddlewareRoutesConfig('api::map-snapshot.map-snapshot', true, false));
