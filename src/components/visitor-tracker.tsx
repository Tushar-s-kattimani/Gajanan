'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';

export function VisitorTracker() {
  const { user } = useUser();
  const trackedRef = useRef(false);

  useEffect(() => {
    // Only run this on the client
    if (typeof window === 'undefined') return;
    
    // We use a 15-minute cooldown so we don't spam the database if they rapidly refresh,
    // but if they leave the app open on their phone and come back later, it WILL log them again.
    // We also key it by user UID so if they log in, it logs them again immediately with their real name.
    const logKey = `last_visitor_log_${user?.uid || 'anon'}`;
    const lastLogged = localStorage.getItem(logKey);
    
    if (lastLogged) {
      const timeSinceLastLog = Date.now() - parseInt(lastLogged);
      if (timeSinceLastLog < 15 * 60 * 1000) { // 15 minutes
        return; // Skip logging if they just visited
      }
    }

    const logVisit = async () => {
      // Set the cooldown immediately
      localStorage.setItem(logKey, Date.now().toString());

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
          userAgent: ua
        });
      } catch (error) {
        console.error("Error logging visit:", error);
      }
    };

    // Delay slightly so it doesn't block main render
    setTimeout(() => {
      logVisit();
    }, 2000);

  }, [user]); // Re-run if user logs in during the session

  return null;
}
