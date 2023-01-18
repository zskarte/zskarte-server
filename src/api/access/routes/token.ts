export default {
  routes: [
    {
      method: 'POST',
      path: '/accesses/auth/token',
      handler: 'access.token',
    },
    {
      method: 'POST',
      path: '/accesses/auth/token/generate',
      handler: 'access.generate',
    },
  ],
};
