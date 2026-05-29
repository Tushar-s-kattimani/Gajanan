import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
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

// Enable persistent offline cache so the app works when network is flaky
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const storage = getStorage(app);
const auth = getAuth(app);

export { app as firebaseApp, db, storage, auth };