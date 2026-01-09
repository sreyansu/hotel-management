import admin from 'firebase-admin';
import { env } from './env.js';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
        }),
    });
}

export const firebaseAuth = admin.auth();

export interface DecodedFirebaseToken {
    uid: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    iat: number;
    exp: number;
}

export async function verifyFirebaseToken(
    token: string
): Promise<DecodedFirebaseToken | null> {
    try {
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        return decodedToken as DecodedFirebaseToken;
    } catch (error) {
        console.error('Firebase token verification failed:', error);
        return null;
    }
}
