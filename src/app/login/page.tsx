import LoginClient from "@/components/LoginClient";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.svg"
            className="mx-auto h-16 w-16 rounded-2xl shadow-glow"
            alt="TOPgolfer"
          />
          <h1 className="mt-4 text-2xl font-bold text-ink">TOPgolfer</h1>
        </div>
        <LoginClient />
      </div>
    </main>
  );
}
