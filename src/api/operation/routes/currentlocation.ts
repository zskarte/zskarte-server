export default {
  routes: [
    {
      method: 'POST',
      path: '/operations/mapstate/currentlocation',
      handler: 'operation.currentLocation',
      config: {
        middlewares: [{ name: 'global::accessControl', config: {type:'api::operation.operation', hasOperation:false, hasOrganization:true} }]
      }
    },
  ],
};
