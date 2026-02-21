import { AuthContextUser } from '../../types';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthContextUser;
    }
  }
}

export {};
