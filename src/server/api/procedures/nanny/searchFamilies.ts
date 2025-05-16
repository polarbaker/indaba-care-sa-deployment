import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const searchFamilies = baseProcedure
  .input(
    z.object({
      token: z.string(),
      searchTerm: z.string().min(1),
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
          select: {
            familyId: true,
          },
        },
        familyRequests: {
          select: {
            familyId: true,
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
    
    // Get IDs of families the nanny is already assigned to or has requested
    const assignedFamilyIds = nannyProfile.assignedFamilies.map(af => af.familyId);
    const requestedFamilyIds = nannyProfile.familyRequests.map(fr => fr.familyId);
    const excludedFamilyIds = [...assignedFamilyIds, ...requestedFamilyIds];
    
    // Search for families
    const families = await db.family.findMany({
      where: {
        OR: [
          {
            name: {
              contains: input.searchTerm,
              mode: "insensitive",
            },
          },
          {
            parent: {
              OR: [
                {
                  firstName: {
                    contains: input.searchTerm,
                    mode: "insensitive",
                  },
                },
                {
                  lastName: {
                    contains: input.searchTerm,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        ],
        // Exclude families the nanny is already assigned to or has requested
        id: {
          notIn: excludedFamilyIds,
        },
      },
      include: {
        parent: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 10, // Limit to 10 results
    });
    
    return families.map((family) => ({
      id: family.id,
      name: family.name,
      parent: {
        firstName: family.parent.firstName,
        lastName: family.parent.lastName,
      },
    }));
  });
