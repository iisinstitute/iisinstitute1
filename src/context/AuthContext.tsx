import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/index.ts';
import { INITIAL_USERS } from '../lib/demoData.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserProfile;
  isAuthenticated: boolean;
  activeRole: UserRole;
  loginWithPhone: (phone: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginAsDemoUser: (user: UserProfile) => void;
  switchRole: (role: UserRole, specificUserId?: string) => void;
  availableUsers: UserProfile[];
  firebaseUser: FirebaseUser | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  canManageStudents: boolean;
  canManageTeachers: boolean;
  canManageBatches: boolean;
  canManageFees: boolean;
  canMarkStudentAttendance: boolean;
  canViewTeacherAttendance: (teacherId?: string) => boolean;
  canManageExams: boolean;
  canEnterMarks: boolean;
  canViewReports: boolean;
  isParent: boolean;
  isTeacher: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAccountant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to normalize phone numbers (extract digits)
export const normalizePhone = (phoneStr: string): string => {
  const digits = phoneStr.replace(/\D/g, '');
  // If starts with 91 and has 12 digits, extract last 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  // If starts with 0 and has 11 digits, extract last 10 digits
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  return digits;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => {
    try {
      const savedUser = localStorage.getItem('iis_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return INITIAL_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const savedAuth = localStorage.getItem('iis_auth');
      // If user had logged in, keep logged in
      return savedAuth === 'true';
    } catch {}
    return true; // Keep true by default for immediate preview, but fully support logout & login
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        setIsAuthenticated(true);
        localStorage.setItem('iis_auth', 'true');
        const matched = INITIAL_USERS.find(u => u.email.toLowerCase() === user.email?.toLowerCase());
        if (matched) {
          setCurrentUser(matched);
          localStorage.setItem('iis_user', JSON.stringify(matched));
        } else {
          const newProfile: UserProfile = {
            id: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            role: 'Super Admin',
            avatarUrl: user.photoURL || undefined,
            createdAt: new Date().toISOString(),
          };
          setCurrentUser(newProfile);
          localStorage.setItem('iis_user', JSON.stringify(newProfile));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loginWithPhone = async (phoneInput: string, passwordInput: string): Promise<{ success: boolean; message?: string }> => {
    const cleanedInputPhone = normalizePhone(phoneInput);
    if (!cleanedInputPhone || cleanedInputPhone.length < 5) {
      return { success: false, message: 'Please enter a valid mobile number (e.g. 9820112345).' };
    }

    if (!passwordInput.trim()) {
      return { success: false, message: 'Please enter your account password.' };
    }

    // Look for match in registered institute users
    const matched = INITIAL_USERS.find(u => {
      const uPhone = normalizePhone(u.phone || '');
      return uPhone === cleanedInputPhone || uPhone.endsWith(cleanedInputPhone) || cleanedInputPhone.endsWith(uPhone);
    });

    if (matched) {
      // Validate password (supports user password, '123', 'admin123', 'teacher123', 'accounts123', 'parent123', '123456')
      const validPasswords = [
        matched.password,
        '123',
        '123456',
        'admin123',
        'teacher123',
        'accounts123',
        'parent123',
        'iis123',
      ].filter(Boolean);

      if (!validPasswords.includes(passwordInput.trim())) {
        return { success: false, message: 'Invalid password. (Default demo password is: 123)' };
      }

      setCurrentUser(matched);
      setIsAuthenticated(true);
      try {
        localStorage.setItem('iis_user', JSON.stringify(matched));
        localStorage.setItem('iis_auth', 'true');
      } catch {}
      return { success: true };
    }

    // Check if phone matches a generic faculty or student format
    if (cleanedInputPhone.length >= 10) {
      // Create user session for this mobile number
      const genericUser: UserProfile = {
        id: `user_phone_${cleanedInputPhone}`,
        name: `User (${cleanedInputPhone.slice(-4)})`,
        email: `${cleanedInputPhone}@iisinstitute.com`,
        phone: cleanedInputPhone,
        role: 'Teacher',
        createdAt: new Date().toISOString(),
      };
      setCurrentUser(genericUser);
      setIsAuthenticated(true);
      try {
        localStorage.setItem('iis_user', JSON.stringify(genericUser));
        localStorage.setItem('iis_auth', 'true');
      } catch {}
      return { success: true };
    }

    return {
      success: false,
      message: 'Mobile number not found. You can use any demo account (e.g. 9820112345 for Super Admin).',
    };
  };

  const loginAsDemoUser = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    try {
      localStorage.setItem('iis_user', JSON.stringify(user));
      localStorage.setItem('iis_auth', 'true');
    } catch {}
  };

  const switchRole = (role: UserRole, specificUserId?: string) => {
    if (specificUserId) {
      const user = INITIAL_USERS.find(u => u.id === specificUserId);
      if (user) {
        setCurrentUser(user);
        try {
          localStorage.setItem('iis_user', JSON.stringify(user));
        } catch {}
        return;
      }
    }
    const defaultForRole = INITIAL_USERS.find(u => u.role === role) || {
      id: `usr_${role.toLowerCase().replace(' ', '_')}`,
      email: `${role.toLowerCase().replace(' ', '_')}@iisinstitute.com`,
      name: `${role} User`,
      role,
      phone: '9820000000',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(defaultForRole);
    try {
      localStorage.setItem('iis_user', JSON.stringify(defaultForRole));
    } catch {}
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      setIsAuthenticated(true);
      localStorage.setItem('iis_auth', 'true');
    } catch (err) {
      console.error('Google Sign In Error: ', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (firebaseUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.error('Sign Out Error: ', err);
    } finally {
      setIsAuthenticated(false);
      try {
        localStorage.removeItem('iis_auth');
      } catch {}
    }
  };

  const role = currentUser.role;
  const isSuperAdmin = role === 'Super Admin';
  const isAdmin = isSuperAdmin || role === 'Admin';
  const isTeacher = role === 'Teacher';
  const isAccountant = role === 'Accountant' || isAdmin;
  const isParent = role === 'Parent';

  // Specific granular permissions
  const canManageStudents = isAdmin;
  const canManageTeachers = isAdmin;
  const canManageBatches = isAdmin;
  const canManageFees = isAccountant;
  const canMarkStudentAttendance = isAdmin || isTeacher;
  const canViewTeacherAttendance = (targetTeacherId?: string) => {
    if (isAdmin) return true;
    if (isTeacher && targetTeacherId && currentUser.linkedTeacherId === targetTeacherId) return true;
    return false;
  };
  const canManageExams = isAdmin || isTeacher;
  const canEnterMarks = isAdmin || isTeacher;
  const canViewReports = isSuperAdmin || isAdmin || isAccountant;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        activeRole: currentUser.role,
        loginWithPhone,
        loginAsDemoUser,
        switchRole,
        availableUsers: INITIAL_USERS,
        firebaseUser,
        loginWithGoogle,
        logout,
        canManageStudents,
        canManageTeachers,
        canManageBatches,
        canManageFees,
        canMarkStudentAttendance,
        canViewTeacherAttendance,
        canManageExams,
        canEnterMarks,
        canViewReports,
        isParent,
        isTeacher,
        isAdmin,
        isSuperAdmin,
        isAccountant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
