import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function signIn(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
}

export async function signUp(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
}

export async function signOut(): Promise<void> {
    await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
}

export async function getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
}
