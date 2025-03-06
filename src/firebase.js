// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, doc, setDoc, onSnapshot, getDoc, updateDoc, increment } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAJfQJgeFdnikTW20MtYWSGMsfoB6NDF7w",
  authDomain: "stack-game-rankings.firebaseapp.com",
  projectId: "stack-game-rankings",
  storageBucket: "stack-game-rankings.firebasestorage.app",
  messagingSenderId: "660815643253",
  appId: "1:660815643253:web:1263c275bc5d29b3b16e3c",
  measurementId: "G-02E45Q87H4"
};

// Firebase 초기화 상태 플래그
let initialized = false;

// Initialize Firebase
let app;
let db;
let analytics;
let onlineUsersUnsubscribe = null;

try {
  console.log('Starting Firebase initialization...');
  app = initializeApp(firebaseConfig);
  
  console.log('Firebase app initialized successfully, initializing Firestore...');
  // Initialize Firestore
  db = getFirestore(app);
  
  console.log('Firestore initialized successfully, initializing Analytics...');
  // Analytics는 브라우저 환경에서만 초기화
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    console.log('Analytics initialized successfully');
  }
  
  initialized = true;
  console.log("Firebase initialization complete!");
} catch (error) {
  console.error("Firebase initialization error:", error);
  console.error("Error message:", error.message);
  console.error("Error stack:", error.stack);
  initialized = false;
}

// 접속자 수 관리 함수
export const initOnlineUsers = async () => {
  if (!initialized || !db) {
    console.error('Firebase DB is not initialized.');
    return null;
  }

  try {
    // 'stats' 컬렉션의 'onlineUsers' 문서 참조
    const statsRef = doc(db, 'stats', 'onlineUsers');
    
    // 문서가 존재하는지 확인
    const docSnap = await getDoc(statsRef);
    
    if (!docSnap.exists()) {
      // 문서가 없으면 초기화
      await setDoc(statsRef, { count: 0 });
    }
    
    // 접속자 수 증가
    await updateDoc(statsRef, {
      count: increment(1)
    });
    
    // 브라우저가 닫히거나 페이지를 떠날 때 접속자 수 감소
    window.addEventListener('beforeunload', async () => {
      await updateDoc(statsRef, {
        count: increment(-1)
      });
    });
    
    return statsRef;
  } catch (error) {
    console.error('Error initializing online users count:', error);
    return null;
  }
};

// 접속자 수 구독 함수
export const subscribeToOnlineUsers = (callback) => {
  if (!initialized || !db) {
    console.error('Firebase DB is not initialized.');
    return () => {};
  }

  try {
    const statsRef = doc(db, 'stats', 'onlineUsers');
    
    // 실시간 업데이트 구독
    onlineUsersUnsubscribe = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback(data.count || 0);
      } else {
        callback(0);
      }
    });
    
    return onlineUsersUnsubscribe;
  } catch (error) {
    console.error('Error subscribing to online users count:', error);
    return () => {};
  }
};

// 구독 해제 함수
export const unsubscribeFromOnlineUsers = () => {
  if (onlineUsersUnsubscribe) {
    onlineUsersUnsubscribe();
    onlineUsersUnsubscribe = null;
  }
};

// 개발 환경에서 Firestore 에뮬레이터 연결 (선택 사항)
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   console.log('Connected to Firestore emulator');
// }

export { db, initialized };