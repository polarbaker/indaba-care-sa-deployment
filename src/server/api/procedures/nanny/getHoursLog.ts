import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const getHoursLog = baseProcedure
  .input(
    z.object({
      token: z.string(),
      startDate: z.string().datetime().optional(), // ISO date string
      endDate: z.string().datetime().optional(),   // ISO date string
      cursor: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can access hours logs",
      });
    }
    
    // Get nanny profile
    const nannyProfile = await db.nannyProfile.findUnique({
      where: { userId: user.id },
    });
    
    if (!nannyProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Nanny profile not found",
      });
    }
    
    // Build the where clause for filtering
    let whereClause: any = {
      nannyId: nannyProfile.id,
    };
    
    // Add date range filters if provided
    if (input.startDate || input.endDate) {
      whereClause.date = {};
      
      if (input.startDate) {
        whereClause.date.gte = new Date(input.startDate);
      }
      
      if (input.endDate) {
        // Add 1 day to endDate to make it inclusive
        const endDate = new Date(input.endDate);
        endDate.setDate(endDate.getDate() + 1);
        whereClause.date.lt = endDate;
      }
    }
    
    // Get hours logs with pagination
    const hoursLogs = await db.hoursLog.findMany({
      where: whereClause,
      take: input.limit + 1, // Take one extra to check if there are more
      cursor: input.cursor ? { id: input.cursor } : undefined,
      orderBy: {
        date: "desc",
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    
    // Check if there are more results
    const hasMore = hoursLogs.length > input.limit;
    const data = hasMore ? hoursLogs.slice(0, input.limit) : hoursLogs;
    
    // Get the next cursor
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;
    
    // Calculate summary metrics
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const weeklyHours = await db.hoursLog.aggregate({
      where: {
        nannyId: nannyProfile.id,
        date: {
          gte: startOfWeek,
        },
      },
      _sum: {
        durationMinutes: true,
      },
    });
    
    const monthlyHours = await db.hoursLog.aggregate({
      where: {
        nannyId: nannyProfile.id,
        date: {
          gte: startOfMonth,
        },
      },
      _sum: {
        durationMinutes: true,
      },
    });
    
    // Format the hours logs for the frontend
    const formattedHoursLogs = data.map(log => ({
      id: log.id,
      date: log.date.toISOString(),
      startTime: log.startTime,
      endTime: log.endTime,
      durationMinutes: log.durationMinutes,
      breakMinutes: log.breakMinutes || 0,
      notes: log.notes || "",
      familyId: log.familyId,
      familyName: log.family?.name || "Unknown Family",
      isOvertime: log.isOvertime || false,
      status: log.status || "APPROVED",
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    }));
    
    return {
      data: formattedHoursLogs,
      nextCursor,
      summary: {
        weeklyHours: Math.round((weeklyHours._sum.durationMinutes || 0) / 60 * 10) / 10, // Round to 1 decimal
        monthlyHours: Math.round((monthlyHours._sum.durationMinutes || 0) / 60 * 10) / 10, // Round to 1 decimal
      },
    };
  });
