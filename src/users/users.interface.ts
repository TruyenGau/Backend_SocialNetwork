export interface IUser {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  coverPhoto: string;
  role: {
    _id: string;
    name: string;
  };
  permissions?: {
    _id: string;
    name: string;
    apiPath: string;
    module: string;
  }[];
  block?: boolean;
}
