export default {
  routes: [
    {
      method: 'POST',
      path: '/operations/mapstate/patch',
      handler: 'operation.patch',
      config: {
        middlewares: [{ name: 'global::accessControl', config: {type:'api::operation.operation', hasOperation:false, hasOrganization:true} }]
      }
    },
  ],
};
