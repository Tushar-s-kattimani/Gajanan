'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';

export function VisitorTracker() {
  const { user, loading, role } = useUser();
  const lastLoggedUid = useRef<string | null>('initial');

  useEffect(() => {
    // Only run this on the client, and wait until Firebase finishes checking the login state
    if (typeof window === 'undefined' || loading) return;

    // Do not log admin visits
    if (role === 'admin') return;

    const currentUid = user ? user.uid : 'anon';
    
    const logVisit = async (isReopen: boolean = false) => {
      // If it's just the initial mount, we check if we already logged this state
      if (!isReopen) {
        if (lastLoggedUid.current === currentUid) return;
        lastLoggedUid.current = currentUid;
      }

      let userDetails = 'Anonymous';
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            userDetails = data.shopName ? `${data.shopName} (${data.phoneNumber || user.email})` : user.email || 'Registered User';
          }
        } catch (e) {
          userDetails = user.email || 'Registered User';
        }
      }

      const ua = navigator.userAgent;
      
      // Basic device detection
      let deviceType = 'Desktop';
      if (/Mobi|Android/i.test(ua)) deviceType = 'Mobile';
      else if (/Tablet|iPad/i.test(ua)) deviceType = 'Tablet';

      // Basic browser detection
      let browser = 'Unknown';
      if (ua.indexOf("Firefox") > -1) browser = "Firefox";
      else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
      else if (ua.indexOf("Opera") > -1 || ua.indexOf("OPR") > -1) browser = "Opera";
      else if (ua.indexOf("Trident") > -1) browser = "Internet Explorer";
      else if (ua.indexOf("Edge") > -1) browser = "Edge";
      else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
      else if (ua.indexOf("Safari") > -1) browser = "Safari";

      // Basic OS detection
      let os = 'Unknown';
      if (ua.indexOf("Win") > -1) os = "Windows";
      else if (ua.indexOf("Mac") > -1) os = "MacOS";
      else if (ua.indexOf("Linux") > -1) os = "Linux";
      else if (ua.indexOf("Android") > -1) os = "Android";
      else if (ua.indexOf("like Mac") > -1) os = "iOS";

      try {
        await addDoc(collection(db, 'visitors'), {
          timestamp: serverTimestamp(),
          userDetails,
          deviceType,
          browser,
          os,
          userAgent: ua,
          type: isReopen ? 'App Reopened' : 'Page Load'
        });
      } catch (error) {
        console.error("Error logging visit:", error);
      }
    };

    // Run once on load/login
    logVisit(false);

    // Run every time they switch back to the tab or reopen the app on mobile
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // They just switched back to the app, log it!
        logVisit(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };

  }, [user, loading]);

  return null;
}
