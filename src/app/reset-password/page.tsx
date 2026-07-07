import ResetPasswordClient from "@/components/ResetPasswordClient";

export const metadata = { title: "Reset password · TOPgolfer" };

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <img
        src="/icon.svg"
        className="mx-auto h-16 w-16 rounded-2xl shadow-glow"
        alt="TOPgolfer"
      />
      <ResetPasswordClient />
    </main>
  );
}
