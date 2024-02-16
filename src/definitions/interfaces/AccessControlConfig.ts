import { Common } from '@strapi/strapi';
import { AccessControlType } from '../../definitions';

export interface AccessControlConfig {
  type: Common.UID.ContentType;
  hasOperation: boolean;
  hasOrganization: boolean;
  check?: AccessControlType;
  notForShare?: boolean;
}
