import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">DataGist</h1>
        <p className="mt-4 text-xl text-gray-500">Automated Analytics Reports for Busy Founders</p>

        <div className="mt-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Analytics Reports <br />
            <span className="text-indigo-600">Delivered to Your Inbox</span>
          </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
            Stop wasting time digging through dashboards. Get AI-powered insights and actionable
            recommendations sent directly to you.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
