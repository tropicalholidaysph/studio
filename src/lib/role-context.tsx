"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "employee";

interface RoleContextType {
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  isAdmin: boolean;
  isEmployee: boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => { },
  isAdmin: false,
  isEmployee: false,
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem("userRole") as UserRole | null;
    if (savedRole === "admin" || savedRole === "employee") {
      setRoleState(savedRole);
    }
  }, []);

  const setRole = (newRole: UserRole | null) => {
    setRoleState(newRole);
    if (newRole) {
      localStorage.setItem("userRole", newRole);
    } else {
      localStorage.removeItem("userRole");
    }
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        isAdmin: role === "admin",
        isEmployee: role === "employee",
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
