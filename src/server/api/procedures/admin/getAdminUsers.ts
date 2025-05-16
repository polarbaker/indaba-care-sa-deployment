import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
import { UserRole } from "@prisma/client";

export const getAdminUsers = baseProcedure
  .input(
    z.object({
      token: z.string(),
      role: z.nativeEnum(UserRole).optional(),
      searchTerm: z.string().optional(),
      // Add pagination later if needed: cursor: z.string().optional(), limit: z.number().min(1).max(100).optional(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const whereClause: any = {};
    if (input.role) {
      whereClause.role = input.role;
    }
    if (input.searchTerm) {
      whereClause.OR = [
        { email: { contains: input.searchTerm, mode: 'insensitive' } },
        { nannyProfile: { firstName: { contains: input.searchTerm, mode: 'insensitive' } } },
        { nannyProfile: { lastName: { contains: input.searchTerm, mode: 'insensitive' } } },
        { parentProfile: { firstName: { contains: input.searchTerm, mode: 'insensitive' } } },
        { parentProfile: { lastName: { contains: input.searchTerm, mode: 'insensitive' } } },
        { adminProfile: { firstName: { contains: input.searchTerm, mode: 'insensitive' } } },
        { adminProfile: { lastName: { contains: input.searchTerm, mode: 'insensitive' } } },
      ];
    }

    const users = await db.user.findMany({
      where: whereClause,
      include: {
        nannyProfile: true,
        parentProfile: true,
        adminProfile: true,
      },
      orderBy: { createdAt: 'desc' },
      // take: input.limit || 20,
      // cursor: input.cursor ? { id: input.cursor } : undefined,
    });

    return users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.nannyProfile?.firstName || user.parentProfile?.firstName || user.adminProfile?.firstName || '',
      lastName: user.nannyProfile?.lastName || user.parentProfile?.lastName || user.adminProfile?.lastName || '',
      createdAt: user.createdAt.toISOString(),
    }));
  });
