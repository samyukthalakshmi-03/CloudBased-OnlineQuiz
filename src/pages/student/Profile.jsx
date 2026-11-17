
import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  GraduationCap,
  BookOpen,
  Calendar,
  MapPin,
  Phone,
  Edit3,
  Save,
  X,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../context/AuthContext";
import { updateUserProfile } from "../../services/authService";
import "./Profile.css";

function mapProfile(profile) {
  return {
    name: profile?.name || "",
    email: profile?.email || "",
    phone: profile?.phone || "",
    department: profile?.department || "",
    year: profile?.year || "",
    college: profile?.college || "",
    location: profile?.location || "",
    studentId: profile?.uid || "",
  };
}

export default function Profile() {
  const { userProfile, refreshProfile } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(() => mapProfile(userProfile));
  const [originalProfile, setOriginalProfile] = useState(() =>
    mapProfile(userProfile)
  );
  const [status, setStatus] = useState({ type: "", text: "" });

  useEffect(() => {
    const mapped = mapProfile(userProfile);
    setProfile(mapped);
    setOriginalProfile(mapped);
  }, [userProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (!profile.name.trim()) {
      setStatus({ type: "error", text: "Name cannot be empty." });
      return;
    }

    try {
      setSaving(true);
      setStatus({ type: "", text: "" });

      await updateUserProfile({
        name: profile.name,
        phone: profile.phone,
        department: profile.department,
        year: profile.year,
        college: profile.college,
        location: profile.location,
      });

      await refreshProfile();

      setEditing(false);
      setStatus({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch (error) {
      console.error("[Profile] Failed to update profile:", error);
      setStatus({
        type: "error",
        text:
          error.message ||
          "Unable to save profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setEditing(false);
    setStatus({ type: "", text: "" });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main profile-page">
        <div className="profile-header">
          <div>
            <h1>My Profile</h1>
            <p>Manage your personal and academic information.</p>
          </div>

          {!editing ? (
            <button
              className="edit-profile-btn"
              onClick={() => setEditing(true)}
            >
              <Edit3 size={17} />
              Edit Profile
            </button>
          ) : (
            <div className="profile-edit-actions">
              <button
                className="cancel-profile-btn"
                onClick={handleCancel}
              >
                <X size={17} />
                Cancel
              </button>

              <button
                className="save-profile-btn"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={17} />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {status.text && (
          <p
            className="profile-demo-note"
            role={status.type === "error" ? "alert" : "status"}
            style={{
              color:
                status.type === "error" ? "#d9534f" : "#219767",
            }}
          >
            {status.text}
          </p>
        )}

        <section className="profile-overview">
          <div className="profile-avatar">
            <UserRound size={45} />
          </div>

          <div className="profile-overview-info">
            <h2>{profile.name || "Student"}</h2>
            <p>{profile.department || "Department not specified"}</p>
            <span className="student-badge">Student Account</span>
          </div>
        </section>

        <section className="profile-details-card">
          <div className="profile-section-heading">
            <div>
              <h2>Personal Information</h2>
              <p>Your basic account details.</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <label>Full Name</label>
              <div className="profile-input-wrapper">
                <UserRound size={18} />
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>Email Address</label>
              <div className="profile-input-wrapper">
                <Mail size={18} />
                <input
                  name="email"
                  type="email"
                  value={profile.email}
                  disabled
                />
              </div>
            </div>

            <div className="profile-field">
              <label>Phone Number</label>
              <div className="profile-input-wrapper">
                <Phone size={18} />
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>Location</label>
              <div className="profile-input-wrapper">
                <MapPin size={18} />
                <input
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="profile-details-card">
          <div className="profile-section-heading">
            <div>
              <h2>Academic Information</h2>
              <p>Your education and student details.</p>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <label>Student ID</label>
              <div className="profile-input-wrapper">
                <BookOpen size={18} />
                <input value={profile.studentId} disabled />
              </div>
            </div>

            <div className="profile-field">
              <label>Department</label>
              <div className="profile-input-wrapper">
                <GraduationCap size={18} />
                <input
                  name="department"
                  value={profile.department}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>Academic Year</label>
              <div className="profile-input-wrapper">
                <Calendar size={18} />
                <input
                  name="year"
                  value={profile.year}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
            </div>

            <div className="profile-field">
              <label>College</label>
              <div className="profile-input-wrapper">
                <GraduationCap size={18} />
                <input
                  name="college"
                  value={profile.college}
                  onChange={handleChange}
                  disabled={!editing}
                />
              </div>
            </div>
          </div>
        </section>

        <p className="profile-demo-note">
          Your profile information is stored securely in your account.
        </p>
      </main>
    </div>
  );
}
