import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - DataGist",
  description: "Privacy Policy for DataGist",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24 sm:py-32 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Privacy Policy
      </h1>
      <div className="mt-10 space-y-8 text-base leading-7 text-gray-700">
        <p>Last updated: {new Date().toLocaleDateString()}</p>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">1. Introduction</h2>
          <p className="mt-4">
            DataGist ("we", "our", or "us") respects your privacy and is committed to protecting it.
            This Privacy Policy explains how we collect, use, and share information about you when
            you use our website and services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">2. Data We Collect</h2>
          <p className="mt-4">
            <strong>Google Analytics Data:</strong> We access your Google Analytics 4 (GA4) data
            strictly to generate reports for you. We do not sell, rent, or share this data with
            third parties for their marketing purposes.
          </p>
          <p className="mt-4">
            <strong>Account Information:</strong> When you sign up, we collect your email address
            and name via Google OAuth.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">3. How We Use Your Data</h2>
          <ul className="mt-4 list-disc pl-5 space-y-2">
            <li>To provide and improve our analytics reporting service.</li>
            <li>To communicate with you about your account and updates.</li>
            <li>To process payments via our payment processor (Stripe).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">4. Data Security</h2>
          <p className="mt-4">
            We implement appropriate technical and organizational measures to protect your personal
            data against unauthorized access, alteration, disclosure, or destruction.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-900">5. Contact Us</h2>
          <p className="mt-4">
            If you have any questions about this Privacy Policy, please contact us at
            support@datagist.ai.
          </p>
        </section>
      </div>
    </main>
  );
}
