import { z } from "zod";
import { baseProcedure } from "~/server/api/trpc";
import { getUserFromToken } from "~/lib/auth";

export const getMe = baseProcedure
  .input(
    z.object({
      token: z.string(),
    })
  )
  .query(async ({ input }) => {
    const user = await getUserFromToken(input.token);
    
    // Get profile info based on role
    let profile = null;
    if (user.role === "NANNY") {
      profile = user.nannyProfile;
    } else if (user.role === "PARENT") {
      profile = user.parentProfile;
    } else if (user.role === "ADMIN") {
      profile = user.adminProfile;
    }
    
    if (!profile) {
      return {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    }
    
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: profile.firstName,
      lastName: profile.lastName,
      profileImageUrl: 'profileImageUrl' in profile ? profile.profileImageUrl : undefined,
    };
  });
