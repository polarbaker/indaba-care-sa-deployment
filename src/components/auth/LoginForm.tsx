import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "~/trpc/react";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";
import { Input } from "~/components/ui/Input";
import toast from "react-hot-toast";
import { useRouter } from "@tanstack/react-router";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });
  
  const loginMutation = api.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user);
      toast.success("Logged in successfully");
      
      // Navigate to the appropriate dashboard based on user role
      const dashboardPath = 
        data.user.role === "NANNY" 
          ? "/nanny/dashboard/" 
          : data.user.role === "PARENT" 
            ? "/parent/dashboard/" 
            : "/admin/dashboard/";
      
      router.navigate({ to: dashboardPath });
    },
    onError: (error) => {
      toast.error(error.message);
      setIsLoggingIn(false);
    },
  });
  
  const onSubmit = (data: LoginFormValues) => {
    setIsLoggingIn(true);
    loginMutation.mutate(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Email"
        type="email"
        {...register("email")}
        error={errors.email?.message}
        placeholder="your@email.com"
      />
      
      <Input
        label="Password"
        type="password"
        {...register("password")}
        error={errors.password?.message}
        placeholder="••••••••"
      />
      
      <Button
        type="submit"
        fullWidth
        isLoading={isLoggingIn}
      >
        {isLoggingIn ? "Logging in..." : "Log in"}
      </Button>
    </form>
  );
}