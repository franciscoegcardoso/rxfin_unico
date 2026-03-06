import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar, getSidebarCollapsed, setSidebarCollapsed } from "./Sidebar";

interface DesktopShellProps {
  userName: string;
  userEmail: string;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({
  userName,
  userEmail,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(getSidebarCollapsed());
  }, []);

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        userName={userName}
        userEmail={userEmail}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
