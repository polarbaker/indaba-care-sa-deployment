import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useAuthStore } from "~/stores/authStore";
import { Button } from "~/components/ui/Button";
import { LotusPetal } from "~/components/ui/LotusPetal";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { isAuthenticated, user } = useAuthStore();
  
  return (
    <div className="bg-background">
      <div className="relative isolate">
        {/* Hero section with gradient background */}
        <div className="relative bg-gradient-to-r from-primary to-primary-light">
          <div className="absolute top-10 right-10 opacity-10">
            <LotusPetal color="white" width={300} height={300} />
          </div>
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:py-40 relative z-10">
            <div className="text-center max-w-2xl mx-auto">
              <h1 className="text-4xl font-bold font-heading tracking-tight text-text-primary sm:text-6xl">
                Childcare management for South Africa
              </h1>
              <p className="mt-6 text-lg leading-8 text-text-secondary">
                Indaba Care connects parents and nannies with powerful tools for childcare observation, communication, and development tracking.
              </p>
              
              {isAuthenticated ? (
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link
                    to={user?.role === "NANNY" ? "/nanny/dashboard/" : user?.role === "PARENT" ? "/parent/dashboard/" : "/admin/dashboard/"}
                    className="rounded-md bg-on-primary px-3.5 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-150"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link
                    to="/auth/register/"
                    className="rounded-md bg-on-primary px-3.5 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-150"
                  >
                    Get started
                  </Link>
                  <Link
                    to="/auth/login/"
                    className="text-sm font-semibold leading-6 text-on-primary"
                  >
                    Log in <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      
        {/* Features section */}
        <div className="bg-surface py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-primary font-heading">Easier childcare</h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary font-heading sm:text-4xl">
                Everything you need for childcare management
              </p>
              <p className="mt-6 text-lg leading-8 text-text-secondary">
                Indaba Care provides tools for nannies, parents, and administrators to collaborate effectively, even with limited connectivity.
              </p>
            </div>
            
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-text-primary font-heading">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <svg className="h-6 w-6 text-on-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                    </div>
                    Works offline
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-text-secondary">
                    Keep working even without internet connection. Your data will sync automatically when you're back online.
                  </dd>
                </div>
                
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-text-primary font-heading">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <svg className="h-6 w-6 text-on-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                    </div>
                    AI-powered messaging
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-text-secondary">
                    Communicate securely with AI-assisted messaging and automatic summarization of child development updates.
                  </dd>
                </div>
                
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-text-primary font-heading">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <svg className="h-6 w-6 text-on-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    Role-based access
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-text-secondary">
                    Specific features for nannies, parents, and administrators with appropriate permissions for each role.
                  </dd>
                </div>
                
                <div className="relative pl-16">
                  <dt className="text-base font-semibold leading-7 text-text-primary font-heading">
                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                      <svg className="h-6 w-6 text-on-primary" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                      </svg>
                    </div>
                    Development tracking
                  </dt>
                  <dd className="mt-2 text-base leading-7 text-text-secondary">
                    Track child development milestones and access resources tailored to each child's developmental stage.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
