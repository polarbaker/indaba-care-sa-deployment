import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

export const getScheduledReports = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const reports = await db.reportSchedule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return reports.map(report => ({
      ...report,
      nextRunDate: report.nextRunDate.toISOString(),
      lastRunDate: report.lastRunDate?.toISOString(),
    }));
  });
