import { Context } from "telegraf";

interface SearchSession {
  query: string;
  results: any[];
  currentIndex: number;
}

export interface MyContext extends Context {
  session: SearchSession;
}