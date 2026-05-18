declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      workspace?: {
        id: string;
        status: string;
      };
      workspaceMember?: {
        id: string;
        role: string;
        workspaceId: string;
        workspace: {
          id: string;
          status: string;
        };
        user?: {
          fullName: string | null;
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

export {};
