import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getFeedbackHistory = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Verify user is a parent
    if (user.role !== "PARENT") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only parents can view feedback history",
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
    
    // Get feedback history
    const feedback = await db.feedback.findMany({
      where: {
        parentId: parentProfile.id,
      },
      include: {
        nanny: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        child: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // Format feedback data
    const formattedFeedback = feedback.map(item => ({
      id: item.id,
      parentId: item.parentId,
      nannyId: item.nannyId,
      nannyName: `${item.nanny.firstName} ${item.nanny.lastName}`,
      childId: item.childId,
      childName: item.child ? `${item.child.firstName} ${item.child.lastName}` : undefined,
      type: item.type,
      rating: item.rating,
      content: item.content,
      followUp: item.followUp,
      nannyResponse: item.nannyResponse,
      createdAt: item.createdAt,
      status: item.status,
    }));
    
    return {
      feedback: formattedFeedback,
    };
  });
