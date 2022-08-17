'use strict';

/**
 * operation router.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::operation.operation');
