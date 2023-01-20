export default async (policyContext, _, { strapi }) => {
  // Is user logged in
  if (!policyContext?.state?.user) return false;
  if (!policyContext?.state?.route) return false;
  const { jwt } = strapi.plugins['users-permissions'].services;
  const { operationId } = await jwt.getToken(policyContext);
  if (!operationId) return true;
  const { id = 0 } = policyContext.params;
  if (isNaN(id) || id == '0') return false;
  return operationId === parseInt(id);
};
