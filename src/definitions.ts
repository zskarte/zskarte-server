import { Patch } from 'immer';
import { Socket } from 'socket.io/dist/socket';

export enum StrapiLifecycleHook {
  AFTER_CREATE = 'afterCreate',
  AFTER_UPDATE = 'afterUpdate',
  AFTER_DELETE = 'afterDelete',
}

export enum WEBSOCKET_EVENT {
  STATE_PATCHES = 'state:patches',
}

export enum OperationState {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum AccessType {
  READ = 'read',
  WRITE = 'write',
  ALL = 'all',
}

export interface StrapiObject {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Access extends StrapiObject {
  name: string;
  accessToken: string;
  operation: Operation;
  type: AccessType;
  active: boolean;
}

export interface Role extends StrapiObject {
  name: string;
  description: string;
  type: string;
}

export interface User extends StrapiObject {
  username: string;
  email: string;
  password: string;
  confirmed: boolean;
  blocked: boolean;
  role: Role;
  organization: Organization;
}

export interface Organization extends StrapiObject {
  name: string;
  mapLongitude: number;
  mapLatitude: number;
  mapZoomLevel: number;
  defaultLocale: string;
  url: string;
  logo: any;
  operations: Operation[];
  users: User[];
}

export interface Operation extends StrapiObject {
  name: string;
  description: string;
  status: string;
  mapState: object;
  organization: Organization;
  patches: Patch[];
}

export interface Connection {
  user: User;
  socket: Socket;
  identifier: string;
}

export interface OperationCache {
  operation: Operation;
  connections: Connection[];
  users: User[];
  mapState: object;
  mapStateChanged: boolean;
}

export interface PatchExtended extends Patch {
  timestamp: Date;
  identifier: string;
}
