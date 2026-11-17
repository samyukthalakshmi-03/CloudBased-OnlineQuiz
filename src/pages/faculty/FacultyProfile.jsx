import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  Building2,
  Save,
  X,
  KeyRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import {
  updateUserProfile,
  requestPasswordReset,
} from "../../services/authService";
import LoadingSpinner from "../../components/LoadingSpinner";

import "./FacultyProfile.css";

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  department: "",
};

export default function FacultyProfile() {
  const { userProfile, refreshProfile, loading } = useAuth();

  const [profile, setProfile] = useState(emptyProfile);
  const [originalProfile, setOriginalProfile] = useState(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!userProfile) {
      setError(
        "We couldn't load your profile. Please refresh the page or log in again."
      );
      return;
    }

    const loadedProfile = {
      name: userProfile.name || "",
      email: userProfile.email || "",
      phone: userProfile.phone || "",
      department: userProfile.department || "",
    };

    setProfile(loadedProfile);
    setOriginalProfile(loadedProfile);
  }, [userProfile, loading]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
    const name = profile.name.trim();
    const phone = profile.phone.trim();
    const department = profile.department.trim();

    if (!name) {
      setError("Name is required.");
      return;
    }

    if (name.length < 3) {
      setError("Name must contain at least 3 characters.");
      return;
    }

    if (phone) {
      const digits = phone.replace(/\D/g, "");

      if (digits.length < 10 || digits.length > 15) {
        setError("Please enter a valid phone number.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Email and role are never editable and are never sent.
      await updateUserProfile({ name, phone, department });

      const refreshed = await refreshProfile();

      const loadedProfile = {
        name: refreshed?.name || name,
        email: refreshed?.email || profile.email,
        phone: refreshed?.phone || phone,
        department: refreshed?.department || department,
      };

      setProfile(loadedProfile);
      setOriginalProfile(loadedProfile);
      setEditing(false);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("Profile save error:", err);
      setError(
        err.message || "Unable to save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setError("");
    setSuccess("");
    setEditing(false);
  };

  const handlePasswordReset = async () => {
    if (!profile.email) {
      setError("No email address is available for this account.");
      return;
    }

    const confirmed = window.confirm(
      `Send a password reset link to ${profile.email}?`
    );

    if (!confirmed) return;

    try {
      setResetLoading(true);
      setError("");
      setSuccess("");

      await requestPasswordReset(profile.email);

      setSuccess(
        `A password reset link has been sent to ${profile.email}. Please check your inbox.`
      );
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        err.message ||
          "Unable to send a password reset email. Please try again."
      );
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your profile..." />;
  }

  return (
    <div className="faculty-profile-page">
      <div className="faculty-profile-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your faculty account information.</p>
        </div>

        {!editing && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              className="faculty-cancel-btn"
              onClick={handlePasswordReset}
              disabled={resetLoading}
            >
              <KeyRound size={17} />
              {resetLoading ? "Sending..." : "Change Password"}
            </button>

            <button
              className="faculty-edit-btn"
              onClick={() => {
                setError("");
                setSuccess("");
                setEditing(true);
              }}
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div className="faculty-profile-card">
        <div className="faculty-profile-top">
          <div className="faculty-profile-avatar">
            {profile.name?.charAt(0).toUpperCase() || "F"}
          </div>

          <div>
            <h2>{profile.name || "Faculty Member"}</h2>
            <p>Faculty Account</p>
          </div>
        </div>

        <div className="faculty-profile-form">
          <div className="faculty-profile-field">
            <label>Full Name</label>
            <div className="faculty-profile-input">
              <UserRound size={18} />
              <input
                name="name"
                value={profile.name}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div className="faculty-profile-field">
            <label>Email Address</label>
            <div className="faculty-profile-input">
              <Mail size={18} />
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                disabled
                placeholder="Email address"
              />
            </div>
          </div>

          <div className="faculty-profile-field">
            <label>Phone Number</label>
            <div className="faculty-profile-input">
              <Phone size={18} />
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter your phone number"
              />
            </div>
          </div>

          <div className="faculty-profile-field">
            <label>Department</label>
            <div className="faculty-profile-input">
              <Building2 size={18} />
              <input
                name="department"
                value={profile.department}
                onChange={handleChange}
                disabled={!editing}
                placeholder="Enter your department"
              />
            </div>
          </div>
        </div>

        {success && (
          <p
            role="status"
            style={{
              color: "#15803d",
              fontSize: "13px",
              marginTop: "15px",
            }}
          >
            {success}
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              color: "#dc2626",
              fontSize: "13px",
              marginTop: "15px",
            }}
          >
            {error}
          </p>
        )}

        {editing && (
          <div className="faculty-profile-actions">
            <button
              className="faculty-cancel-btn"
              onClick={handleCancel}
              disabled={saving}
            >
              <X size={17} />
              Cancel
            </button>

            <button
              className="faculty-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
