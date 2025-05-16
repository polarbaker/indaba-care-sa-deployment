import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

// Helper function to convert day name to day number (0 = Sunday, 6 = Saturday)
function getDayNumber(day: string): number {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days.indexOf(day.toLowerCase());
}

export const getSchedule = baseProcedure
  .input(
    z.object({
      token: z.string(),
      startDate: z.string().datetime(), // ISO date string
      endDate: z.string().datetime(),   // ISO date string
    })
  )
  .query(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    if (user.role !== "NANNY") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only nannies can access their schedule",
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
    
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    
    // Fetch hours logs for the date range
    const hoursLogs = await db.hoursLog.findMany({
      where: {
        nannyId: nannyProfile.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        family: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });
    
    // Fetch routines for the date range
    const routines = await db.routine.findMany({
      where: {
        nannyId: nannyProfile.id,
        OR: [
          // One-time routines within the date range
          {
            isRecurring: false,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          // Recurring routines that might apply to this date range
          {
            isRecurring: true,
          },
        ],
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    // Filter recurring routines to only include those applicable to the date range
    const applicableRoutines = routines.filter(routine => {
      if (!routine.isRecurring) {
        return true; // One-time routines already filtered by date
      }
      
      // Check if recurring routine applies to any day in the range
      const routineDay = routine.recurringDay;
      const recurringTime = routine.recurringTime;
      
      if (!routineDay || !recurringTime) {
        return false; // Invalid recurring routine
      }
      
      // Check each day in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Check if the day of the week matches
        if (currentDate.getDay() === getDayNumber(routineDay)) {
          return true;
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return false;
    });
    
    // Format the hours logs and routines for the frontend
    const formattedHoursLogs = hoursLogs.map(log => ({
      id: log.id,
      type: "shift",
      date: log.date.toISOString(),
      startTime: log.startTime,
      endTime: log.endTime,
      durationMinutes: log.durationMinutes,
      breakMinutes: log.breakMinutes || 0,
      notes: log.notes || "",
      familyId: log.familyId,
      familyName: log.family?.name || "Unknown Family",
      status: log.status || "PENDING",
    }));
    
    const formattedRoutines = applicableRoutines.map(routine => {
      // For recurring routines, create an entry for each applicable day
      if (routine.isRecurring && routine.recurringDay && routine.recurringTime) {
        const dayNumber = getDayNumber(routine.recurringDay);
        const applicableDates: Date[] = [];
        
        // Find all dates in the range that match the recurring day
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          if (currentDate.getDay() === dayNumber) {
            applicableDates.push(new Date(currentDate));
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        // Return an entry for each applicable date
        return applicableDates.map(date => ({
          id: `${routine.id}-${date.toISOString().split('T')[0]}`,
          type: "routine",
          routineId: routine.id,
          title: routine.title,
          description: routine.description || "",
          date: date.toISOString(),
          time: routine.recurringTime,
          isRecurring: true,
          recurringDay: routine.recurringDay,
          childId: routine.childId,
          childName: routine.child ? `${routine.child.firstName} ${routine.child.lastName}` : "",
        }));
      } else {
        // One-time routine
        return [{
          id: routine.id,
          type: "routine",
          routineId: routine.id,
          title: routine.title,
          description: routine.description || "",
          date: routine.date?.toISOString() || "",
          time: routine.time || "",
          isRecurring: false,
          childId: routine.childId,
          childName: routine.child ? `${routine.child.firstName} ${routine.child.lastName}` : "",
        }];
      }
    }).flat();
    
    // Combine and sort all schedule items by date and time
    const scheduleItems = [...formattedHoursLogs, ...formattedRoutines].sort((a, b) => {
      // First sort by date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      
      // If same date, sort by time
      const timeA = a.type === "shift" ? a.startTime : a.time || "";
      const timeB = b.type === "shift" ? b.startTime : b.time || "";
      
      return timeA.localeCompare(timeB);
    });
    
    // Group items by date
    const scheduleByDate: Record<string, typeof scheduleItems> = {};
    
    scheduleItems.forEach(item => {
      const dateKey = new Date(item.date).toISOString().split('T')[0];
      
      if (!scheduleByDate[dateKey]) {
        scheduleByDate[dateKey] = [];
      }
      
      scheduleByDate[dateKey].push(item);
    });
    
    return {
      scheduleByDate,
      scheduleItems,
    };
  });
