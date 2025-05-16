import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";
import * as speakeasy from "speakeasy";
import * as qrcode from "qrcode";

export const setup2FA = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Generate a secret
    const secret = speakeasy.generateSecret({
      name: `Indaba App:${user.email}`,
    });
    
    // Store the secret temporarily (will be verified and enabled later)
    await db.twoFactorAuth.upsert({
      where: { userId: user.id },
      update: {
        secret: secret.base32,
        isEnabled: false,
      },
      create: {
        userId: user.id,
        secret: secret.base32,
        isEnabled: false,
      },
    });
    
    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url || "");
    
    return {
      success: true,
      qrCodeUrl,
      secret: secret.base32,
    };
  });
