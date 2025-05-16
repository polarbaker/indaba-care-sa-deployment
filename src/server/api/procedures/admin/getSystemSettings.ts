import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { getUserFromToken, validateUserRole } from "~/lib/auth";

// Define a default settings object to return if no settings are found
const defaultSystemSettings = {
  general: {
    siteName: "Indaba Care",
    logoUrl: "",
    bannerUrl: "",
    primaryColor: "#3b82f6",
    secondaryColor: "#6366f1",
    accentColor: "#f59e0b",
    defaultTheme: "light",
    maintenanceMode: false,
    maintenanceMessage: "The system is currently undergoing scheduled maintenance. Please check back later.",
  },
  security: {
    passwordMinLength: 10,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    passwordExpiryDays: 90,
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 3,
    auditLoggingEnabled: true,
    logRetentionDays: 90,
    detailedLogging: false,
  },
  notifications: {
    globalAlert: {
      enabled: false,
      message: "",
      priority: "info",
    },
    emailProvider: {
      provider: "smtp",
      smtpHost: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPassword: "",
      fromEmail: "",
      fromName: "Indaba Care",
    },
    smsProvider: {
      provider: "none",
      accountSid: "",
      authToken: "",
      fromNumber: "",
    },
    pushProvider: {
      provider: "none",
      apiKey: "",
      appId: "",
    },
    emergencyKeywords: [
      { keyword: "emergency", severity: "critical" },
      { keyword: "urgent", severity: "high" },
      { keyword: "help", severity: "medium" },
    ],
    keywordThreshold: 2,
    autoFlag: true,
  },
  sync: {
    syncIntervalMinutes: 15,
    conflictResolution: "lastWriteWins",
    maxCacheMB: 200,
    warnAtPercentage: 80,
    enableBackgroundSync: true,
    syncOnWifiOnly: false,
    maxSyncRetries: 3,
    syncPriorities: {
      observations: 1,
      messages: 2,
      profiles: 3,
      media: 4,
    },
  },
  ai: {
    openAI: {
      enabled: false,
      apiKey: "",
      model: "gpt-4",
      temperature: 0.7,
      maxTokens: 2000,
    },
    features: {
      autoTagging: true,
      messageSummarization: true,
      contentGeneration: true,
      chatAssistant: true,
      emergencyDetection: true,
    },
    limits: {
      maxDailyApiCalls: 1000,
      maxDailyApiCallsPerUser: 100,
      maxSummaryWords: 200,
      maxResponseTokens: 2000,
    },
  },
};

export const getSystemSettings = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    // Authenticate user and validate role
    const user = await getUserFromToken(input.token);
    validateUserRole(user, "ADMIN");
    
    // Fetch system settings
    // Assuming there's only one row for system settings
    const settings = await db.systemSettings.findFirst();
    
    if (settings) {
      // Parse the JSON string back into an object
      // Ensure all nested objects are correctly parsed or defaulted
      const parsedSettings = {
        general: settings.general ? JSON.parse(settings.general as string) : defaultSystemSettings.general,
        security: settings.security ? JSON.parse(settings.security as string) : defaultSystemSettings.security,
        notifications: settings.notifications ? JSON.parse(settings.notifications as string) : defaultSystemSettings.notifications,
        sync: settings.sync ? JSON.parse(settings.sync as string) : defaultSystemSettings.sync,
        ai: settings.ai ? JSON.parse(settings.ai as string) : defaultSystemSettings.ai,
      };
      return parsedSettings;
    }
    
    // If no settings found, return default settings
    return defaultSystemSettings;
  });
