import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import { useAuthStore } from "~/stores/authStore";
import { useSyncStore } from "~/stores/syncStore";
import { useNetworkStatus } from "~/hooks/useNetworkStatus";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

// Password strength regex patterns
const hasUpperCase = /[A-Z]/;
const hasLowerCase = /[a-z]/;
const hasNumbers = /\d/;
const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

// Define form validation schemas
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(hasUpperCase, "Password must contain at least one uppercase letter")
    .regex(hasLowerCase, "Password must contain at least one lowercase letter")
    .regex(hasNumbers, "Password must contain at least one number")
    .regex(hasSpecialChar, "Password must contain at least one special character"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Please enter your password to confirm"),
  confirmDelete: z.literal(true, {
    errorMap: () => ({ message: "You must confirm this action" }),
  }),
});

// Define types
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
type DeleteAccountFormValues = z.infer<typeof deleteAccountSchema>;

interface AccountSecurityProps {
  // Removed props that will be handled internally by fetching data
}

function PasswordChangeForm() {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { token } = useAuthStore();
  const { isOnline } = useSyncStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
  });
  
  const newPassword = watch("newPassword", "");
  
  // Calculate password strength
  const calculateStrength = (password: string): number => {
    if (!password) return 0;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character checks
    if (hasUpperCase.test(password)) strength += 1;
    if (hasLowerCase.test(password)) strength += 1;
    if (hasNumbers.test(password)) strength += 1;
    if (hasSpecialChar.test(password)) strength += 1;
    
    // Normalize to 0-100
    return Math.min(Math.floor((strength / 6) * 100), 100);
  };
  
  const passwordStrength = calculateStrength(newPassword);
  
  // Get strength color and label
  const getStrengthColor = (strength: number): string => {
    if (strength < 40) return "bg-red-500";
    if (strength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };
  
  const getStrengthLabel = (strength: number): string => {
    if (strength < 40) return "Weak";
    if (strength < 70) return "Moderate";
    return "Strong";
  };
  
  const changePasswordMutation = api.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setIsChangingPassword(false);
      reset();
    },
    onError: (error) => {
      toast.error(`Failed to change password: ${error.message}`);
    },
  });
  
  const onSubmit = (data: PasswordChangeFormValues) => {
    if (!isOnline) {
      toast.error("Cannot change password while offline");
      return;
    }
    
    changePasswordMutation.mutate({
      token: token!,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };
  
  const handleCancel = () => {
    setIsChangingPassword(false);
    reset();
  };
  
  if (!isChangingPassword) {
    return (
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-md font-medium text-gray-900">Password</h3>
          <p className="text-sm text-gray-500">
            Change your password to keep your account secure
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsChangingPassword(true)}
          disabled={!isOnline}
        >
          Change Password
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <h3 className="text-md font-medium text-gray-900">Change Password</h3>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          type="password"
          label="Current Password"
          {...register("currentPassword")}
          error={errors.currentPassword?.message}
        />
        
        <div className="space-y-1">
          <Input
            type="password"
            label="New Password"
            {...register("newPassword")}
            error={errors.newPassword?.message}
          />
          
          {newPassword && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getStrengthColor(passwordStrength)}`}
                    style={{ width: `${passwordStrength}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-xs text-gray-500">
                  {getStrengthLabel(passwordStrength)}
                </span>
              </div>
              <ul className="text-xs text-gray-500 list-disc pl-5 space-y-1">
                <li className={hasUpperCase.test(newPassword) ? "text-green-600" : ""}>
                  At least one uppercase letter
                </li>
                <li className={hasLowerCase.test(newPassword) ? "text-green-600" : ""}>
                  At least one lowercase letter
                </li>
                <li className={hasNumbers.test(newPassword) ? "text-green-600" : ""}>
                  At least one number
                </li>
                <li className={hasSpecialChar.test(newPassword) ? "text-green-600" : ""}>
                  At least one special character
                </li>
                <li className={newPassword.length >= 8 ? "text-green-600" : ""}>
                  Minimum 8 characters
                </li>
              </ul>
            </div>
          )}
        </div>
        
        <Input
          type="password"
          label="Confirm New Password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
        />
        
        <div className="flex justify-end space-x-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={changePasswordMutation.isLoading}
          >
            Save New Password
          </Button>
        </div>
      </form>
    </div>
  );
}

