import { archiveOperations, persistMapStates } from '../src/state/operation';

export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  cron: {
    enabled: true,
    tasks: {
      // Every hour
      '0 * * * *': async ({ strapi }) => await archiveOperations(strapi),
      // Every five seconds
      '*/5 * * * * *': async ({ strapi }) => {
        await persistMapStates(strapi);
      },
    },
  },
});
