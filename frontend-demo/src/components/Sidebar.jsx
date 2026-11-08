
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Trophy,
  UserRound,
  LogOut,
  GraduationCap,
} from "lucide-react";

import "./Sidebar.css";

const USER_KEY = "quizcloud_current_user";

const menuItems = [
  {
    name: "Dashboard",
    path: "/student",
    icon: LayoutDashboard,
  },
  {
    name: "Available Quizzes",
    path: "/student/quizzes",
    icon: BookOpen,
  },
  {
    name: "My Results",
    path: "/student/results",
    icon: ClipboardList,
  },
  {
    name: "Leaderboard",
    path: "/student/leaderboard",
    icon: Trophy,
  },
  {
    name: "My Profile",
    path: "/student/profile",
    icon: UserRound,
  },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmLogout) return;

    try {
      localStorage.removeItem(USER_KEY);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
      alert("Unable to logout. Please try again.");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">
          <GraduationCap size={25} />
        </div>

        <div>
          <h2>QuizCloud</h2>
          <span>Learning Platform</span>
        </div>
      </div>

      <div className="sidebar-section-label">
        MENU
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/student"}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>

        <div className="sidebar-version">
          QuizCloud v1.0
        </div>
      </div>
    </aside>
  );
}
