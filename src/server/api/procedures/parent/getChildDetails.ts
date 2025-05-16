import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

// Helper function to calculate age
function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export const getChildDetails = baseProcedure
  .input(
    z.object({
      token: z.string(),
      childId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    // Allow PARENT or NANNY (if assigned to the family) to view child details
    validateUserRole(user, ["PARENT", "NANNY"]); 

    const child = await db.child.findUnique({
      where: { id: input.childId },
      include: {
        parent: { // To verify ownership for PARENT role
          select: { userId: true }
        },
        family: { // To verify assignment for NANNY role
            include: {
                nannies: {
                    where: { status: "Active" },
                    select: { nanny: { select: { userId: true } } }
                }
            }
        },
        schedules: {
          orderBy: { order: "asc" },
        },
        media: {
          orderBy: { createdAt: "desc" },
        },
        // Add other relations as needed, e.g., observations for quick stats if not covered elsewhere
      },
    });

    if (!child) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Child not found." });
    }

    // Authorization check
    if (user.role === "PARENT") {
      if (child.parent.userId !== user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this child's details." });
      }
    } else if (user.role === "NANNY") {
      const isAssignedNanny = child.family?.nannies.some(n => n.nanny.userId === user.id);
      if (!isAssignedNanny) {
         throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to view this child's details." });
      }
    }
    
    // Parse JSON fields
    const parsedMedicalInfo = child.medicalInfo ? JSON.parse(child.medicalInfo) : null;
    const parsedAllergies = child.allergies ? JSON.parse(child.allergies) : null;
    const favoriteActivities = child.favoriteActivities ? JSON.parse(child.favoriteActivities) : [];
    const sleepRoutine = child.sleepRoutine ? JSON.parse(child.sleepRoutine) : null;
    const eatingRoutine = child.eatingRoutine ? JSON.parse(child.eatingRoutine) : null;


    return {
      ...child,
      age: calculateAge(child.dateOfBirth),
      parsedMedicalInfo,
      parsedAllergies,
      favoriteActivities,
      sleepRoutine,
      eatingRoutine,
      // schedules and media are already included
    };
  });
