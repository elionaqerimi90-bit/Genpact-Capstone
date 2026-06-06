export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-blue-600 mb-4">
          Community Help Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-xl">
          Need help with daily tasks? Find volunteers nearby or offer your help to the community.
        </p>
      </div>

      <div className="flex gap-4">
        <a href="/register" className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-medium hover:bg-blue-700 transition">
          Get Started
        </a>
        <a href="/login" className="border border-blue-600 text-blue-600 px-8 py-3 rounded-full text-lg font-medium hover:bg-blue-50 transition">
          Login
        </a>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        <div className="bg-white rounded-2xl p-6 shadow text-center">
          <div className="text-3xl mb-3">📍</div>
          <h3 className="font-semibold text-lg mb-1">Location Based</h3>
          <p className="text-gray-500 text-sm">Find help requests near you on a live map</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow text-center">
          <div className="text-3xl mb-3">🤝</div>
          <h3 className="font-semibold text-lg mb-1">Community Driven</h3>
          <p className="text-gray-500 text-sm">Volunteers helping neighbors for free</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow text-center">
          <div className="text-3xl mb-3">⭐</div>
          <h3 className="font-semibold text-lg mb-1">Trusted & Safe</h3>
          <p className="text-gray-500 text-sm">Reviews, ratings and admin moderation</p>
        </div>
      </div>

    </div>
  );
}