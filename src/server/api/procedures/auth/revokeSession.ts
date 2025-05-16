import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const revokeSession = baseProcedure
  .input(
    z.object({
      token: z.string(),
      sessionId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Check if the session exists and belongs to the user
    const session = await db.userSession.findFirst({
      where: {
        id: input.sessionId,
        userId: user.id,
      },
    });
    
    if (!session) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }
    
    // Revoke the session
    await db.userSession.update({
      where: { id: input.sessionId },
      data: {
        isRevoked: true,
      },
    });
    
    return {
      success: true,
      message: "Session revoked successfully",
    };
  });
