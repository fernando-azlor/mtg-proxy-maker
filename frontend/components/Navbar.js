'use client';
import { useAuth } from '../context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) return null;

  return (
    <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-amber-400 hover:text-amber-300">
          MTG Proxy Maker
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link href="/decks" className="text-gray-300 hover:text-white text-sm">
                Mis Mazos
              </Link>
              <span className="text-gray-500 text-sm">{user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-300 hover:text-white text-sm">
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="bg-amber-500 hover:bg-amber-400 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
