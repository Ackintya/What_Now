"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { User, Mail, Calendar, Loader2 } from "lucide-react";

interface UserProfile {
  userId: string;
  email: string;
  name: string;
  createdAt?: string;
}

interface ExtendedProfile {
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  lifestyle?: string;
}

const LIFESTYLE_OPTIONS = [
  "Sedentary",
  "Lightly Active",
  "Moderately Active",
  "Very Active",
  "Extremely Active",
];

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [extendedProfile, setExtendedProfile] = useState<ExtendedProfile>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const [authRes, profileRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/profile"),
      ]);

      if (authRes.ok) {
        const data = await authRes.json();
        setUser(data.user);
        setName(data.user.name);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setExtendedProfile(profileData.profile || {});
        }
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setMessage("Name cannot be empty");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      // Save name to users collection
      const nameRes = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!nameRes.ok) {
        const data = await nameRes.json();
        setMessage(data.error || "Failed to update profile");
        setSaving(false);
        return;
      }

      const nameData = await nameRes.json();
      setUser(nameData.user);

      // Save extended profile to userProfiles collection
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extendedProfile),
      });

      if (!profileRes.ok) {
        const data = await profileRes.json();
        setMessage(data.error || "Failed to update extended profile");
        setSaving(false);
        return;
      }

      setIsEditing(false);
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-doom-bg">
        <Loader2 className="w-10 h-10 animate-spin text-doom-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation user={user} />
      <main className="min-h-screen bg-doom-bg" style={{ paddingTop: "4rem" }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-doom-surface border border-doom-primary/20 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-doom-primary to-doom-accent rounded-full flex-shrink-0">
                  <User className="w-8 h-8 text-doom-bg" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-doom-text">Your Profile</h1>
                  <p className="text-sm sm:text-base text-doom-muted">Manage your account information</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-doom-bg/30 border border-doom-primary/10 rounded-lg w-full sm:w-auto">
                <Mail className="w-5 h-5 text-doom-primary flex-shrink-0" />
                <span className="text-doom-text text-sm sm:text-base truncate">{user.email}</span>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`mb-6 p-4 rounded-lg border ${
                message.includes("success")
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                {message}
              </div>
            )}

            {/* Profile Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-doom-muted mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder:text-doom-muted focus:outline-none focus:border-doom-primary transition-colors"
                    placeholder="Enter your name"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-doom-bg/50 border border-doom-primary/10 rounded-lg">
                    <User className="w-5 h-5 text-doom-primary" />
                    <span className="text-doom-text">{user.name}</span>
                  </div>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-doom-muted mb-2">
                  Date of Birth (Optional)
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={extendedProfile.dateOfBirth || ""}
                    onChange={(e) => setExtendedProfile({ ...extendedProfile, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder:text-doom-muted focus:outline-none focus:border-doom-primary transition-colors"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 bg-doom-bg/50 border border-doom-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-doom-primary" />
                    <span className="text-doom-text">
                      {extendedProfile.dateOfBirth
                        ? new Date(extendedProfile.dateOfBirth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        : "Not set"}
                    </span>
                  </div>
                )}
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-doom-muted mb-2">
                  Height (Optional)
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={extendedProfile.height || ""}
                      onChange={(e) => setExtendedProfile({ ...extendedProfile, height: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder:text-doom-muted focus:outline-none focus:border-doom-primary transition-colors"
                      placeholder="Enter height"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-doom-muted text-sm">cm</span>
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-doom-bg/50 border border-doom-primary/10 rounded-lg">
                    <span className="text-doom-text">
                      {extendedProfile.height ? `${extendedProfile.height} cm` : "Not set"}
                    </span>
                  </div>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-doom-muted mb-2">
                  Weight (Optional)
                </label>
                {isEditing ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={extendedProfile.weight || ""}
                      onChange={(e) => setExtendedProfile({ ...extendedProfile, weight: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text placeholder:text-doom-muted focus:outline-none focus:border-doom-primary transition-colors"
                      placeholder="Enter weight"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-doom-muted text-sm">kg</span>
                  </div>
                ) : (
                  <div className="px-4 py-3 bg-doom-bg/50 border border-doom-primary/10 rounded-lg">
                    <span className="text-doom-text">
                      {extendedProfile.weight ? `${extendedProfile.weight} kg` : "Not set"}
                    </span>
                  </div>
                )}
              </div>

              {/* Lifestyle */}
              <div>
                <label className="block text-sm font-medium text-doom-muted mb-2">
                  Lifestyle (Optional)
                </label>
                {isEditing ? (
                  <select
                    value={extendedProfile.lifestyle || ""}
                    onChange={(e) => setExtendedProfile({ ...extendedProfile, lifestyle: e.target.value })}
                    className="w-full px-4 py-3 bg-doom-bg border border-doom-primary/20 rounded-lg text-doom-text focus:outline-none focus:border-doom-primary transition-colors"
                  >
                    <option value="">Select lifestyle</option>
                    {LIFESTYLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="px-4 py-3 bg-doom-bg/50 border border-doom-primary/10 rounded-lg">
                    <span className="text-doom-text">
                      {extendedProfile.lifestyle || "Not set"}
                    </span>
                  </div>
                )}
              </div>

              {/* Created At */}
              {user.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-doom-muted mb-2">
                    Member Since
                  </label>
                  <div className="flex items-center gap-3 px-4 py-3 bg-doom-bg/50 border border-doom-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-doom-primary" />
                    <span className="text-doom-text">
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* User ID - Full Width */}
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-doom-muted mb-2">
                  User ID
                </label>
                <div className="px-4 py-3 bg-doom-bg/50 border border-doom-primary/10 rounded-lg">
                  <code className="text-xs text-doom-muted font-mono">{user.userId}</code>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setName(user.name);
                      fetchProfile(); // Reset extended profile to original values
                      setMessage("");
                    }}
                    className="flex-1 px-6 py-3 bg-doom-bg border border-doom-primary/20 text-doom-text font-semibold rounded-lg hover:bg-doom-bg/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:bg-doom-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving && <Loader2 className="w-5 h-5 animate-spin" />}
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-6 py-3 bg-doom-primary text-doom-bg font-semibold rounded-lg hover:bg-doom-accent transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
