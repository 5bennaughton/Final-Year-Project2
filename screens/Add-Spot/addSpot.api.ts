import { API_BASE } from '@/constants/constants';
import { requestJson } from '@/helpers/helpers';
import type { SpotPayload } from './addSpot.types';

export async function createGlobalSpot(payload: SpotPayload) {
  return requestJson(
    `${API_BASE}/global-spots/add-spot`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Create spot failed'
  );
}
