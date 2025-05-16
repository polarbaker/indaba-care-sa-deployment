import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, verifyPassword, hashPassword } from "~/lib/auth";

export const changePassword = baseProcedure
  .input(
    z.object({
      token: z.string(),
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(8, "New password must be at least 8 characters"),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify current password
    const isPasswordValid = await verifyPassword(
      input.currentPassword,
      user.passwordHash
    );
    
    if (!isPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Current password is incorrect",
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(input.newPassword);
    
    // Update user's password
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });
    
    return { success: true, message: "Password changed successfully" };
  });
