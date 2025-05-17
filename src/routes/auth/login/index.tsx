import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { LoginForm } from "~/components/auth/LoginForm";
import { motion } from "framer-motion";
import { LotusPetal } from "~/components/ui/LotusPetal";

export const Route = createFileRoute("/auth/login/")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Coral gradient with logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-primary to-primary-light items-center justify-center relative overflow-hidden">
        <div className="absolute top-10 left-10 opacity-20">
          <LotusPetal color="white" width={200} height={200} />
        </div>
        <div className="absolute bottom-10 right-10 opacity-20">
          <LotusPetal color="white" width={150} height={150} />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <svg
            className="h-20 w-auto text-white mx-auto"
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
          <h1 className="mt-6 text-4xl font-bold text-white">Indaba Care</h1>
          <p className="mt-2 text-white text-opacity-80 max-w-md mx-auto">
            Connecting families and caregivers with powerful tools for childcare observation, 
            communication, and development tracking.
          </p>
        </motion.div>
      </div>
      
      {/* Right side - Login form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24 bg-background">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-center lg:hidden"
            >
              <svg
                className="h-12 w-auto text-primary"
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
            </motion.div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-center text-3xl font-bold font-heading text-text-primary"
            >
              Welcome Back
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-2 text-center text-sm text-text-secondary"
            >
              Sign in to your account to continue
            </motion.p>
          </div>

          <div className="mt-8">
            <div className="mt-6">
              <LoginForm />
              
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-text-secondary">
                      New to Indaba Care?
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    to="/auth/register/"
                    className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-text-primary bg-background hover:bg-surface focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-150"
                  >
                    Create a new account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
