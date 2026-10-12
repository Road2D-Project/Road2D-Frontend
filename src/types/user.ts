/**
 * user.ts — Domain type cho người dùng.
 * Khớp với model.User của Backend (module/authentication/model/User.go)
 */
export interface User {
  id: string;
  name: string;
  phone?: string;
  numberPhone?: string;
  username?: string;
  email?: string;
  avatar?: string;
  nickname?: string;
  createdTime?: string;
  updatedTime?: string;
}

/** Schema nguyên mẫu từ Backend REST API */
export interface BackendUser {
  id: string;
  username: string;
  email: string;
  numberPhone: string;
  createdTime?: string;
  updatedTime?: string;
}
