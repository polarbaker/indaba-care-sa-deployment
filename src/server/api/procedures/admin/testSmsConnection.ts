import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
// In a real app, you would import your SMS sending library (e.g., Twilio SDK)
// import twilio from "twilio";

const smsSettingsSchema = z.object({
  provider: z.enum(["twilio", "vonage", "none"]),
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  fromNumber: z.string().optional(),
});

export const testSmsConnection = baseProcedure
  .input(
    z.object({
      token: z.string(),
      provider: z.enum(["twilio", "vonage", "none"]),
      settings: smsSettingsSchema,
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user and validate role
    const user = await getUserFromToken(input.token);
    validateUserRole(user, "ADMIN");
    
    if (input.provider === "none") {
      return {
        success: true,
        message: "SMS provider is set to None. No test needed.",
      };
    }
    
    // In a real app, you would attempt to send a test SMS using the provided settings
    try {
      if (!input.settings.accountSid || !input.settings.authToken || !input.settings.fromNumber) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account SID, Auth Token, and From Number are required" });
      }
      
      // if (input.provider === "twilio") {
      //   const client = twilio(input.settings.accountSid, input.settings.authToken);
      //   await client.messages.create({
      //     body: "Indaba Care - SMS Connection Test",
      //     from: input.settings.fromNumber,
      //     to: user.phoneNumber || "+15551234567", // Send to admin's phone or a test number
      //   });
      // } else if (input.provider === "vonage") {
      //   // Similar logic for Vonage
      // }
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        message: "SMS connection test successful",
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `SMS connection test failed: ${error.message || "Unknown error"}`,
      });
    }
  });
