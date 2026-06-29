export interface Character {
  id: string;
  name: string;
  personality: string;
  background: string;
  avatar: string;
  chatBg: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
}
