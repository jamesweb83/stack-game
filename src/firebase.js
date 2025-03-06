// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore
const db = getFirestore(app);

export { db };