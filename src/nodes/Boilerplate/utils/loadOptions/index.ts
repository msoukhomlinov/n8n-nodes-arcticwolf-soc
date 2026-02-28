import type { INodePropertyOptions } from 'n8n-workflow';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

// eslint-disable-next-line @typescript-eslint/require-await
export async function getSampleOptions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
  return [
    { name: 'Sample A', value: 'a' },
    { name: 'Sample B', value: 'b' },
    { name: 'Sample C', value: 'c' },
  ];
}


