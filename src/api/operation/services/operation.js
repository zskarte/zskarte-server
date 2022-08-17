'use strict';

/**
 * operation service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::operation.operation');
