import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  role: z.enum(["NANNY", "PARENT", "ADMIN"]),
  phoneNumber: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const [isRegistering, setIsRegistering] = useState(false);
  const { login } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: "PARENT", // Default role
    },
  });
  
  const registerMutation = api.register.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user);
      toast.success("Registered successfully");
    },
    onError: (error) => {
      toast.error(error.message);
      setIsRegistering(false);
    },
  });
  
  const onSubmit = (data: RegisterFormValues) => {
    setIsRegistering(true);
    // Remove confirmPassword as it's not needed in the API call
    const { confirmPassword, ...registrationData } = data;
    registerMutation.mutate(registrationData);
  };
  
  const selectedRole = watch("role");
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="First Name"
          {...register("firstName")}
          error={errors.firstName?.message}
          placeholder="John"
        />
        
        <Input
          label="Last Name"
          {...register("lastName")}
          error={errors.lastName?.message}
          placeholder="Doe"
        />
      </div>
      
      <Input
        label="Email"
        type="email"
        {...register("email")}
        error={errors.email?.message}
        placeholder="your@email.com"
      />
      
      <Input
        label="Phone Number (optional)"
        type="tel"
        {...register("phoneNumber")}
        error={errors.phoneNumber?.message}
        placeholder="+27 12 345 6789"
      />
      
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          I am registering as a:
        </label>
        
        <div className="flex flex-wrap gap-4">
          <label className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer ${
            selectedRole === "PARENT" ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}>
            <input
              type="radio"
              value="PARENT"
              {...register("role")}
              className="sr-only"
            />
            <span className={selectedRole === "PARENT" ? "text-blue-700 font-medium" : ""}>Parent</span>
          </label>
          
          <label className={`flex items-center space-x-2 p-3 border rounded-md cursor-pointer ${
            selectedRole === "NANNY" ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}>
            <input
              type="radio"
              value="NANNY"
              {...register("role")}
              className="sr-only"
            />
            <span className={selectedRole === "NANNY" ? "text-blue-700 font-medium" : ""}>Nanny</span>
          </label>
        </div>
        
        {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
      </div>
      
      <Input
        label="Password"
        type="password"
        {...register("password")}
        error={errors.password?.message}
        placeholder="••••••••"
      />
      
      <Input
        label="Confirm Password"
        type="password"
        {...register("confirmPassword")}
        error={errors.confirmPassword?.message}
        placeholder="••••••••"
      />
      
      <Button
        type="submit"
        fullWidth
        isLoading={isRegistering}
      >
        {isRegistering ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
