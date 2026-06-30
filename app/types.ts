export interface Character {
  id: string;
  name: string;
  personality: string;
  background: string;
  avatar: string;       // emoji or image URL
  chatBg: string;       // CSS gradient string or image URL
  createdAt: number;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
}
