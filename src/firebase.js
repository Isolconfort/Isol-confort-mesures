import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBfNDzCqI7q2pO4Quq2-EpxQmb-RIGMTjg",
  authDomain: "isol-confort-mesures-dc0d5.firebaseapp.com",
  projectId: "isol-confort-mesures-dc0d5",
  storageBucket: "isol-confort-mesures-dc0d5.firebasestorage.app",
  messagingSenderId: "436757530847",
  appId: "1:436757530847:web:50f1864cd570a02d0ec16a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
