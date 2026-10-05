import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileService } from '../services/services';
import { RoleBadge } from '../components/RoleBadge';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Camera,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react';

export const Profile = () => {
  const { user, updateUser } = useAuth();

  // Personal Info State
  const [name, setName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url || '');
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Handle Photo Picker
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    // Check size < 2MB
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Image size exceeds 2MB limit. Please choose a smaller photo.');
      return;
    }

    setAvatarError('');
    setAvatarSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result;
      setAvatarPreview(base64Url);
    };
    reader.readAsDataURL(file);
  };

  // Save Photo
  const handleSavePhoto = async () => {
    setIsSavingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');

    try {
      const updated = await profileService.updateProfile({ avatar_url: avatarPreview });
      updateUser({ avatar_url: updated.avatar_url });
      setAvatarSuccess('Profile photo updated successfully!');
      setTimeout(() => setAvatarSuccess(''), 3500);
    } catch (err) {
      setAvatarError(err.response?.data?.detail || 'Failed to update profile photo.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    setIsSavingAvatar(true);
    setAvatarError('');
    setAvatarSuccess('');

    try {
      const updated = await profileService.updateProfile({ avatar_url: '' });
      setAvatarPreview('');
      updateUser({ avatar_url: null });
      setAvatarSuccess('Profile photo removed.');
      setTimeout(() => setAvatarSuccess(''), 3500);
    } catch (err) {
      setAvatarError(err.response?.data?.detail || 'Failed to remove photo.');
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // Save Name
  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError('Name cannot be empty.');
      return;
    }

    setIsSavingName(true);
    setNameError('');
    setNameSuccess('');

    try {
      const updated = await profileService.updateProfile({ name: name.trim() });
      updateUser({ name: updated.name });
      setNameSuccess('Personal details updated successfully!');
      setTimeout(() => setNameSuccess(''), 3500);
    } catch (err) {
      setNameError(err.response?.data?.detail || 'Failed to update personal details.');
    } finally {
      setIsSavingName(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsSavingPassword(true);

    try {
      await profileService.updateProfile({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess('Password changed successfully! Keep it safe.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(
        err.response?.data?.detail || 'Failed to update password. Please check your current password.'
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Account Profile</h1>
        <p className="text-sm text-slate-400 mt-1">
          View and manage your personal account settings, profile photo, and security credentials.
        </p>
      </div>

      {/* Profile Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* Avatar with image or initials */}
          <div className="relative group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-xl shadow-blue-500/20 overflow-hidden ring-4 ring-slate-800">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <label
              htmlFor="avatar-file-input"
              className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg cursor-pointer transition-all hover:scale-105 ring-2 ring-slate-900"
              title="Change Photo"
            >
              <Camera className="w-4 h-4" />
            </label>
            <input
              id="avatar-file-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
          </div>

          {/* User Details */}
          <div className="text-center sm:text-left flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <h2 className="text-xl font-bold text-white">{user?.name}</h2>
              <RoleBadge role={user?.role} />
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit mx-auto sm:mx-0">
                Active Account
              </span>
            </div>
            <p className="text-sm text-slate-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{user?.email}</span>
            </p>
            <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5 pt-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Account ID: #{user?.id || '—'} • Role-Based Laboratory Access Active
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Photo Uploader Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <Camera className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white text-base">Profile Photo</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Upload a profile photo to personalize your account across lab bookings, reports, and complaints. Max file size: 2MB.
          </p>

          {avatarSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{avatarSuccess}</span>
            </div>
          )}

          {avatarError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{avatarError}</span>
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <label
              htmlFor="avatar-file-upload-btn"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 text-white rounded-xl text-xs font-semibold border border-slate-700 cursor-pointer transition-all"
            >
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Choose Photo</span>
            </label>
            <input
              id="avatar-file-upload-btn"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            {avatarPreview && avatarPreview !== user?.avatar_url && (
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isSavingAvatar}
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingAvatar ? 'Saving...' : 'Save Photo'}</span>
              </button>
            )}

            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={isSavingAvatar}
                className="p-2.5 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 border border-slate-700 hover:border-red-500/30 rounded-xl text-xs transition-all"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Personal Details Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-white text-base">Personal Information</h3>
          </div>

          {nameSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{nameSuccess}</span>
            </div>
          )}

          {nameError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{nameError}</span>
            </div>
          )}

          <form onSubmit={handleSaveName} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address (Read-Only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl text-slate-500 text-sm cursor-not-allowed"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingName || name === user?.name}
                className="flex items-center gap-2 py-2.5 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingName ? 'Saving...' : 'Save Name'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
          <KeyRound className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-semibold text-white text-base">Security & Password</h3>
            <p className="text-xs text-slate-400">Change your password to keep your account secure.</p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 pt-1 max-w-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingPassword}
              className="flex items-center justify-center gap-2 py-2.5 px-6 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-500/20 transition-all"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isSavingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
