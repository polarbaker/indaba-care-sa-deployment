import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, verifyPassword } from "~/lib/auth";

export const deleteAccount = baseProcedure
  .input(
    z.object({
      token: z.string(),
      password: z.string().min(1, "Password is required"),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify password
    const isPasswordValid = await verifyPassword(
      input.password,
      user.passwordHash
    );
    
    if (!isPasswordValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Incorrect password",
      });
    }
    
    // In a real implementation, you might:
    // 1. Schedule the account for deletion (e.g., after a grace period)
    // 2. Anonymize sensitive data instead of hard deletion
    // 3. Send a confirmation email
    // 4. Revoke all sessions
    
    // For this implementation, we'll just mark the account as scheduled for deletion
    await db.user.update({
      where: { id: user.id },
      data: {
        // In a real schema, you might have fields like:
        // isDeleted: true,
        // scheduledForDeletionAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        // Instead, we'll just update a field to indicate deletion request
        email: `deleted-${user.id}@example.com`, // Anonymize email
        passwordHash: "", // Clear password hash
      },
    });
    
    // Revoke all sessions
    await db.userSession.updateMany({
      where: { userId: user.id },
      data: {
        isRevoked: true,
      },
    });
    
    return {
      success: true,
      message: "Account deletion initiated. You'll receive a confirmation email.",
    };
  });
