import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const updateSyncSettings = baseProcedure
  .input(
    z.object({
      token: z.string(),
      mediaCacheSize: z.number().min(50).max(1000).default(100),
      autoPurgePolicy: z.number().min(1).max(90).default(14),
      syncOnWifiOnly: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Update or create sync settings
    await db.userSettings.upsert({
      where: { userId: user.id },
      update: {
        mediaCacheSize: input.mediaCacheSize,
        autoPurgePolicy: input.autoPurgePolicy,
        syncOnWifiOnly: input.syncOnWifiOnly,
      },
      create: {
        userId: user.id,
        mediaCacheSize: input.mediaCacheSize,
        autoPurgePolicy: input.autoPurgePolicy,
        syncOnWifiOnly: input.syncOnWifiOnly,
      },
    });
    
    return {
      success: true,
      message: "Sync settings updated successfully",
    };
  });
