import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getAssignedChildren = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    let children: { 
      id: string; 
      firstName: string; 
      lastName: string;
      birthDate?: string;
      familyId?: string;
      parentFirstName?: string | null;
      parentLastName?: string | null;
      address?: string | null;
    }[] = [];
    
    if (user.role === "NANNY") {
      // For nannies, get children from assigned families
      const nannyProfile = await db.nannyProfile.findUnique({
        where: { userId: user.id },
        include: {
          assignedFamilies: {
            where: { status: "Active" },
            include: {
              family: {
                include: {
                  children: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      birthDate: true, // Added birthDate
                      familyId: true,  // Added familyId
                      parent: {      // Added parent relation
                        select: {
                          firstName: true,
                          lastName: true,
                          address: true, // Added address from parent profile
                        }
                      }
                    },
                  },
                },
              },
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
      
      // Collect all children from all assigned families
      children = nannyProfile.assignedFamilies.flatMap(
        assignment => assignment.family.children.map(child => ({
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          birthDate: child.birthDate?.toISOString(),
          familyId: child.familyId,
          parentFirstName: child.parent?.firstName,
          parentLastName: child.parent?.lastName,
          address: child.parent?.address,
        }))
      );
    } else if (user.role === "PARENT") {
      // For parents, get their own children
      const parentProfile = await db.parentProfile.findUnique({
        where: { userId: user.id },
        include: {
          children: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              birthDate: true, // Added birthDate
              familyId: true,  // Added familyId
            },
          },
        },
      });
      
      if (!parentProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent profile not found",
        });
      }
      
      children = parentProfile.children.map(child => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate?.toISOString(),
        familyId: child.familyId,
        parentFirstName: parentProfile.firstName,
        parentLastName: parentProfile.lastName,
        address: parentProfile.address,
      }));
    } else if (user.role === "ADMIN") {
      // Admins can see all children
      const allChildren = await db.child.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true, // Added birthDate
          familyId: true,  // Added familyId
          parent: {      // Added parent relation
            select: {
              firstName: true,
              lastName: true,
              address: true, // Added address from parent profile
            }
          }
        },
      });
      
      children = allChildren.map(child => ({
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate?.toISOString(),
        familyId: child.familyId,
        parentFirstName: child.parent?.firstName,
        parentLastName: child.parent?.lastName,
        address: child.parent?.address,
      }));
    } else {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to view children",
      });
    }
    
    return { children };
  });
