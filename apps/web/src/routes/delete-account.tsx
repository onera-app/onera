import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon, ArrowLeft01Icon, Loading02Icon } from "@hugeicons/core-free-icons";
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { OneraLogo } from '@/components/ui/onera-logo';
import { Footer } from '@/components/landing';
import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function DeleteAccountPage() {
  const { user, isAuthenticated } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const deleteAccount = trpc.users.deleteAccount.useMutation();

  const handleDelete = async () => {
    if (confirmText !== 'DELETE MY ACCOUNT') return;

    setIsDeleting(true);
    try {
      await deleteAccount.mutateAsync({ confirmPhrase: 'DELETE MY ACCOUNT' });
      await supabase.auth.signOut();
      setIsDeleted(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete account. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleted) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Account Deleted
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Your account and all associated data have been permanently deleted.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
            Back to Home
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-900">
        <Header />
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Sign In Required
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            You must be signed in to delete your account.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-gray-100 px-4 py-2 text-sm font-medium text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900">
      <Header />

      <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-6 mb-8">
          <div className="flex items-start gap-3">
            <HugeiconsIcon icon={Alert01Icon} className="size-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">
                Delete Account
              </h1>
              <p className="text-sm text-red-700 dark:text-red-300">
                This action is <strong>permanent and cannot be undone</strong>. All of the following
                will be permanently deleted:
              </p>
            </div>
          </div>
        </div>

        <ul className="space-y-3 mb-8 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500" />
            All conversations and chat history
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500" />
            All notes
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500" />
            All saved prompts
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500" />
            All API connections and encrypted credentials
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500" />
            Your encryption keys and registered devices
          </li>
          <li className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-red-500" />
            Your Onera account ({user?.email})
          </li>
        </ul>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Type <strong>DELETE MY ACCOUNT</strong> to confirm
            </label>
            <input
              id="confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={isDeleting}
              autoComplete="off"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE MY ACCOUNT' || isDeleting}
            className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <HugeiconsIcon icon={Loading02Icon} className="size-4 animate-spin" />
                Deleting account...
              </>
            ) : (
              'Permanently Delete My Account'
            )}
          </button>

          <Link
            to="/app"
            className="block w-full text-center rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-gray-100 dark:border-gray-850">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-8 rounded-xl overflow-hidden transition-transform duration-200 group-hover:scale-105">
            <OneraLogo size={32} />
          </div>
          <span className="font-bold text-xl text-gray-900 dark:text-gray-100">Onera</span>
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          Back to Home
        </Link>
      </div>
    </header>
  );
}
