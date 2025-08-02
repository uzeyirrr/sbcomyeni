import { User } from "./user";

export interface Team {
  id: string;
  name: string;
  leader: string;
  members: string[];
  created?: string;
  updated?: string;
  expand?: {
    leader?: User;
    members?: User[];
  };
} 