import { Response as ExpressResponse } from 'express';

export interface StorefrontResponse extends ExpressResponse {
  debugMiddlewares: { id: string; time: number }[];
  $body: Record<string, unknown>;
}
