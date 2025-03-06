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
  console.log('Firebase 초기화 시작...');
  app = initializeApp(firebaseConfig);
  
  console.log('Firebase 앱 초기화 성공, Firestore 초기화 시작...');
  // Initialize Firestore
  db = getFirestore(app);
  
  console.log('Firestore 초기화 성공, Analytics 초기화 시작...');
  // Analytics는 브라우저 환경에서만 초기화
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
    console.log('Analytics 초기화 성공');
  }
  
  initialized = true;
  console.log("Firebase 초기화 완료!");
} catch (error) {
  console.error("Firebase 초기화 오류:", error);
  console.error("오류 메시지:", error.message);
  console.error("오류 스택:", error.stack);
  initialized = false;
}

// 개발 환경에서 Firestore 에뮬레이터 연결 (선택 사항)
// if (process.env.NODE_ENV === 'development') {
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   console.log('Firestore 에뮬레이터에 연결됨');
// }

export { db, initialized };