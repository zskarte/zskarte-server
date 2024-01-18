import { Strapi } from '@strapi/strapi';

export default async (policyContext, _, { strapi }: { strapi: Strapi }) => {
  // Is user logged in
  if (!policyContext?.state?.user) return false;
  if (!policyContext?.state?.route) return false;
  const queryString = policyContext.originalUrl.split('?')[1];
  const queryParams = new URLSearchParams(queryString);
  const operationId = queryParams.get('operationId');
  if(operationId === undefined || operationId === null || operationId === '') return false;
  const count = await strapi.entityService.count('plugin::users-permissions.user', {
    filters: {
      organization: { operations: { id: operationId } },
      id: policyContext?.state?.user.id
    }
  })

  return count > 0;
};
