import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const syncNow = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Update last sync time
    await db.userSettings.upsert({
      where: { userId: user.id },
      update: {
        lastSyncAt: new Date(),
      },
      create: {
        userId: user.id,
        lastSyncAt: new Date(),
      },
    });
    
    // In a real implementation, you might trigger additional sync operations here
    
    return {
      success: true,
      message: "Sync initiated successfully",
      timestamp: new Date(),
    };
  });
