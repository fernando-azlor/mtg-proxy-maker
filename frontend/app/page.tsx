import Link from "next/link";
import Navbar from "../components/Navbar";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main id="main-content" className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-amber-400 mb-4">
          MTG Proxy Maker
        </h1>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Construye tu mazo Commander, selecciona hasta 100 cartas y exporta un PDF listo para imprimir.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="bg-amber-500 hover:bg-amber-400 text-gray-900 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Empezar gratis
          </Link>
          <Link
            href="/login"
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors border border-gray-600"
          >
            Iniciar sesión
          </Link>
        </div>
      </main>
    </div>
  );
}
