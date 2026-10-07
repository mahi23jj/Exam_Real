import React, { useEffect, useState } from 'react';
import { Check, Loader2, Pencil, X } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

interface ProfileEditorProps {
  compact?: boolean;
}

/**
 * Own-profile editor. Writes to `/users/me/profile`, which is the
 * authoritative record — Auth0 only authenticates, so edits persist.
 */
const ProfileEditor: React.FC<ProfileEditorProps> = ({ compact = false }) => {
  const { user, updateMyProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [picture, setPicture] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name ?? '');
    setDepartment(user.department ?? '');
    setPicture(user.picture ?? '');
  }, [user]);

  if (!user) return null;

  const needsCompletion = !user.is_profile_complete;
  const nameError = fullName.trim().length < 2 ? 'Enter at least 2 characters' : '';
  const departmentError = department.trim().length < 2 ? 'Enter your university department' : '';
  const hasErrors = Boolean(nameError || departmentError);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (hasErrors || saving) return;
    setSaving(true);
    setError('');
    try {
      await updateMyProfile({
        full_name: fullName.trim(),
        department: department.trim(),
        picture: picture.trim() || null,
      });
      setSaved(true);
      setIsEditing(false);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(user.full_name ?? '');
    setDepartment(user.department ?? '');
    setPicture(user.picture ?? '');
    setError('');
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className={compact ? '' : 'flex flex-col items-center gap-3'}>
        {!compact && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-[13px] font-semibold text-stone-600 shadow-sm transition-colors hover:border-teal-300 hover:text-teal-700"
          >
            <Pencil size={14} />
            Edit profile
          </button>
        )}

        {needsCompletion && (
          <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
            <p className="font-semibold">Complete your profile</p>
            <p className="mt-1 text-amber-800/90">
              Add your name and university department so classmates can find you in Community.
            </p>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-900 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Pencil size={12} />
              Add details
            </button>
          </div>
        )}

        {saved && (
          <p className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-700">
            <Check size={14} />
            Profile saved
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="w-full space-y-3 rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-bold text-stone-800">Edit profile</h3>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
          aria-label="Cancel editing"
        >
          <X size={16} />
        </button>
      </div>

      <div>
        <label htmlFor="profile-name" className="mb-1 block text-[12px] font-semibold text-stone-600">
          Display name
        </label>
        <input
          id="profile-name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-[14px] text-stone-800 outline-none transition-colors focus:border-teal-400 ${
            nameError ? 'border-red-300' : 'border-stone-200'
          }`}
          placeholder="Mahlet Solomon"
        />
        {nameError && <p className="mt-1 text-[12px] text-red-600">{nameError}</p>}
      </div>

      <div>
        <label htmlFor="profile-department" className="mb-1 block text-[12px] font-semibold text-stone-600">
          Department
        </label>
        <input
          id="profile-department"
          type="text"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          className={`w-full rounded-xl border px-3 py-2 text-[14px] text-stone-800 outline-none transition-colors focus:border-teal-400 ${
            departmentError ? 'border-red-300' : 'border-stone-200'
          }`}
          placeholder="Applied Physics"
        />
        {departmentError && <p className="mt-1 text-[12px] text-red-600">{departmentError}</p>}
      </div>

      <div>
        <label htmlFor="profile-picture" className="mb-1 block text-[12px] font-semibold text-stone-600">
          Profile picture URL
        </label>
        <input
          id="profile-picture"
          type="url"
          value={picture}
          onChange={(event) => setPicture(event.target.value)}
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-[14px] text-stone-800 outline-none transition-colors focus:border-teal-400"
          placeholder="https://…"
        />
        <p className="mt-1 text-[11px] text-stone-400">
          Leave empty to remove your picture. This replaces your account photo.
        </p>
      </div>

      {error && <p className="text-[12px] text-red-600">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={hasErrors || saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          Save changes
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-full px-4 py-2 text-[13px] font-semibold text-stone-500 transition-colors hover:bg-stone-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ProfileEditor;