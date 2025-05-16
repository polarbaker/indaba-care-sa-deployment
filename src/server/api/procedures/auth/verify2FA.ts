import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, hashPassword } from "~/lib/auth";
import * as speakeasy from "speakeasy";
import * as crypto from "crypto";

export const verify2FA = baseProcedure
  .input(
    z.object({
      token: z.string(),
      code: z.string().min(6).max(6),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Get the user's 2FA settings
    const twoFactorAuth = await db.twoFactorAuth.findUnique({
      where: { userId: user.id },
    });
    
    if (!twoFactorAuth || !twoFactorAuth.secret) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Two-factor authentication not set up",
      });
    }
    
    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: twoFactorAuth.secret,
      encoding: "base32",
      token: input.code,
    });
    
    if (!verified) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid verification code",
      });
    }
    
    // Generate recovery codes
    const recoveryCodes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(10).toString("hex").slice(0, 10).toUpperCase();
      recoveryCodes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
    }
    
    // Hash recovery codes for storage
    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map(async (code) => await hashPassword(code))
    );
    
    // Enable 2FA
    await db.twoFactorAuth.update({
      where: { userId: user.id },
      data: {
        isEnabled: true,
        recoveryCodes: JSON.stringify(hashedRecoveryCodes),
        lastVerifiedAt: new Date(),
      },
    });
    
    return {
      success: true,
      recoveryCodes,
    };
  });
