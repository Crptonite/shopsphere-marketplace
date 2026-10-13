'use client';

import { useState } from 'react';

interface Props {
  userId: string;
  initialDisplayName: string;
}

export default function AccountSettings({ userId, initialDisplayName }: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [nameStatus, setNameStatus] = useState<string | null>(null);
  const [pwdStatus, setPwdStatus] = useState<string | null>(null);
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingName(true);
    setNameStatus(null);

    const res = await fetch('/api/user/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, displayName }),
    });

    const data = await res.json();
    setLoadingName(false);

    if (res.ok) {
      setNameStatus('Display name updated successfully!');
    } else {
      setNameStatus(data.error || 'Failed to update name.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdStatus(null);

    if (newPassword !== confirmPassword) {
      setPwdStatus('New passwords do not match.');
      return;
    }

    setLoadingPwd(true);

    const res = await fetch('/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, currentPassword, newPassword }),
    });

    const data = await res.json();
    setLoadingPwd(false);

    if (res.ok) {
      setPwdStatus('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwdStatus(data.error || 'Failed to update password.');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
      <h1 className="text-xl font-semibold text-neutral-900">Account Settings</h1>

      {/* Change Name Section */}
      <form onSubmit={handleUpdateName} className="space-y-4">
        <h2 className="text-base font-medium text-neutral-800">Change Display Name</h2>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg text-sm border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {nameStatus && (
          <p className="text-xs text-neutral-700">{nameStatus}</p>
        )}

        <button
          type="submit"
          disabled={loadingName}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {loadingName ? 'Saving...' : 'Save Name'}
        </button>
      </form>

      <hr className="border-neutral-200" />

      {/* Change Password Section */}
      <form onSubmit={handleChangePassword} className="space-y-4">
        <h2 className="text-base font-medium text-neutral-800">Change Password</h2>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg text-sm border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg text-sm border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded-lg text-sm border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>

        {pwdStatus && (
          <p className="text-xs text-neutral-700">{pwdStatus}</p>
        )}

        <button
          type="submit"
          disabled={loadingPwd}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {loadingPwd ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}