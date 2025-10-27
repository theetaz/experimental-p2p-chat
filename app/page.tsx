import { RegistrationForm } from "@/components/registration-form";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="absolute inset-0 bg-grid-pattern opacity-5" />
      <div className="relative z-10 w-full flex flex-col items-center gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Globe Chat
          </h1>
          <p className="text-lg text-muted-foreground">
            Connect with people around the world, right now
          </p>
        </div>
        <RegistrationForm />
      </div>
    </div>
  );
}
