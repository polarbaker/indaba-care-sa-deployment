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
    
    let children: { id: string; firstName: string; lastName: string }[] = [];
    
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
        assignment => assignment.family.children
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
      
      children = parentProfile.children;
    } else if (user.role === "ADMIN") {
      // Admins can see all children
      const allChildren = await db.child.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      });
      
      children = allChildren;
    } else {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to view children",
      });
    }
    
    return { children };
  });
