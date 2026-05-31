'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import api from '../../lib/api';

export default function ProfilePage() {
  const { user, loading, logout, updateRole, isPremium } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/api/users/profile');
      setProfile(data.user);
    } catch {
      setError('Error al cargar el perfil');
    }
  };

  const handleRoleChange = async (newRole) => {
    if (newRole === user?.role) return;
    setUpdatingRole(true);
    setRoleSuccess('');
    setError('');
    try {
      await updateRole(newRole);
      setRoleSuccess('Tipo de cuenta actualizado correctamente');
      setTimeout(() => setRoleSuccess(''), 3000);
    } catch {
      setError('Error al actualizar el tipo de cuenta');
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') return;
    setDeleting(true);
    try {
      await api.delete('/api/users/me');
      await logout();
      router.push('/');
    } catch {
      setError('Error al eliminar la cuenta');
      setDeleting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">Mi perfil</h1>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Información de la cuenta</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Email</span>
              <span className="text-white text-sm">{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Mazos guardados</span>
              <span className="text-white text-sm">{profile?._count?.decks ?? '...'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Miembro desde</span>
              <span className="text-white text-sm">
                {profile ? new Date(profile.createdAt).toLocaleDateString('es-ES') : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Cambio de tipo de cuenta */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Tipo de cuenta</h2>
          <p className="text-gray-400 text-sm mb-4">Cambia entre cuenta gratuita y Premium en cualquier momento.</p>

          {roleSuccess && (
            <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg mb-4 text-sm">
              {roleSuccess}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={updatingRole || user?.role === 'CLIENT'}
              onClick={() => handleRoleChange('CLIENT')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                user?.role === 'CLIENT'
                  ? 'border-amber-500 bg-amber-500/10 cursor-default'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <p className="text-white font-semibold text-sm flex items-center gap-2">
                Gratuita
                {user?.role === 'CLIENT' && <span className="text-amber-400 text-xs">✓ Activa</span>}
              </p>
              <p className="text-gray-400 text-xs mt-1">Guarda y edita mazos</p>
            </button>

            <button
              type="button"
              disabled={updatingRole || user?.role === 'PREMIUM'}
              onClick={() => handleRoleChange('PREMIUM')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                user?.role === 'PREMIUM'
                  ? 'border-amber-500 bg-amber-500/10 cursor-default'
                  : 'border-gray-600 bg-gray-800 hover:border-gray-500'
              }`}
            >
              <p className="text-white font-semibold text-sm flex items-center gap-2">
                Premium
                <span className="bg-amber-500 text-gray-900 text-xs font-bold px-1.5 py-0.5 rounded">PRO</span>
                {user?.role === 'PREMIUM' && <span className="text-amber-400 text-xs">✓ Activa</span>}
              </p>
              <p className="text-gray-400 text-xs mt-1">Mazos + estadísticas</p>
            </button>
          </div>
        </div>

        <div className="bg-gray-900 border border-red-900 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">Zona de peligro</h2>
          <p className="text-gray-400 text-sm mb-4">
            Eliminar tu cuenta borrará permanentemente todos tus mazos y datos. Esta acción no se puede deshacer.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-900 hover:bg-red-800 text-red-200 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              Eliminar mi cuenta
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">
                Escribe <strong className="text-red-400">ELIMINAR</strong> para confirmar:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full bg-gray-800 border border-red-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ELIMINAR"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'ELIMINAR' || deleting}
                  className="bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
                >
                  {deleting ? 'Eliminando...' : 'Confirmar eliminación'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center">
          <Link href="/decks" className="text-amber-400 hover:text-amber-300 text-sm">
            ← Mis mazos
          </Link>
          <Link href="/privacy" className="text-gray-500 hover:text-gray-400 text-sm">
            Política de privacidad
          </Link>
        </div>
      </main>
    </div>
  );
}
