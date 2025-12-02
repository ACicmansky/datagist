import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - DataGist",
  description: "Terms of Service for DataGist",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Terms of Service
      </h1>
      <div className="mt-10 space-y-8 text-base leading-7 text-gray-700">
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">1. Acceptance of Terms</h2>
          <p className="mt-4">
            By accessing or using DataGist, you agree to be bound by these Terms of Service. If you
            do not agree to these terms, please do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">2. Description of Service</h2>
          <p className="mt-4">
            DataGist provides automated analytics reporting services powered by AI. We connect to
            your Google Analytics account to generate insights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">3. User Accounts</h2>
          <p className="mt-4">
            You are responsible for maintaining the confidentiality of your account and password.
            You agree to accept responsibility for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">4. Subscription and Billing</h2>
          <p className="mt-4">
            Some features of the Service are billed on a subscription basis. You will be billed in
            advance on a recurring and periodic basis (such as monthly).
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">5. Limitation of Liability</h2>
          <p className="mt-4">
            In no event shall DataGist be liable for any indirect, incidental, special,
            consequential or punitive damages, including without limitation, loss of profits, data,
            use, goodwill, or other intangible losses.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">6. Changes to Terms</h2>
          <p className="mt-4">
            We reserve the right to modify or replace these Terms at any time. We will try to
            provide at least 30 days notice prior to any new terms taking effect.
          </p>
        </section>
      </div>
    </main>
  );
}
