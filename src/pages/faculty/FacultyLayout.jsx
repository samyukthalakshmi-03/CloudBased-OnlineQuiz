import {
  LayoutDashboard,
  BookOpen,
  Users,
  PlusCircle,
  LogOut,
  GraduationCap,
  TrendingUp,
  UserRound
} from 'lucide-react';

import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './FacultyDashboard.css';

export default function FacultyLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
      alert('Unable to logout. Please try again.');
    }
  };

  return (
    <div className="faculty-layout">
      <aside className="faculty-sidebar">
        <div className="faculty-brand">
          <GraduationCap size={30} />
          <div>
            <h2>QuizCloud</h2>
            <span>Faculty Portal</span>
          </div>
        </div>

        <p className="faculty-menu-title">MAIN MENU</p>

        <nav className="faculty-nav">
          <NavLink
            to="/faculty"
            end
            className={({ isActive }) =>
              `faculty-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <LayoutDashboard size={19} />
            Dashboard
          </NavLink>

          <NavLink
            to="/faculty/quizzes"
            className={({ isActive }) =>
              `faculty-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <BookOpen size={19} />
            Manage Quizzes
          </NavLink>

          <NavLink
            to="/faculty/create-quiz"
            className={({ isActive }) =>
              `faculty-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <PlusCircle size={19} />
            Create Quiz
          </NavLink>

          <NavLink
            to="/faculty/students"
            className={({ isActive }) =>
              `faculty-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <Users size={19} />
            Students
          </NavLink>

          <NavLink
            to="/faculty/performance"
            className={({ isActive }) =>
              `faculty-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <TrendingUp size={19} />
            Performance
          </NavLink>

          <NavLink
            to="/faculty/profile"
            className={({ isActive }) =>
              `faculty-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <UserRound size={19} />
            My Profile
          </NavLink>
        </nav>

        <div className="faculty-sidebar-bottom">
          <button onClick={handleLogout}>
            <LogOut size={19} />
            Logout
          </button>

          <span>QuizCloud v1.0</span>
        </div>
      </aside>

      <main className="faculty-main">
        <Outlet />
      </main>
    </div>
  );
}
