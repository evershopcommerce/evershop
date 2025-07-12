export interface Route {
  id: string;
  name: string;
  method: string | string[];
  path: string;
  isAdmin: boolean;
  isApi: boolean;
  folder: string;
  payloadSchema?: Record<string, any>;
  access?: string;
}
