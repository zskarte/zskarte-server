export const AccessControlTypes = {
  CREATE: 'create',
  UPDATE_BY_ID: 'updateById',
  BY_ID: 'byId',
  LIST: 'list',
  NO_CHECK: 'noCheck',
} as const;
export type AccessControlType = (typeof AccessControlTypes)[keyof typeof AccessControlTypes];
