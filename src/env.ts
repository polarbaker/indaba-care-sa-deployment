import { z } from "zod";

// Function to determine if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Server-side environment schema (for values only available on the server)
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  
  // Authentication (server-side only)
  JWT_SECRET: z.string().min(32),
  
  // OpenAI API for AI features (server-side access)
  OPENAI_API_KEY: z.string().optional(), // Made optional for demo purposes
  
  // Optional: S3/Minio configuration for file storage
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
});

// Parse and export server environment
export const serverEnv = serverEnvSchema.parse(process.env);

// Client-side environment schema (for values that can be exposed to the browser)
// In Vite, client-side env vars must be prefixed with VITE_
const clientEnvSchema = z.object({
  // We use a different approach for NODE_ENV on the client
  MODE: z.enum(["development", "production"]),
  
  // Client-accessible OpenAI flag - just needs to indicate if AI is available
  VITE_OPENAI_AVAILABLE: z.enum(["true", "false"]).optional(),
});

// Parse and export client environment
export const clientEnv = isBrowser
  ? clientEnvSchema.parse(import.meta.env)
  : {
      // Fallback values when accessed from server
      MODE: process.env.NODE_ENV as "development" | "production",
      VITE_OPENAI_AVAILABLE: process.env.OPENAI_API_KEY ? "true" : "false",
    };

// Helper function to check if AI features are available (works on both client and server)
export const isAIAvailable = () => {
  if (isBrowser) {
    // Client-side check
    return clientEnv.VITE_OPENAI_AVAILABLE === "true";
  } else {
    // Server-side check
    return !!serverEnv.OPENAI_API_KEY;
  }
};

// For backwards compatibility with existing imports
// This is safe because it only contains the isAIAvailable function
export const env = {
  ...clientEnv,
  // Don't include serverEnv here to prevent client access to JWT_SECRET
};