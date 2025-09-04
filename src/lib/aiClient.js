import OpenAI from "openai";

export function makeAIClient() {
  const provider = process.env.AI_PROVIDER || "local";

  const baseURL = provider === "openai"
    ? (process.env.AI_BASE_URL || "https://api.openai.com/v1")
    : (process.env.AI_BASE_URL || "http://localhost:1234/v1");

  const apiKey = provider === "openai"
    ? (process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "")
    : (process.env.AI_API_KEY || "lm-studio");

  return new OpenAI({ apiKey, baseURL });
}

export const AI_MODEL = process.env.AI_MODEL || (
  (process.env.AI_PROVIDER || "local") === "openai" ? "gpt-4o-mini" : "meta-llama-3.1-8b-instruct"
);

