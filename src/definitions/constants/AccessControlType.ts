export const AccessControlType = {
  CREATE: 'create',
  UPDATE_BY_ID: 'updateById',
  BY_ID: 'byId',
  LIST: 'list',
  NO_CHECK: 'noCheck',
} as const;
export type AccessControlType = (typeof AccessControlType)[keyof typeof AccessControlType];
