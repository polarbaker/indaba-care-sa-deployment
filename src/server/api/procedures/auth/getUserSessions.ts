import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getUserSessions = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Get user sessions
    const sessions = await db.userSession.findMany({
      where: {
        userId: user.id,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastActiveAt: "desc",
      },
    });
    
    // Get the current session ID from the token
    // In a real implementation, you would extract the session ID from the token
    // For now, we'll just mark the most recent session as current
    const currentSessionId = sessions.length > 0 ? sessions[0].id : null;
    
    return sessions.map((session) => ({
      id: session.id,
      deviceInfo: session.deviceInfo || "Unknown device",
      browser: session.browser || "Unknown browser",
      ipAddress: session.ipAddress || "Unknown",
      lastActiveAt: session.lastActiveAt,
      isCurrentSession: session.id === currentSessionId,
    }));
  });
