import { handleVercelRequest } from '../server/expressFetch';

export const config = {
  maxDuration: 30,
};

export default {
  async fetch(request: Request) {
    return handleVercelRequest(request);
  },
};
