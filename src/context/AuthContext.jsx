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

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const createUserDoc = async (firebaseUser, extra = {}) => {
    const ref = doc(db, 'users', firebaseUser.uid)
    const snap = await getDoc(ref)
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
        createdAt: serverTimestamp(),
      })
    }
    const updated = await getDoc(ref)
    return updated.data()
  }

  const fetchUserProfile = async (uid) => {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (snap.exists()) setUserProfile(snap.data())
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) await fetchUserProfile(user.uid)
      else setUserProfile(null)
      setLoading(false)
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

  const displayUser = currentUser
    ? {
        uid: currentUser.uid,
        name: userProfile?.name || currentUser.displayName || 'User',
        email: currentUser.email,
        avatar:
          userProfile?.avatar ||
          currentUser.photoURL ||
          `https://ui-avatars.com/api/?name=User&background=2563eb&color=fff`,
        location: userProfile?.location || '',
        barangay: userProfile?.barangay || '',
        city: userProfile?.city || '',
        lat: userProfile?.lat || null,
        lng: userProfile?.lng || null,
        isQC: userProfile?.isQC ?? null,
        role: userProfile?.role || 'member',
      }
    : null

  const isAdmin = userProfile?.role === 'admin'

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
