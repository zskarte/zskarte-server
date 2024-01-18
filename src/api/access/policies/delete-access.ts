import { Strapi } from '@strapi/strapi';
import { Access } from '../../../definitions';

export default async (policyContext, _, { strapi }: { strapi: Strapi }) => {
  // Is user logged in
  if (!policyContext?.state?.user) return false;
  if (!policyContext?.state?.route) return false;
  const accessId = policyContext?.params.id
  if(accessId === undefined || accessId === null || accessId === '') return false;
  const access =
  ((await strapi.entityService.findOne('api::access.access', accessId, {
    populate: ['operation'],
  })) as Access);
  const count = await strapi.entityService.count('plugin::users-permissions.user', {
    filters: {
      organization: { operations: { id: access.operation.id } },
      id: policyContext?.state?.user.id
    }
  })

  return count > 0;
};
