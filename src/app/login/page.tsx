import { GoogleSignInButton } from "@/components/auth/google-signin-button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to DataGist
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Automated Analytics Reports for Busy Founders
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
