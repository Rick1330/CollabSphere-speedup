import type {} from "express-serve-static-core";

declare global {
  namespace Express {
    interface Request {
      /** Set by NestRequestIdMiddleware on every HTTP request */
      requestId: string;
      /** Set by JwtAuthGuard after successful Bearer verification */
      user?: {
        sub: string;
        email: string;
        globalRole: string;
      };
    }
  }
}

export {};
