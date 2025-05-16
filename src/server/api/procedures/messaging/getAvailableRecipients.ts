import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getAvailableRecipients = baseProcedure
  .input(
    z.object({
      token: z.string(),
      searchTerm: z.string().optional(),
      limit: z.number().min(1).max(50).default(10),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Fetch users based on search term, excluding the current user
    const users = await db.user.findMany({
      where: {
        id: { not: user.id }, // Exclude self
        ...(input.searchTerm && {
          OR: [
            { email: { contains: input.searchTerm, mode: "insensitive" } },
            { displayName: { contains: input.searchTerm, mode: "insensitive" } },
            { nannyProfile: { firstName: { contains: input.searchTerm, mode: "insensitive" } } },
            { nannyProfile: { lastName: { contains: input.searchTerm, mode: "insensitive" } } },
            { parentProfile: { firstName: { contains: input.searchTerm, mode: "insensitive" } } },
            { parentProfile: { lastName: { contains: input.searchTerm, mode: "insensitive" } } },
            { adminProfile: { firstName: { contains: input.searchTerm, mode: "insensitive" } } },
            { adminProfile: { lastName: { contains: input.searchTerm, mode: "insensitive" } } },
          ],
        }),
      },
      take: input.limit,
      include: {
        nannyProfile: { select: { firstName: true, lastName: true, profileImageUrl: true } },
        parentProfile: { select: { firstName: true, lastName: true, profileImageUrl: true } },
        adminProfile: { select: { firstName: true, lastName: true, profileImageUrl: true } },
      },
    });
    
    // Format recipients
    return users.map(u => {
      let name = u.displayName || u.email;
      let profileImageUrl = null;
      
      if (u.nannyProfile) {
        name = `${u.nannyProfile.firstName} ${u.nannyProfile.lastName}`;
        profileImageUrl = u.nannyProfile.profileImageUrl;
      } else if (u.parentProfile) {
        name = `${u.parentProfile.firstName} ${u.parentProfile.lastName}`;
        profileImageUrl = u.parentProfile.profileImageUrl;
      } else if (u.adminProfile) {
        name = `${u.adminProfile.firstName} ${u.adminProfile.lastName}`;
        profileImageUrl = u.adminProfile.profileImageUrl;
      }
      
      return {
        id: u.id,
        name,
        role: u.role,
        profileImageUrl,
      };
    });
  });
