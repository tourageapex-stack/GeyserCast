import { handleVercelRequest } from '../server/expressFetch';

export const config = {
  maxDuration: 30,
};

export default {
  fetch(request: Request) {
    return handleVercelRequest(request);
  },
};

export function GET(request: Request) {
  return handleVercelRequest(request);
}

export function POST(request: Request) {
  return handleVercelRequest(request);
}

export function PUT(request: Request) {
  return handleVercelRequest(request);
}

export function PATCH(request: Request) {
  return handleVercelRequest(request);
}

export function DELETE(request: Request) {
  return handleVercelRequest(request);
}

export function HEAD(request: Request) {
  return handleVercelRequest(request);
}

export function OPTIONS(request: Request) {
  return handleVercelRequest(request);
}
