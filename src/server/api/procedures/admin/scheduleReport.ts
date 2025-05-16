import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

// Helper to calculate next run date
const getNextRunDate = (frequency: string, startDate?: Date): Date => {
  const now = startDate || new Date();
  switch (frequency.toLowerCase()) {
    case "daily":
      now.setDate(now.getDate() + 1);
      break;
    case "weekly":
      now.setDate(now.getDate() + 7);
      break;
    case "monthly":
      now.setMonth(now.getMonth() + 1);
      break;
    case "quarterly":
      now.setMonth(now.getMonth() + 3);
      break;
    default: // Default to next week if frequency is unknown
      now.setDate(now.getDate() + 7);
  }
  return now;
};

export const scheduleReport = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1),
      description: z.string().optional(),
      reportType: z.string(),
      frequency: z.string(), // e.g., "Weekly", "Monthly"
      format: z.array(z.string()), // e.g., ["PDF", "Excel"]
      recipients: z.array(z.string().email()),
      filters: z.string().optional(), // JSON string for filters
    })
  )
  .mutation(async ({ input }) => {
    const adminUser = await getUserFromToken(input.token);
    validateUserRole(adminUser, ["ADMIN"]);

    const { token, ...reportData } = input;

    const nextRun = getNextRunDate(reportData.frequency);

    const newSchedule = await db.reportSchedule.create({
      data: {
        ...reportData,
        nextRunDate: nextRun,
        createdBy: adminUser.id,
        isActive: true,
      },
    });

    return { success: true, schedule: newSchedule };
  });
