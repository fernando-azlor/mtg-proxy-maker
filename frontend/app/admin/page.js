'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import api from '../../lib/api';

const ROLE_LABELS = {
  CLIENT:  { label: 'Gratuita',  color: 'text-gray-300' },
  PREMIUM: { label: 'Premium',   color: 'text-amber-400' },
  ADMIN:   { label: 'Admin',     color: 'text-red-400'   },
};

export default function AdminPage() {
  const { user, loading, isAdmin, updateRole } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (!loading && user && !isAdmin) router.push('/');
  }, [user, loading, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/api/users');
      setUsers(data.users);
    } catch {
      setError('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    setUpdatingId(targetUserId);
    try {
      await updateRole(targetUserId, newRole);
      setUsers(prev =>
        prev.map(u => u.id === targetUserId ? { ...u, role: newRole } : u)
      );
    } catch {
      setError('Error al actualizar rol');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Panel de administración
            <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">ADMIN</span>
          </h1>
          <p className="text-gray-400 text-sm mt-1">{users.length} usuario{users.length !== 1 ? 's' : ''} registrados</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {loadingUsers ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Mazos</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Registro</th>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Rol</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const meta = ROLE_LABELS[u.role] || ROLE_LABELS.CLIENT;
                  const isSelf = u.id === user?.id;
                  return (
                    <tr key={u.id} className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${isSelf ? 'bg-amber-500/5' : ''}`}>
                      <td className="px-5 py-3 text-white">
                        {u.email}
                        {isSelf && <span className="text-xs text-amber-500 ml-1.5">(tú)</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-300">{u._count?.decks ?? 0}</td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(u.createdAt).toLocaleDateString('es-ES')}
                      </td>
                      <td className={`px-5 py-3 font-medium ${meta.color}`}>{meta.label}</td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          disabled={updatingId === u.id || isSelf}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="bg-gray-800 border border-gray-600 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={isSelf ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}
                        >
                          <option value="CLIENT">Gratuita</option>
                          <option value="PREMIUM">Premium</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-900 border border-gray-700 rounded-xl text-sm text-gray-400">
          <p className="font-semibold text-gray-300 mb-1">Cómo crear un administrador inicial:</p>
          <code className="block bg-gray-800 rounded px-3 py-2 text-amber-400 text-xs mt-2 whitespace-pre-wrap">
            {`docker exec -it mtg_db psql -U postgres mtgproxy -c \\\n  "UPDATE \\"User\\" SET role = 'ADMIN' WHERE email = 'tu@email.com';"`}
          </code>
          <p className="mt-2">Después cierra sesión y vuelve a entrar para que el JWT refleje el nuevo rol.</p>
        </div>
      </main>
    </div>
  );
}
