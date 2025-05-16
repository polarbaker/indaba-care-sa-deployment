import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const updateFeedback = baseProcedure
  .input(
    z.object({
      token: z.string(),
      id: z.string(),
      followUp: z.string().min(1),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify user is a parent
    if (user.role !== "PARENT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only parents can update feedback",
      });
    }
    
    // Get parent profile
    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (!parentProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Parent profile not found",
      });
    }
    
    // Find the feedback
    const feedback = await db.feedback.findUnique({
      where: { id: input.id },
    });
    
    if (!feedback) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Feedback not found",
      });
    }
    
    // Verify feedback belongs to parent
    if (feedback.parentId !== parentProfile.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to update this feedback",
      });
    }
    
    // Update feedback with follow-up
    await db.feedback.update({
      where: { id: input.id },
      data: {
        followUp: input.followUp,
      },
    });
    
    return {
      success: true,
    };
  });
