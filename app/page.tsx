import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Users, Zap, Shield, Download } from "lucide-react";

export default function Home() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-gradient-to-br from-gray-900 via-green-900 to-emerald-900">
      <main className="container mx-auto px-4 py-8 md:py-16">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/logo.png"
              alt="Universe Chat Logo"
              width={80}
              height={80}
              priority
              unoptimized
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Universe Chat
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Connect with anyone, anywhere, in real-time. Your cosmic conversation starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg">
            
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-gray-800 text-white rounded-lg font-semibold text-lg hover:bg-gray-700 transition-all transform hover:scale-105 shadow-lg border border-gray-700"
            >
              Sign In
            </Link>
            <a
              href="/universe-chat.apk"
              download
              className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold text-lg hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download APK
            </a>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-lg w-fit mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Find Anyone</h3>
            <p className="text-gray-400">
              Search and connect with users across the universe by name or username instantly.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-3 rounded-lg w-fit mb-4">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Real-time Messaging</h3>
            <p className="text-gray-400">
              Experience lightning-fast, real-time conversations with instant message delivery.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-700 hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-3 rounded-lg w-fit mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Secure & Private</h3>
            <p className="text-gray-400">
              Your conversations are secure with modern authentication and encryption.
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="py-6 text-center border-t border-gray-700">
        <p className="text-sm text-gray-400">
          Developed by Adeepa Wedage
        </p>
      </footer>
    </div>
  );
}
