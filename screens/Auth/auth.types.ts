export type AuthMode = 'login' | 'register';

export type LoginBody = {
  email: string;
  password: string;
};

export type LoginProps = {
  apiBase?: string;
  onSuccess?: (data: any) => void;
  onGoToRegister?: () => void;
};

export type RegisterBody = {
  name: string;
  email: string;
  password: string;
};

export type RegisterProps = {
  apiBase?: string;
  onSuccess?: (data: any) => void;
  onGoToLogin?: () => void;
};
