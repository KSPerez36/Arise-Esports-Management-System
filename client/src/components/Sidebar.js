import React, { useContext, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faUsers,
  faUserTie,
  faCalendarDays,
  faWallet,
  faRightFromBracket,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { AuthContext } from "../context/AuthContext";
import "./Sidebar.css";
import { useNavigate } from "react-router-dom"; // ← ADD THIS

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate(); // ← ADD THIS
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    // ← ADD THIS FUNCTION
    logout();
    navigate("/"); // Redirect to landing page
  };

  const menuItems = [
    {
      path: "/dashboard",
      icon: faChartLine,
      label: "Dashboard",
      roles: ["Admin", "President", "Treasurer", "Secretary", "Auditor"],
    },
    {
      path: "/members",
      icon: faUsers,
      label: "Members",
      roles: ["Admin", "President", "Treasurer", "Secretary", "Auditor"],
    },
    {
      path: "/officers",
      icon: faUserTie,
      label: "Officers",
      roles: ["Admin"], // Only Admin can see this
    },
    {
      path: "/events",
      icon: faCalendarDays,
      label: "Events",
      roles: ["Admin", "President"],
    },
    {
      path: "/finances",
      icon: faWallet,
      label: "Finances",
      roles: ["Admin", "Treasurer", "Auditor"],
    },
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Filter menu items based on user role
  const visibleMenuItems = menuItems.filter((item) =>
    item.roles.includes(user?.role),
  );

  return (
    <div className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-header">
        <img
          src="/images/arise-logo.png"
          alt="Arise Esports"
          className="sidebar-logo"
        />
        {!isCollapsed && <h2>Arise Esports</h2>}
      </div>

      <button
        className="sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        <FontAwesomeIcon icon={isCollapsed ? faChevronRight : faChevronLeft} />
      </button>

      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-item ${isActive(item.path) ? "active" : ""}`}
            title={item.label}
          >
            <span className="sidebar-icon">
              <FontAwesomeIcon icon={item.icon} />
            </span>
            {!isCollapsed && (
              <span className="sidebar-label">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && (
          <>
            <div className="sidebar-user">
              <div className="user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="user-info">
                  <div className="user-name">{user.name}</div>
                  <div className="user-role">{user.role}</div>
                </div>
              )}
            </div>
            <button
              className="sidebar-logout"
              onClick={handleLogout}
              title="Logout"
            >
              <span className="sidebar-icon">
                <FontAwesomeIcon icon={faRightFromBracket} />
              </span>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
