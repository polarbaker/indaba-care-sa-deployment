import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

// Define a flexible schema for settings updates
const settingsSchema = z.object({
  general: z.any().optional(),
  security: z.any().optional(),
  notifications: z.any().optional(),
  sync: z.any().optional(),
  ai: z.any().optional(),
});

export const updateSystemSettings = baseProcedure
  .input(
    z.object({
      token: z.string(),
      settings: settingsSchema,
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user and validate role
    const user = await getUserFromToken(input.token);
    validateUserRole(user, "ADMIN");
    
    // Fetch current settings or create if none exist
    let currentSettings = await db.systemSettings.findFirst();
    
    if (!currentSettings) {
      currentSettings = await db.systemSettings.create({
        data: {
          // Initialize with empty JSON strings or default structures
          general: JSON.stringify({}),
          security: JSON.stringify({}),
          notifications: JSON.stringify({}),
          sync: JSON.stringify({}),
          ai: JSON.stringify({}),
        },
      });
    }
    
    // Prepare data for update
    const updateData: { [key: string]: string } = {};
    
    if (input.settings.general) {
      updateData.general = JSON.stringify(input.settings.general);
    }
    if (input.settings.security) {
      updateData.security = JSON.stringify(input.settings.security);
    }
    if (input.settings.notifications) {
      updateData.notifications = JSON.stringify(input.settings.notifications);
    }
    if (input.settings.sync) {
      updateData.sync = JSON.stringify(input.settings.sync);
    }
    if (input.settings.ai) {
      updateData.ai = JSON.stringify(input.settings.ai);
    }
    
    // Update system settings
    const updatedSettings = await db.systemSettings.update({
      where: { id: currentSettings.id },
      data: updateData,
    });
    
    // Parse the updated settings to return to the client
    const parsedUpdatedSettings = {
      general: updatedSettings.general ? JSON.parse(updatedSettings.general as string) : {},
      security: updatedSettings.security ? JSON.parse(updatedSettings.security as string) : {},
      notifications: updatedSettings.notifications ? JSON.parse(updatedSettings.notifications as string) : {},
      sync: updatedSettings.sync ? JSON.parse(updatedSettings.sync as string) : {},
      ai: updatedSettings.ai ? JSON.parse(updatedSettings.ai as string) : {},
    };
    
    return {
      success: true,
      message: "System settings updated successfully",
      config: parsedUpdatedSettings,
    };
  });
