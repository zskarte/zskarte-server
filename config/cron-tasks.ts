import { archiveOperations, persistMapStates } from '../src/state/operation';

export default {
  // Every hour
  '0 * * * *': async ({ strapi }) => await archiveOperations(strapi),
  // Every five seconds
  '*/5 * * * * *': async ({ strapi }) => {
    await persistMapStates(strapi);
  },
};
