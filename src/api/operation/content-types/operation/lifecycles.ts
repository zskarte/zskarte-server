import { lifecycleOperation } from '../../../../state/operations';

export default {
  afterCreate: ({ action, result }) => lifecycleOperation(action, result),
  afterUpdate: ({ action, result }) => lifecycleOperation(action, result),
};
