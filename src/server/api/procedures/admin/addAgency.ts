import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const addAgency = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1),
      contactPerson: z.string().optional(),
      contactEmail: z.string().email().optional(),
      contactPhone: z.string().optional(),
      address: z.string().optional(),
      description: z.string().optional(),
      emergencyProtocols: z.string().optional(), // JSON string
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { token, ...agencyData } = input;

    const newAgency = await db.agency.create({
      data: agencyData,
    });

    return { success: true, agency: newAgency };
  });
