/**
 * user.ts — Domain type cho người dùng.
 */
export interface User {
  id: string;
  name: string;
  phone?: string;
  username?: string;
  email?: string;
  avatar?: string;
}
