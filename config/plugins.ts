import events from '../src/state/socketio';

export default ({ env }) => ({
  io: {
    enabled: true,
    config: {
      IOServerOptions: {
        transports: ['websocket'],
        cors: {
          origins: '*:*',
        },
      },
      events,
    },
  },
});
