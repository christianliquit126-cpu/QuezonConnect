import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
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
        role: isEnvAdmin ? 'admin' : 'member',
        createdAt: serverTimestamp(),
      })
    } else if (isEnvAdmin && snap.data().role !== 'admin') {
      await setDoc(ref, { role: 'admin' }, { merge: true })
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
        await setDoc(ref, { role: 'admin' }, { merge: true })
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
        if (user) await fetchUserProfile(user.uid)
        else setUserProfile(null)
      } catch {
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await fetchUserProfile(cred.user.uid)
    return cred
  }

  const signup = async (email, password, name, location = '') => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: name })
    const profile = await createUserDoc(cred.user, { name, location })
    setUserProfile(profile)
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
    if (currentUser) await fetchUserProfile(currentUser.uid)
  }

  const isAdmin = checkIsAdmin(currentUser?.uid, userProfile)

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
      }
    : null

  const value = {
    currentUser,
    userProfile,
    loading,
    isLoggedIn: !!currentUser,
    isAdmin,
    displayUser,
    login,
    signup,
    loginWithGoogle,
    loginWithFacebook,
    logout,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
