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
      contentTypes: {
        message: '*',
        chat: ['create'],
      },
      events: [
        {
          name: 'connection',
          handler: ({ strapi }, socket) => {
            strapi.log.info(`[io] new connection with id ${socket.id}`);
          },
        },
      ],
    },
  },
});
