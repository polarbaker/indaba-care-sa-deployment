import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const assignNannyToAgency = baseProcedure
  .input(
    z.object({
      token: z.string(),
      agencyId: z.string(),
      nannyId: z.string(), // NannyProfile ID
      role: z.string().optional(),
      status: z.string().default("Active"), // e.g., Active, Pending, Inactive
      payRate: z.number().optional(),
      paymentSchedule: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { token, agencyId, nannyId, ...assignmentData } = input;

    // Check if agency and nanny exist
    const [agency, nannyProfile] = await Promise.all([
      db.agency.findUnique({ where: { id: agencyId } }),
      db.nannyProfile.findUnique({ where: { id: nannyId } })
    ]);

    if (!agency) throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found." });
    if (!nannyProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Nanny profile not found." });

    // Check for existing assignment (unique constraint on agencyId, nannyId)
    const existingAssignment = await db.agencyNanny.findUnique({
      where: { agencyId_nannyId: { agencyId, nannyId } }
    });

    if (existingAssignment) {
      throw new TRPCError({ code: "CONFLICT", message: "Nanny is already assigned to this agency." });
    }

    const newAssignment = await db.agencyNanny.create({
      data: {
        agencyId,
        nannyId,
        ...assignmentData,
      },
    });

    return { success: true, assignment: newAssignment };
  });
