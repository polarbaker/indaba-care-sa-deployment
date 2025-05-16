import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

// Define types for parsing JSON strings
const carePreferencesSchema = z.object({
  preferredActivities: z.array(z.string()).optional(),
  dietaryRestrictions: z.string().optional(),
  napSchedule: z.string().optional(),
  bedtimeRoutine: z.string().optional(),
  morningRoutine: z.string().optional(),
  disciplineApproach: z.string().optional(),
  screenTimeRules: z.string().optional(),
  outdoorPlayPreferences: z.string().optional(),
}).optional();

const notificationSettingsSchema = z.object({
  dailyUpdates: z.boolean().optional(),
  milestoneAlerts: z.boolean().optional(),
  emergencyAlerts: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  observationNotifications: z.boolean().optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
}).optional();


export const getFamilyPreferences = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: { family: { select: { id: true } } },
    });

    if (parentProfile?.family?.id !== input.familyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Access denied." });
    }

    const preferences = await db.familyPreference.findFirst({
      where: { familyId: input.familyId },
    });

    if (!preferences) {
      return null; // Or return default preferences
    }
    
    // Parse JSON strings
    let parsedCarePreferences = null;
    if (preferences.carePreferences) {
      try {
        parsedCarePreferences = carePreferencesSchema.parse(JSON.parse(preferences.carePreferences));
      } catch (e) {
        console.error("Failed to parse carePreferences", e);
      }
    }

    let parsedNotificationSettings = null;
    if (preferences.notificationSettings) {
      try {
        parsedNotificationSettings = notificationSettingsSchema.parse(JSON.parse(preferences.notificationSettings));
      } catch (e) {
        console.error("Failed to parse notificationSettings", e);
      }
    }

    return {
      ...preferences,
      parsedCarePreferences,
      parsedNotificationSettings,
    };
  });

export const updateFamilyPreferences = baseProcedure
  .input(
    z.object({
      token: z.string(),
      familyId: z.string(),
      carePreferences: z.object({
        preferredActivities: z.array(z.string()).optional(),
        dietaryRestrictions: z.string().optional(), // This is also a top-level field in the form
        napSchedule: z.string().optional(),
        bedtimeRoutine: z.string().optional(),
        morningRoutine: z.string().optional(),
        disciplineApproach: z.string().optional(),
        screenTimeRules: z.string().optional(),
        outdoorPlayPreferences: z.string().optional(),
      }).optional(),
      dietaryRestrictions: z.string().optional(), // Top-level field
      notificationSettings: z.object({
        dailyUpdates: z.boolean().optional(),
        milestoneAlerts: z.boolean().optional(),
        emergencyAlerts: z.boolean().optional(),
        messageNotifications: z.boolean().optional(),
        observationNotifications: z.boolean().optional(),
        emailNotifications: z.boolean().optional(),
        smsNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
      }).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    validateUserRole(user, ["PARENT"]);

    const parentProfile = await db.parentProfile.findUnique({
      where: { userId: user.id },
      include: { family: { select: { id: true } } },
    });

    if (parentProfile?.family?.id !== input.familyId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "You can only update preferences for your own family." });
    }

    const dataToUpdate = {
      ...(input.carePreferences && { carePreferences: JSON.stringify(input.carePreferences) }),
      ...(input.dietaryRestrictions && { dietaryRestrictions: input.dietaryRestrictions }),
      ...(input.notificationSettings && { notificationSettings: JSON.stringify(input.notificationSettings) }),
    };
    
    const existingPreferences = await db.familyPreference.findFirst({
        where: { familyId: input.familyId }
    });

    if (existingPreferences) {
        const updatedPreferences = await db.familyPreference.update({
            where: { id: existingPreferences.id },
            data: dataToUpdate,
          });
        return updatedPreferences;
    } else {
        const newPreferences = await db.familyPreference.create({
            data: {
                familyId: input.familyId,
                ...dataToUpdate
            }
        });
        return newPreferences;
    }
  });
