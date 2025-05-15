import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { RegisterForm } from "~/components/auth/RegisterForm";

export const Route = createFileRoute("/auth/register/")({
  component: RegisterPage,
});

function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              to="/auth/login/"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Log in instead
            </Link>
          </p>
        </div>
        
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
