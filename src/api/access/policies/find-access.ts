import { Operation } from '../../../definitions';

export default async (policyContext, _, { strapi }) => {
  // Is user logged in
  if (!policyContext?.state?.user) return false;
  if (!policyContext?.state?.route) return false;
  const queryString = policyContext.originalUrl.split('?')[1];
  const queryParams = new URLSearchParams(queryString);
  const operationId = queryParams.get('operationId');
  if(operationId === undefined || operationId === null || operationId === '') return false;
  const operation =
    ((await strapi.entityService.findOne('api::operation.operation', operationId, {
      populate: ['organization.users'],
    })) as Operation);
  const userIsAllowed = operation.organization.users.map(u => u.id).includes(policyContext?.state?.user.id);
  if(!userIsAllowed) return false;
  return true;
};
