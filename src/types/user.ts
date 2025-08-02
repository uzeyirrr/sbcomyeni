export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  created?: string;
  updated?: string;
  team?: string;
  expand?: {
    team?: {
      id: string;
      name: string;
    };
  };
} 