import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getAgencyNannies = baseProcedure
  .input(
    z.object({
      token: z.string(),
      agencyId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const agency = await db.agency.findUnique({
      where: { id: input.agencyId },
      include: {
        nannyAssignments: {
          include: {
            nanny: {
              include: {
                user: { select: { email: true } }, // Get nanny's email
                certifications: { where: { status: "Active" } },
                hoursLogs: { orderBy: { date: 'desc' }, take: 5 } // Recent hours logs
              }
            }
          },
          orderBy: { nanny: { lastName: 'asc' } }
        }
      }
    });

    if (!agency) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Agency not found." });
    }

    return agency.nannyAssignments.map(assignment => ({
      assignmentId: assignment.id,
      nannyId: assignment.nanny.id,
      firstName: assignment.nanny.firstName,
      lastName: assignment.nanny.lastName,
      email: assignment.nanny.user.email,
      roleInAgency: assignment.role,
      status: assignment.status,
      payRate: assignment.payRate,
      startDate: assignment.startDate.toISOString(),
      activeCertifications: assignment.nanny.certifications.length,
      recentHours: assignment.nanny.hoursLogs.reduce((sum, log) => sum + log.hoursWorked, 0),
    }));
  });
