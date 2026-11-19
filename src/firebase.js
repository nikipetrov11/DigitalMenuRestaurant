import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyAt0j4uH-0894fc8lEnLvFfk9kVnvjOP_k',
  authDomain: 'menuto-a160e.firebaseapp.com',
  projectId: 'menuto-a160e',
  storageBucket: 'menuto-a160e.firebasestorage.app',
  messagingSenderId: '1078989322979',
  appId: '1:1078989322979:web:7a95e2412a699c52d063d6',
})

export const auth = getAuth(app)
export const db = getFirestore(app)
