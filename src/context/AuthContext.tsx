import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types/index.ts';
import { INITIAL_USERS } from '../lib/demoData.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface AuthContextType {
  currentUser: UserProfile;
  activeRole: UserRole;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_USERS[0]); // default Super Admin
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user && user.email) {
        // If logged in via Google, check if user matches or create profile
        const matched = INITIAL_USERS.find(u => u.email.toLowerCase() === user.email?.toLowerCase());
        if (matched) {
          setCurrentUser(matched);
        } else {
          // If logged in with another Google account, default to Super Admin for institute owner
          const newProfile: UserProfile = {
            id: user.uid,
            email: user.email,
            name: user.displayName || user.email.split('@')[0],
            role: 'Super Admin',
            avatarUrl: user.photoURL || undefined,
            createdAt: new Date().toISOString(),
          };
          setCurrentUser(newProfile);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const switchRole = (role: UserRole, specificUserId?: string) => {
    if (specificUserId) {
      const user = INITIAL_USERS.find(u => u.id === specificUserId);
      if (user) {
        setCurrentUser(user);
        return;
      }
    }
    const defaultForRole = INITIAL_USERS.find(u => u.role === role) || {
      id: `usr_${role.toLowerCase().replace(' ', '_')}`,
      email: `${role.toLowerCase().replace(' ', '_')}@iisinstitute.com`,
      name: `${role} User`,
      role,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(defaultForRole);
  };

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.error('Google Sign In Error: ', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(INITIAL_USERS[0]);
    } catch (err) {
      console.error('Sign Out Error: ', err);
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
        activeRole: currentUser.role,
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
