import { useState, useEffect } from 'react';
import { Operator } from '../types';

export type Role = 'admin' | 'operator' | 'operation-officer' | 'ticket-sales' | 'sales-officer' | 'maintenance' | 'cx' | null;

export const useAuth = () => {
  const [role, setRole] = useState<Role>(() => {
    return (localStorage.getItem('tfw_role') as Role) || null;
  });

  const [currentUser, setCurrentUser] = useState<Operator | null>(() => {
    const stored = localStorage.getItem('tfw_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (newRole: Role, payload?: string | Operator): boolean => {
    setRole(newRole);
    localStorage.setItem('tfw_role', newRole || '');

    let user: Operator;
    if (typeof payload === 'object' && payload !== null) {
      user = payload;
    } else {
      user = { id: 0, name: (typeof payload === 'string' ? payload : undefined) || newRole || 'User' };
    }
    
    setCurrentUser(user);
    localStorage.setItem('tfw_user', JSON.stringify(user));
    return true;
  };

  const logout = () => {
    setRole(null);
    setCurrentUser(null);
    localStorage.removeItem('tfw_role');
    localStorage.removeItem('tfw_user');
    // Removed window.location.reload() to rely on React state update for a smoother transition
  };

  return { role, currentUser, login, logout };
};