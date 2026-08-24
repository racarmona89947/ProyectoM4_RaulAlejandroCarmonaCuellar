import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import type { Unsubscribe, User } from 'firebase/auth'
import { auth } from './firebase'
import type { AppUser } from '../types/auth'

export type AuthObserver = (user: AppUser | null) => void

function mapFirebaseUser(user: User): AppUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  }
}

async function ensureLocalPersistence(): Promise<void> {
  await setPersistence(auth, browserLocalPersistence)
}

export function subscribeToAuthChanges(observer: AuthObserver): Unsubscribe {
  return onAuthStateChanged(auth, (firebaseUser) => {
    observer(firebaseUser ? mapFirebaseUser(firebaseUser) : null)
  })
}

export async function registerWithEmail(email: string, password: string): Promise<AppUser> {
  await ensureLocalPersistence()
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  return mapFirebaseUser(credential.user)
}

export async function loginWithEmail(email: string, password: string): Promise<AppUser> {
  await ensureLocalPersistence()
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return mapFirebaseUser(credential.user)
}

export async function loginWithGoogle(): Promise<AppUser> {
  await ensureLocalPersistence()
  const provider = new GoogleAuthProvider()
  const credential = await signInWithPopup(auth, provider)
  return mapFirebaseUser(credential.user)
}

export function logoutUser(): Promise<void> {
  return signOut(auth)
}
