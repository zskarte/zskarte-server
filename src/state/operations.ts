const operations = [];

const loadOperations = async (strapi) => {
  const existingOperations = await strapi.db.query('api::operation.operation').findMany({
    select: ['name', 'createdAt'],
    where: { status: 'active' },
    orderBy: { createdAt: 'DESC' },
    populate: { organization: true },
  });
  console.log(existingOperations)
//   operations.push(...strapi.config.operations);
};

const lifecycleOperation = (action, operation) => {
  console.log(action);
};

export { loadOperations, lifecycleOperation };
