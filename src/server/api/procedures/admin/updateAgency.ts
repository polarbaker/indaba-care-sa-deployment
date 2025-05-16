import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const updateAgency = baseProcedure
  .input(
    z.object({
      token: z.string(),
      agencyId: z.string(),
      name: z.string().min(1).optional(),
      contactPerson: z.string().optional().nullable(),
      contactEmail: z.string().email().optional().nullable(),
      contactPhone: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      emergencyProtocols: z.string().optional().nullable(), // JSON string
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { agencyId, token, ...updateData } = input;

    const agency = await db.agency.findUnique({ where: { id: agencyId } });
    if (!agency) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found." });
    }

    const updatedAgency = await db.agency.update({
      where: { id: agencyId },
      data: updateData,
    });

    return { success: true, agency: updatedAgency };
  });
