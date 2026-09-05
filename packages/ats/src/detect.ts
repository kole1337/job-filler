import type { Adapter, AdapterContext } from './types';
import { workdayAdapter } from './adapters/workday';
import { greenhouseAdapter } from './adapters/greenhouse';
import { leverAdapter } from './adapters/lever';
import { ashbyAdapter } from './adapters/ashby';
import { genericAdapter } from './adapters/generic';

/** Most specific first; generic always matches last. */
export const ADAPTERS: Adapter[] = [
  workdayAdapter,
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
  genericAdapter,
];

export function contextFromLocation(url: string, document?: Document): AdapterContext {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    /* leave blank */
  }
  return { url, hostname, document };
}

export function detectAdapter(ctx: AdapterContext): Adapter {
  return ADAPTERS.find((a) => {
    try {
      return a.matches(ctx);
    } catch {
      return false;
    }
  })!;
}
