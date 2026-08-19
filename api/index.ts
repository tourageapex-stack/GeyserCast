import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApiApp } from '../server/app';

export const config = {
  maxDuration: 30,
};

let appPromise: ReturnType<typeof createApiApp> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = createApiApp();
  const app = await appPromise;
  return app(req, res);
}
