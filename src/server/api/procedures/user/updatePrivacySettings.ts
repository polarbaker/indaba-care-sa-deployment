import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const updatePrivacySettings = baseProcedure
  .input(
    z.object({
      token: z.string(),
      profileVisibility: z.enum(["public", "connected", "admin"]).default("connected"),
      marketingOptIn: z.boolean().default(false),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Update privacy settings
    await db.user.update({
      where: { id: user.id },
      data: {
        profileVisibility: input.profileVisibility,
        marketingOptIn: input.marketingOptIn,
      },
    });
    
    return {
      success: true,
      message: "Privacy settings updated successfully",
    };
  });
