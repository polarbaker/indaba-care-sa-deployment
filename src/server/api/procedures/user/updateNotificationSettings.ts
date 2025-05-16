import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken } from "~/lib/auth";

export const updateNotificationSettings = baseProcedure
  .input(
    z.object({
      token: z.string(),
      settings: z.object({
        inAppMessages: z.boolean().default(true),
        inAppObservations: z.boolean().default(true),
        inAppApprovals: z.boolean().default(true),
        inAppEmergencies: z.boolean().default(true),
        emailMessages: z.boolean().default(false),
        emailObservations: z.boolean().default(false),
        emailApprovals: z.boolean().default(true),
        emailEmergencies: z.boolean().default(true),
        smsMessages: z.boolean().default(false),
        smsObservations: z.boolean().default(false),
        smsApprovals: z.boolean().default(false),
        smsEmergencies: z.boolean().default(true),
      }),
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user
    const user = await getUserFromToken(input.token);
    
    // Update or create notification settings
    await db.userNotificationSettings.upsert({
      where: { userId: user.id },
      update: {
        inAppMessages: input.settings.inAppMessages,
        inAppObservations: input.settings.inAppObservations,
        inAppApprovals: input.settings.inAppApprovals,
        inAppEmergencies: input.settings.inAppEmergencies,
        emailMessages: input.settings.emailMessages,
        emailObservations: input.settings.emailObservations,
        emailApprovals: input.settings.emailApprovals,
        emailEmergencies: input.settings.emailEmergencies,
        smsMessages: input.settings.smsMessages,
        smsObservations: input.settings.smsObservations,
        smsApprovals: input.settings.smsApprovals,
        smsEmergencies: input.settings.smsEmergencies,
      },
      create: {
        userId: user.id,
        inAppMessages: input.settings.inAppMessages,
        inAppObservations: input.settings.inAppObservations,
        inAppApprovals: input.settings.inAppApprovals,
        inAppEmergencies: input.settings.inAppEmergencies,
        emailMessages: input.settings.emailMessages,
        emailObservations: input.settings.emailObservations,
        emailApprovals: input.settings.emailApprovals,
        emailEmergencies: input.settings.emailEmergencies,
        smsMessages: input.settings.smsMessages,
        smsObservations: input.settings.smsObservations,
        smsApprovals: input.settings.smsApprovals,
        smsEmergencies: input.settings.smsEmergencies,
      },
    });
    
    return {
      success: true,
      message: "Notification settings updated successfully",
    };
  });
