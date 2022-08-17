export default [
  {
    name: 'connection',
    handler: ({ strapi }, socket) => {
      strapi.log.info(`[io] new connection with id ${socket.id}`);
    },
  },
  {
    name: 'state-patch',
    handler: ({ strapi }, patch) => {
        
    },
  },
];
