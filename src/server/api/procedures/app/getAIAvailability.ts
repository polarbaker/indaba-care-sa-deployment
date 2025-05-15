import { baseProcedure } from "~/server/api/trpc";
import { isAIAvailable } from "~/env";

export const getAIAvailability = baseProcedure
  .query(async () => {
    // Use the server-side isAIAvailable function
    // This will check serverEnv.OPENAI_API_KEY
    return {
      available: isAIAvailable()
    };
  });
