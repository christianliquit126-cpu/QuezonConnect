import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { auth, db, googleProvider, facebookProvider } from '../firebase'

const AuthContext = createContext()

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID || ''

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

const checkIsAdmin = (uid, profile) => {
  if (!uid) return false
  if (ADMIN_UID && uid === ADMIN_UID) return true
  return profile?.role === 'admin'
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const createUserDoc = async (firebaseUser, extra = {}) => {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)
    const isEnvAdmin = ADMIN_UID && firebaseUser.uid === ADMIN_UID

    if (!snap.exists()) {
      // Always create with 'member' role first (satisfies Firestore rules)
      await setDoc(ref, {
        uid: firebaseUser.uid,
        name: extra.name || firebaseUser.displayName || 'Community Member',
        email: firebaseUser.email,
        avatar:
          firebaseUser.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(extra.name || 'User')}&background=2563eb&color=fff`,
        location: extra.location || '',
        barangay: extra.barangay || '',
        city: extra.city || '',
        lat: extra.lat || null,
        lng: extra.lng || null,
        isQC: extra.isQC !== undefined ? extra.isQC : null,
        bio: extra.bio || '',
        role: 'member',
        emailVerified: firebaseUser.emailVerified || false,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      })

      // If this is the designated admin, promote their role in a separate update
      if (isEnvAdmin) {
        await updateDoc(ref, { role: 'admin' })
      }
    } else {
      // Document exists — update lastSeen and emailVerified status
      const updates = {
        lastSeen: serverTimestamp(),
        emailVerified: firebaseUser.emailVerified || false,
      }

      if (isEnvAdmin && snap.data().role !== 'admin') {
        updates.role = 'admin'
      }

      // Update avatar if using Google/social and photo changed
      if (firebaseUser.photoURL && !snap.data().avatar?.includes('ui-avatars')) {
        updates.avatar = firebaseUser.photoURL
      }

      await updateDoc(ref, updates)
    }

    const updated = await getDoc(ref)
    return updated.data()
  }

  const fetchUserProfile = async (uid) => {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const data = snap.data()
      if (data.role === 'banned') {
        await signOut(auth)
        setUserProfile(null)
        return
      }
      const isEnvAdmin = ADMIN_UID && uid === ADMIN_UID
      if (isEnvAdmin && data.role !== 'admin') {
        await updateDoc(ref, { role: 'admin' })
        setUserProfile({ ...data, role: 'admin' })
      } else {
        setUserProfile(data)
      }
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      try {
        if (user) {
          // Ensure user doc exists (handles social login race condition)
          const ref = doc(db, 'users', user.uid)
          const snap = await getDoc(ref)
          if (!snap.exists()) {
            // Doc not created yet (social login case) — create it now
            await createUserDoc(user)
          } else {
            // Update lastSeen and emailVerified on every sign-in
            await updateDoc(ref, {
              lastSeen: serverTimestamp(),
              emailVerified: user.emailVerified || false,
            }).catch(() => {})
          }
          await fetchUserProfile(user.uid)
        } else {
          setUserProfile(null)
        }
      } catch {
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const login = async (email, password, rememberMe = true) => {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    )
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await fetchUserProfile(cred.user.uid)
    return cred
  }

  const signup = async (email, password, name, location = '') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    const profile = await createUserDoc(cred.user, { name, location })
    setUserProfile(profile)
    // Send email verification after account creation
    try {
      await sendEmailVerification(cred.user)
    } catch {
      // Non-fatal: verification email failed but account was created
    }
    return cred
  }

  const loginWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    const profile = await createUserDoc(cred.user)
    setUserProfile(profile)
    return cred
  }

  const loginWithFacebook = async () => {
    const cred = await signInWithPopup(auth, facebookProvider)
    const profile = await createUserDoc(cred.user)
    setUserProfile(profile)
    return cred
  }

  const logout = async () => {
    await signOut(auth)
    setUserProfile(null)
  }

  const refreshProfile = async () => {
    if (currentUser) {
      await currentUser.reload()
      await fetchUserProfile(currentUser.uid)
    }
  }

  const resendVerificationEmail = async () => {
    if (!currentUser) throw new Error('Not logged in')
    if (currentUser.emailVerified) throw new Error('Email already verified')
    await sendEmailVerification(currentUser)
  }

  const deleteAccount = async (password) => {
    if (!currentUser) throw new Error('Not logged in')

    // Re-authenticate if email/password provider
    const isEmailUser = currentUser.providerData?.some(
      (p) => p.providerId === 'password'
    )
    if (isEmailUser && password) {
      const credential = EmailAuthProvider.credential(currentUser.email, password)
      await reauthenticateWithCredential(currentUser, credential)
    } else if (!isEmailUser) {
      // For Google users, re-authenticate with Google
      const result = await signInWithPopup(auth, googleProvider)
      await reauthenticateWithCredential(
        currentUser,
        GoogleAuthProvider.credentialFromResult(result)
      )
    }

    const uid = currentUser.uid
    // Delete Firestore user document
    try {
      await deleteDoc(doc(db, 'users', uid))
    } catch {
      // Continue even if Firestore delete fails
    }

    await deleteUser(currentUser)
    setUserProfile(null)
  }

  const isAdmin = checkIsAdmin(currentUser?.uid, userProfile)

  const isEmailVerified = currentUser?.emailVerified || false
  const isEmailProvider = currentUser?.providerData?.some(
    (p) => p.providerId === 'password'
  )
  // Only prompt email users to verify — social logins are considered verified
  const needsEmailVerification = isEmailProvider && !isEmailVerified

  const displayUser = currentUser
    ? {
        uid: currentUser.uid,
        name: userProfile?.name || currentUser.displayName || 'User',
        email: currentUser.email,
        avatar:
          userProfile?.avatar ||
          currentUser.photoURL ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name || currentUser.displayName || 'User')}&background=2563eb&color=fff`,
        location: userProfile?.location || '',
        barangay: userProfile?.barangay || '',
        city: userProfile?.city || '',
        lat: userProfile?.lat || null,
        lng: userProfile?.lng || null,
        isQC: userProfile?.isQC ?? null,
        bio: userProfile?.bio || '',
        role: isAdmin ? 'admin' : (userProfile?.role || 'member'),
        emailVerified: isEmailVerified,
        createdAt: userProfile?.createdAt || null,
        lastSeen: userProfile?.lastSeen || null,
      }
    : null

  const value = {
    currentUser,
    userProfile,
    loading,
    isLoggedIn: !!currentUser,
    isAdmin,
    isEmailVerified,
    isEmailProvider,
    needsEmailVerification,
    displayUser,
    login,
    signup,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    refreshProfile,
    resendVerificationEmail,
    deleteAccount,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
