export interface Character {
  id: string;
  name: string;
  personality: string;
  background: string;
  avatar: string;       // emoji, image URL, data: URL, or "@bg" (mirrors chatBg)
  chatBg: string;       // CSS gradient string or image URL
  chatBgPos?: string;   // CSS background-position, e.g. "50% 30%"
  createdAt: number;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
}
