import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// IMPORTANT: Replace this with your actual Firebase config object
export const firebaseConfig = {
  "projectId": "studio-3745565586-76d44",
  "appId": "1:177076218719:web:2b9f12a0c428ba655464ea",
  "apiKey": "AIzaSyCvs2ETUW_d2xOdu7Dszu6GKErhUgaDi9g",
  "authDomain": "studio-3745565586-76d44.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "177076218719",
  "storageBucket": "studio-3745565586-76d44.appspot.com"
};


// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);


export { db, storage, auth };

    