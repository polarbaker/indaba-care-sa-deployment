import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { RegisterForm } from "~/components/auth/RegisterForm";
import { LotusPetal } from "~/components/ui/LotusPetal";

export const Route = createFileRoute("/auth/register/")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-10 right-10 opacity-5">
        <LotusPetal color="var(--color-primary)" width={200} height={200} />
      </div>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <svg
            className="h-12 w-auto text-primary mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-bold text-text-primary font-heading">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              to="/auth/login/"
              className="font-medium text-primary hover:text-primary-light transition-all duration-150"
            >
              Log in instead
            </Link>
          </p>
        </div>
        
        <div className="mt-8 bg-surface py-8 px-4 shadow-card rounded-card sm:px-10">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
