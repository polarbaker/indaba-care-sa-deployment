import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { verifyToken as verifyJwtToken } from "~/lib/auth";

export const verifyToken = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // This will throw an error if the token is invalid
    const decodedToken = verifyJwtToken(input.token);
    
    // Return success if token is valid
    return {
      valid: true,
      userId: decodedToken.userId,
      role: decodedToken.role,
    };
  });
