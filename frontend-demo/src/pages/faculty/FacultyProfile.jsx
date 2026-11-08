
import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  Building2,
  Save,
  X,
} from "lucide-react";
import "./FacultyProfile.css";

const USER_KEY = "quizcloud_current_user";
const FACULTY_KEY = "quizcloud_faculty";

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  department: "",
};

export default function FacultyProfile() {
  const [profile, setProfile] = useState(emptyProfile);
  const [originalProfile, setOriginalProfile] = useState(emptyProfile);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
      );

      if (!currentUser || currentUser.role !== "faculty") {
        setError("Faculty account not found. Please log in again.");
        return;
      }

      const loadedProfile = {
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        department: currentUser.department || "",
      };

      setProfile(loadedProfile);
      setOriginalProfile(loadedProfile);
    } catch (error) {
      console.error("Unable to load faculty profile:", error);
      setError("Unable to load profile information.");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  const handleSave = () => {
    const name = profile.name.trim();
    const email = profile.email.trim().toLowerCase();
    const phone = profile.phone.trim();
    const department = profile.department.trim();

    if (!name || !email) {
      setError("Name and email address are required.");
      return;
    }

    if (name.length < 3) {
      setError("Name must contain at least 3 characters.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
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
      const currentUser = JSON.parse(
        localStorage.getItem(USER_KEY) || "null"
      );

      if (!currentUser || currentUser.role !== "faculty") {
        setError("Please log in again with your faculty account.");
        return;
      }

      const facultyList = JSON.parse(
        localStorage.getItem(FACULTY_KEY) || "[]"
      );

      if (!Array.isArray(facultyList)) {
        setError("Faculty records are invalid.");
        return;
      }

      const emailExists = facultyList.some(
        (faculty) =>
          faculty.email?.toLowerCase() === email &&
          faculty.email?.toLowerCase() !==
            currentUser.email?.toLowerCase()
      );

      if (emailExists) {
        setError("This email is already used by another faculty account.");
        return;
      }

      const updatedProfile = {
        name,
        email,
        phone,
        department,
      };

      const updatedUser = {
        ...currentUser,
        ...updatedProfile,
      };

      const updatedFaculty = facultyList.map((faculty) =>
        faculty.email?.toLowerCase() ===
        currentUser.email?.toLowerCase()
          ? { ...faculty, ...updatedProfile }
          : faculty
      );

      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      localStorage.setItem(
        FACULTY_KEY,
        JSON.stringify(updatedFaculty)
      );

      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setEditing(false);
      setError("");

      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Profile save error:", error);
      setError("Unable to save profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setError("");
    setEditing(false);
  };

  return (
    <div className="faculty-profile-page">
      <div className="faculty-profile-header">
        <div>
          <h1>My Profile</h1>
          <p>Manage your faculty account information.</p>
        </div>

        {!editing && (
          <button
            className="faculty-edit-btn"
            onClick={() => {
              setError("");
              setEditing(true);
            }}
          >
            Edit Profile
          </button>
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
                disabled={!editing}
                placeholder="Enter your email"
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
            >
              <X size={17} />
              Cancel
            </button>

            <button
              className="faculty-save-btn"
              onClick={handleSave}
            >
              <Save size={17} />
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
