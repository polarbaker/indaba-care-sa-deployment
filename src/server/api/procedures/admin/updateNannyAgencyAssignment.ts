import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const updateNannyAgencyAssignment = baseProcedure
  .input(
    z.object({
      token: z.string(),
      assignmentId: z.string(),
      role: z.string().optional(),
      status: z.string().optional(),
      payRate: z.number().optional().nullable(),
      paymentSchedule: z.string().optional().nullable(),
      endDate: z.string().datetime().optional().nullable(), // ISO string
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { assignmentId, token, ...updateData } = input;

    const assignment = await db.agencyNanny.findUnique({ where: { id: assignmentId } });
    if (!assignment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Nanny assignment not found." });
    }

    const updatedAssignment = await db.agencyNanny.update({
      where: { id: assignmentId },
      data: {
        ...updateData,
        endDate: updateData.endDate ? new Date(updateData.endDate) : (updateData.endDate === null ? null : undefined),
      },
    });

    return { success: true, assignment: updatedAssignment };
  });
