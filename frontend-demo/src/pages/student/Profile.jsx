
import { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  GraduationCap,
  BookOpen,
  Calendar,
  MapPin,
  Edit3,
  Save,
  X,
} from "lucide-react";

import Sidebar from "../../components/Sidebar";
import "./Profile.css";

const USER_STORAGE = "quizcloud_current_user";
const STUDENTS_STORAGE = "quizcloud_students";

function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem(USER_STORAGE) || "null"
    );
  } catch {
    return null;
  }
}

function getProfileData() {
  const user = getCurrentUser();

  if (!user) {
    return {
      name: "",
      email: "",
      department: "",
      year: "",
      studentId: "",
      college: "",
      location: "India",
    };
  }

  let registeredStudent = {};

  try {
    const students = JSON.parse(
      localStorage.getItem(STUDENTS_STORAGE) || "[]"
    );

    registeredStudent = Array.isArray(students)
      ? students.find(
          (student) =>
            student.email?.toLowerCase() ===
            user.email?.toLowerCase()
        ) || {}
      : {};
  } catch {
    registeredStudent = {};
  }

  return {
    name: user.name || registeredStudent.name || "",
    email: user.email || registeredStudent.email || "",
    department:
      user.department || registeredStudent.department || "",
    year: registeredStudent.year || "Not specified",
    studentId: user.id || registeredStudent.id || "Not assigned",
    college: registeredStudent.college || "Not specified",
    location: registeredStudent.location || "India",
  };
}

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState(getProfileData);
  const [originalProfile, setOriginalProfile] = useState(getProfileData);

  useEffect(() => {
    const refreshProfile = () => {
      const updated = getProfileData();
      setProfile(updated);
      setOriginalProfile(updated);
    };

    window.addEventListener("focus", refreshProfile);
    window.addEventListener("storage", refreshProfile);

    return () => {
      window.removeEventListener("focus", refreshProfile);
      window.removeEventListener("storage", refreshProfile);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      alert("Name and email cannot be empty.");
      return;
    }

    const user = getCurrentUser();

    if (!user) {
      alert("Please log in first.");
      return;
    }

    const updatedProfile = {
      ...profile,
      name: profile.name.trim(),
      email: profile.email.trim(),
    };

    try {
      // Update current logged-in user.
      const updatedUser = {
        ...user,
        name: updatedProfile.name,
        email: updatedProfile.email,
        department: updatedProfile.department,
      };

      localStorage.setItem(
        USER_STORAGE,
        JSON.stringify(updatedUser)
      );

      // Update registered student record.
      const students = JSON.parse(
        localStorage.getItem(STUDENTS_STORAGE) || "[]"
      );

      if (Array.isArray(students)) {
        const updatedStudents = students.map((student) => {
          if (
            student.email?.toLowerCase() ===
              user.email?.toLowerCase() ||
            String(student.id) === String(user.id)
          ) {
            return {
              ...student,
              name: updatedProfile.name,
              email: updatedProfile.email,
              department: updatedProfile.department,
              year: updatedProfile.year,
              college: updatedProfile.college,
              location: updatedProfile.location,
            };
          }

          return student;
        });

        localStorage.setItem(
          STUDENTS_STORAGE,
          JSON.stringify(updatedStudents)
        );
      }

      setProfile(updatedProfile);
      setOriginalProfile(updatedProfile);
      setEditing(false);

      alert("Profile updated successfully!");
    } catch {
      alert("Unable to save profile. Please try again.");
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setEditing(false);
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
              >
                <Save size={17} />
                Save Changes
              </button>
            </div>
          )}
        </div>

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
          Profile information is saved in your browser's localStorage.
          Secure backend account integration is pending.
        </p>
      </main>
    </div>
  );
}
