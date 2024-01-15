import { Organization, StrapiObject } from '.';
import { PatchExtended } from '../PatchExtended';

export interface Operation extends StrapiObject {
  name: string;
  description: string;
  status: string;
  mapState: object;
  organization: Organization;
  patches: PatchExtended[];
}