function TwoFactorAuth({ enabled = false, onToggle }: { enabled?: boolean, onToggle?: (enabled: boolean) => void }) {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const { token } = useAuthStore();
  const { isOnline } = useSyncStore();
  
  const setup2FAMutation = api.setup2FA.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCodeUrl);
      setIsSettingUp(true);
    },
    onError: (error) => {
      toast.error(`Failed to set up 2FA: ${error.message}`);
    },
  });
  
  const verify2FAMutation = api.verify2FA.useMutation({
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      if (onToggle) onToggle(true);
    },
    onError: (error) => {
      toast.error(`Failed to verify code: ${error.message}`);
      setIsVerifying(false);
    },
  });
  
  const disable2FAMutation = api.disable2FA.useMutation({
    onSuccess: () => {
      toast.success("Two-factor authentication disabled");
      if (onToggle) onToggle(false);
    },
    onError: (error) => {
      toast.error(`Failed to disable 2FA: ${error.message}`);
    },
  });
  
  const handleSetup = () => {
    if (!isOnline) {
      toast.error("Cannot set up 2FA while offline");
      return;
    }
    
    setup2FAMutation.mutate({ token: token! });
  };
  
  const handleVerify = () => {
    if (!verificationCode) {
      toast.error("Please enter the verification code");
      return;
    }
    
    setIsVerifying(true);
    verify2FAMutation.mutate({
      token: token!,
      code: verificationCode,
    });
  };
  
  const handleDisable = () => {
    if (!isOnline) {
      toast.error("Cannot disable 2FA while offline");
      return;
    }
    
    disable2FAMutation.mutate({ token: token! });
  };
  
  const handleCancel = () => {
    setIsSettingUp(false);
    setQrCode(null);
    setVerificationCode("");
    setRecoveryCodes(null);
  };
  
  // Display recovery codes after successful setup
  if (recoveryCodes) {
    return (
      <div className="space-y-4">
        <h3 className="text-md font-medium text-gray-900">Recovery Codes</h3>
        <p className="text-sm text-gray-500">
          Save these recovery codes in a secure place. They can be used to regain access to your account if you lose your 2FA device.
        </p>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <ul className="space-y-1 font-mono text-sm">
            {recoveryCodes.map((code, index) => (
              <li key={index} className="flex justify-between">
                <span>{code}</span>
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-800"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    toast.success("Code copied to clipboard");
                  }}
                >
                  Copy
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => {
              setRecoveryCodes(null);
              setIsSettingUp(false);
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }
  
  // Display QR code and verification input during setup
  if (isSettingUp && qrCode) {
    return (
      <div className="space-y-4">
        <h3 className="text-md font-medium text-gray-900">Set Up Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500">
          Scan this QR code with your authenticator app (such as Google Authenticator, Authy, or Microsoft Authenticator).
        </p>
        
        <div className="flex justify-center">
          <img src={qrCode} alt="QR Code" className="w-48 h-48" />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            id="verification-code"
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleVerify}
            isLoading={isVerifying}
          >
            Verify
          </Button>
        </div>
      </div>
    );
  }
  
  // Display toggle button for enabling/disabling 2FA
  return (
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-md font-medium text-gray-900">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500">
          {enabled
            ? "Your account is protected with two-factor authentication"
            : "Add an extra layer of security to your account"}
        </p>
      </div>
      <Button
        type="button"
        variant={enabled ? "outline" : "primary"}
        onClick={enabled ? handleDisable : handleSetup}
        disabled={!isOnline}
      >
        {enabled ? "Disable" : "Enable"} 2FA
      </Button>
    </div>
  );
}

function SessionsManager({ sessions = [], onRevoke }: {
  sessions?: {
    id: string;
    deviceInfo: string;
    browser: string;
    ipAddress: string;
    lastActiveAt: Date;
    isCurrentSession: boolean;
  }[];
  onRevoke?: (sessionId: string) => void;
}) {
  const { isOnline } = useSyncStore();
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };
  
  const handleRevoke = (sessionId: string) => {
    if (!isOnline) {
      toast.error("Cannot revoke sessions while offline");
      return;
    }
    
    if (onRevoke) onRevoke(sessionId);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-md font-medium text-gray-900">Active Sessions</h3>
      </div>
      
      {sessions.length === 0 ? (
        <p className="text-sm text-gray-500">No active sessions found.</p>
      ) : (
        <div className="overflow-hidden bg-white rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <li key={session.id} className="px-4 py-3">
                <div className="flex justify-between">
                  <div>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {session.deviceInfo || "Unknown device"}
                      </span>
                      {session.isCurrentSession && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span>{session.browser || "Unknown browser"}</span>
                      <span className="mx-1">•</span>
                      <span>{session.ipAddress || "Unknown IP"}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Last active: {formatDate(session.lastActiveAt)}
                    </div>
                  </div>
                  <div>
                    {!session.isCurrentSession && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevoke(session.id)}
                        disabled={!isOnline}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DataManagement({ onExport, onDelete }: {
  onExport?: () => void;
  onDelete?: (password: string) => void;
}) {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { isOnline } = useSyncStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<DeleteAccountFormValues>({
    resolver: zodResolver(deleteAccountSchema),
  });
  
  const handleExport = () => {
    if (!isOnline) {
      toast.error("Cannot export data while offline");
      return;
    }
    
    if (onExport) onExport();
  };
  
  const onSubmit = (data: DeleteAccountFormValues) => {
    if (!isOnline) {
      toast.error("Cannot delete account while offline");
      return;
    }
    
    if (onDelete) onDelete(data.password);
  };
  
  const handleCancel = () => {
    setIsDeletingAccount(false);
    reset();
  };
  
  if (isDeletingAccount) {
    return (
      <div className="space-y-4">
        <h3 className="text-md font-medium text-red-600">Delete Account</h3>
        <p className="text-sm text-gray-500">
          This action is irreversible. All your data will be permanently deleted.
        </p>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            type="password"
            label="Enter your password to confirm"
            {...register("password")}
            error={errors.password?.message}
          />
          
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="confirm-delete"
                type="checkbox"
                className="h-4 w-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                {...register("confirmDelete")}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="confirm-delete" className="font-medium text-gray-700">
                I understand that this action cannot be undone
              </label>
              {errors.confirmDelete && (
                <p className="text-red-600 text-xs mt-1">{errors.confirmDelete.message}</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
            >
              Delete My Account
            </Button>
          </div>
        </form>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-md font-medium text-gray-900">Export Your Data</h3>
          <p className="text-sm text-gray-500">
            Download a copy of your personal data
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          disabled={!isOnline}
        >
          Download My Data
        </Button>
      </div>
      
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-md font-medium text-red-600">Delete Account</h3>
            <p className="text-sm text-gray-500">
              Permanently delete your account and all of your data
            </p>
          </div>
          <Button
            type="button"
            variant="danger"
            onClick={() => setIsDeletingAccount(true)}
            disabled={!isOnline}
          >
            Delete My Account
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AccountSecurity({}: AccountSecurityProps) {
  const { isOnline: networkIsOnline } = useNetworkStatus();
  const { token, user } = useAuthStore();
  const utils = api.useUtils();

  // Fetch user sessions
  const { data: sessionsData, isLoading: isLoadingSessions, refetch: refetchSessions } = api.getUserSessions.useQuery(
    { token: token! },
    { enabled: !!token && networkIsOnline }
  );

  // Fetch current user details for 2FA status
  const { data: userData, isLoading: isLoadingUser, refetch: refetchUser } = api.getMe.useQuery(
    { token: token! },
    { enabled: !!token && networkIsOnline }
  );

  const twoFactorEnabled = userData?.twoFactorAuth?.isEnabled || false;

  const handleTwoFactorToggle = async (enabled: boolean) => {
    // This is handled by the TwoFactorAuth component's internal mutations
    // We just need to refetch user data to update the UI
    await refetchUser();
    await utils.getMe.invalidate(); // Ensure cache is updated
  };

  const revokeSessionMutation = api.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Session revoked successfully");
      void refetchSessions();
    },
    onError: (error) => {
      toast.error(`Failed to revoke session: ${error.message}`);
    },
  });

  const handleSessionRevoke = (sessionId: string) => {
    if (!networkIsOnline) {
      toast.error("Cannot revoke sessions while offline.");
      return;
    }
    revokeSessionMutation.mutate({ token: token!, sessionId });
  };

  const exportUserDataMutation = api.exportUserData.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // Potentially trigger download if URL is provided, or inform user about email
    },
    onError: (error) => {
      toast.error(`Failed to export data: ${error.message}`);
    },
  });

  const handleExportData = () => {
    if (!networkIsOnline) {
      toast.error("Cannot export data while offline.");
      return;
    }
    exportUserDataMutation.mutate({ token: token!, format: "json" });
  };

  const deleteAccountMutation = api.deleteAccount.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // Handle logout or redirect after successful deletion initiation
      // For now, just inform the user
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });

  const handleDeleteAccount = (password: string) => {
    if (!networkIsOnline) {
      toast.error("Cannot delete account while offline.");
      return;
    }
    deleteAccountMutation.mutate({ token: token!, password });
  };
  
  if (!networkIsOnline && (isLoadingSessions || isLoadingUser)) {
     // Show a generic loading state if offline and still trying to load initial data
     return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-4 text-gray-600">Loading account security information...</p>
        </div>
      );
  }

  if (!networkIsOnline) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Account security settings are not available while offline. Please connect to the internet to access these settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoadingSessions || isLoadingUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PasswordChangeForm />
      
      <div className="border-t border-gray-200 pt-6">
        <TwoFactorAuth 
          enabled={twoFactorEnabled} 
          onToggle={handleTwoFactorToggle} 
        />
      </div>
      
      <div className="border-t border-gray-200 pt-6">
        <SessionsManager 
          sessions={sessionsData} 
          onRevoke={handleSessionRevoke} 
        />
      </div>
      
      <div className="border-t border-gray-200 pt-6">
        <DataManagement 
          onExport={handleExportData} 
          onDelete={handleDeleteAccount} 
        />
      </div>
    </div>
  );
}
