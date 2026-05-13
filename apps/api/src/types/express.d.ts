import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      workspace?: {
        id: string;
        status: string;
      };
      workspaceMember?: {
        role: string;
        workspace: {
          id: string;
          status: string;
        };
      };
      user?: {
        sub: string;
        email: string;
        globalRole: string;
      };
    }
  }
}
