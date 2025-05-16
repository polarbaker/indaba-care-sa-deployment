import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const submitFeedback = baseProcedure
  .input(
    z.object({
      token: z.string(),
      nannyId: z.string(),
      childId: z.string().optional(),
      type: z.enum(["care", "progress", "communication", "general"]),
      rating: z.number().min(1).max(5),
      content: z.string().min(10),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify user is a parent
    if (user.role !== "PARENT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only parents can submit feedback",
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
    
    // Verify nanny exists
    const nanny = await db.nannyProfile.findUnique({
      where: { id: input.nannyId },
      include: { user: true },
    });
    
    if (!nanny) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nanny not found",
      });
    }
    
    // If childId is provided, verify child belongs to parent
    if (input.childId) {
      const child = await db.child.findFirst({
        where: {
          id: input.childId,
          parentId: parentProfile.id,
        },
      });
      
      if (!child) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Child not found or does not belong to parent",
        });
      }
    }
    
    // Create feedback
    const feedback = await db.feedback.create({
      data: {
        parentId: parentProfile.id,
        nannyId: input.nannyId,
        childId: input.childId,
        type: input.type,
        rating: input.rating,
        content: input.content,
        status: "pending",
      },
    });
    
    return {
      success: true,
      feedbackId: feedback.id,
    };
  });
