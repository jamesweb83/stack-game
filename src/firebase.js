// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
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

// 개발 환경에서 Firestore 에뮬레이터 연결 (선택 사항)
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   console.log('Connected to Firestore emulator');
// }

export { db, initialized };