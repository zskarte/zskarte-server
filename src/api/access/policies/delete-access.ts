import { Access, Operation } from '../../../definitions';

export default async (policyContext, _, { strapi }) => {
  // Is user logged in
  if (!policyContext?.state?.user) return false;
  if (!policyContext?.state?.route) return false;
  const accessId = policyContext?.params.id
  if(accessId === undefined || accessId === null || accessId === '') return false;
  const access =
  ((await strapi.entityService.findOne('api::access.access', accessId, {
    populate: ['operation'],
  })) as Access);
  const operation =
    ((await strapi.entityService.findOne('api::operation.operation', access.operation.id, {
      populate: ['organization.users'],
    })) as Operation);
  const userIsAllowed = operation.organization.users.map(u => u.id).includes(policyContext?.state?.user.id);
  if(!userIsAllowed) return false;
  return true;
};
