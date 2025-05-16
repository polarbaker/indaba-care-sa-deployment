import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const requestFamilyAccess = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string(),
      message: z.string().min(10).max(500),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Validate user is a nanny
    validateUserRole(user, ["NANNY"]);
    
    // Get nanny profile
    const nannyProfile = await db.nannyProfile.findUnique({
      where: { userId: user.id },
      include: {
        assignedFamilies: {
          where: {
            familyId: input.familyId,
          },
        },
        familyRequests: {
          where: {
            familyId: input.familyId,
          },
        },
      },
    });
    
    if (!nannyProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nanny profile not found",
      });
    }
    
    // Check if the family exists
    const family = await db.family.findUnique({
      where: { id: input.familyId },
    });
    
    if (!family) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Family not found",
      });
    }
    
    // Check if the nanny is already assigned to this family
    if (nannyProfile.assignedFamilies.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are already assigned to this family",
      });
    }
    
    // Check if the nanny has already requested access to this family
    if (nannyProfile.familyRequests.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have already requested access to this family",
      });
    }
    
    // Create the request
    const request = await db.familyNannyRequest.create({
      data: {
        nannyId: nannyProfile.id,
        familyId: input.familyId,
        message: input.message,
        status: "pending",
      },
    });
    
    return {
      success: true,
      message: "Access request sent successfully",
      requestId: request.id,
    };
  });
