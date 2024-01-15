import { Socket } from 'socket.io/dist/socket';
import { User } from './collection-types';

export interface Connection {
  user: User;
  socket: Socket;
  identifier: string;
}
