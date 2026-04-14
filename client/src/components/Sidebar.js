import { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faUsers,
  faUserTie,
  faCalendarDays,
  faWallet,
  faFileAlt,
  faListCheck,
  faClockRotateLeft,
  faRightFromBracket,
  faChevronLeft,
  faChevronRight,
  faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../context/AuthContext";
import { FiscalYearContext } from "../context/FiscalYearContext";
import "./Sidebar.css";
import { useNavigate } from "react-router-dom";

const menuGroups = [
  {
    label: "Overview",
    items: [
      { path: "/dashboard", icon: faChartLine, label: "Dashboard", roles: ["Admin","President","Treasurer","Secretary","Auditor"] },
      { path: "/members",   icon: faUsers,     label: "Members",   roles: ["Admin","President","Treasurer","Secretary","Auditor"] },
    ],
  },
  {
    label: "Manage",
    items: [
      { path: "/officers",  icon: faUserTie,      label: "Officers",  roles: ["Admin","Secretary"] },
      { path: "/events",    icon: faCalendarDays, label: "Events",    roles: ["Admin","President"] },
      { path: "/finances",  icon: faWallet,       label: "Finances",  roles: ["Admin","Treasurer","Auditor"] },
      { path: "/reports",   icon: faFileAlt,      label: "Reports",   roles: ["Admin","Secretary"] },
      { path: "/tasks",     icon: faListCheck,    label: "Tasks",     roles: ["Admin","President","Treasurer","Secretary","Auditor"] },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/activity-logs", icon: faClockRotateLeft, label: "Activity Logs", roles: ["Admin"] },
    ],
  },
];

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const { academicYear, changeAcademicYear, yearOptions } = useContext(FiscalYearContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>

      {/* Header */}
      <div className="sidebar-header">
        <img src="/images/arise-logo.png" alt="Arise Esports" className="sidebar-logo" />
        <div className="sidebar-brand">
          <span className="sidebar-brand-name">Arise Esports</span>
          <span className="sidebar-brand-sub">Management System</span>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronLeft} />
      </button>

      {/* Nav */}
      <nav className="sidebar-nav">
        {menuGroups.map((group) => {
          const visible = group.items.filter(item => item.roles.includes(user?.role));
          if (!visible.length) return null;
          return (
            <div key={group.label}>
              <div className="sidebar-section-label">{group.label}</div>
              <div className="sidebar-section-divider" />
              {visible.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="sidebar-icon">
                    <FontAwesomeIcon icon={item.icon} />
                  </span>
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Academic Year */}
      <div className="sidebar-year">
        <div className="sidebar-year-label">Academic Year</div>
        {isCollapsed ? (
          <div className="sidebar-year-icon" title={academicYear}>
            <FontAwesomeIcon icon={faGraduationCap} />
          </div>
        ) : (
          <select
            className="sidebar-year-select"
            value={academicYear}
            onChange={e => changeAcademicYear(e.target.value)}
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {user && (
          <>
            <div className="sidebar-user">
              <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
            <button className="sidebar-logout" onClick={handleLogout} title="Logout">
              <span className="sidebar-icon">
                <FontAwesomeIcon icon={faRightFromBracket} />
              </span>
              <span>Sign out</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;