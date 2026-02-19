
export interface LoginResult {
  username: string;
  password: string;
  needsPasswordReset: boolean;
}
  

export interface User {
  companyId: string;
  username: string;
  password: string;
  phone?: string; // not mandatory
  name?: string;
}
