import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const disable2FA = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Check if 2FA is enabled
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });
    
    if (!twoFactorAuth || !twoFactorAuth.isEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Two-factor authentication is not enabled",
      });
    }
    
    // Disable 2FA
    await db.twoFactorAuth.update({
      where: { userId: user.id },
      data: {
        isEnabled: false,
        recoveryCodes: null,
      },
    });
    
    return {
      success: true,
      message: "Two-factor authentication disabled",
    };
  });
