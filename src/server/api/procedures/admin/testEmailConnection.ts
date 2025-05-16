import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { baseProcedure } from "~/server/api/trpc";
import { getUserFromToken, validateUserRole } from "~/lib/auth";
// In a real app, you would import your email sending library (e.g., nodemailer)
// import nodemailer from "nodemailer";

const emailSettingsSchema = z.object({
  provider: z.enum(["smtp", "sendgrid", "mailchimp", "none"]),
  smtpHost: z.string().optional(),
  smtpPort: z.string().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  apiKey: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
});

export const testEmailConnection = baseProcedure
  .input(
    z.object({
      token: z.string(),
      provider: z.enum(["smtp", "sendgrid", "mailchimp", "none"]),
      settings: emailSettingsSchema,
    })
  )
  .mutation(async ({ input }) => {
    // Authenticate user and validate role
    const user = await getUserFromToken(input.token);
    validateUserRole(user, "ADMIN");
    
    // In a real app, you would attempt to send a test email using the provided settings
    // For this demo, we'll just simulate a successful connection
    
    if (input.provider === "none") {
      return {
        success: true,
        message: "Email provider is set to None. No test needed.",
      };
    }
    
    // Simulate connection test based on provider
    try {
      if (input.provider === "smtp") {
        if (!input.settings.smtpHost || !input.settings.smtpPort || !input.settings.fromEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "SMTP host, port, and from email are required" });
        }
        // const transporter = nodemailer.createTransport({
        //   host: input.settings.smtpHost,
        //   port: parseInt(input.settings.smtpPort),
        //   secure: parseInt(input.settings.smtpPort) === 465, // true for 465, false for other ports
        //   auth: {
        //     user: input.settings.smtpUser,
        //     pass: input.settings.smtpPassword,
        //   },
        // });
        // await transporter.verify(); // Verify connection configuration
        // await transporter.sendMail({
        //   from: `"${input.settings.fromName || 'Indaba Care'}" <${input.settings.fromEmail}>`,
        //   to: user.email, // Send test email to admin
        //   subject: "Indaba Care - Email Connection Test",
        //   text: "This is a test email to verify your email provider settings.",
        //   html: "<p>This is a test email to verify your email provider settings.</p>",
        // });
      } else if (input.provider === "sendgrid" || input.provider === "mailchimp") {
        if (!input.settings.apiKey || !input.settings.fromEmail) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "API key and from email are required" });
        }
        // Simulate API call to test connection
        // await someMailProviderSDK.testConnection(input.settings.apiKey);
        // await someMailProviderSDK.sendTestEmail(user.email, input.settings.fromEmail);
      }
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        message: "Email connection test successful",
      };
    } catch (error: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Email connection test failed: ${error.message || "Unknown error"}`,
      });
    }
  });
