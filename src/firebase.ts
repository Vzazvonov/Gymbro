import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAPxOtMHcy9UBcPYNvdDsJNY9aHK6vKyK4",
  authDomain: "gymbro-48e76.firebaseapp.com",
  projectId: "gymbro-48e76",
  storageBucket: "gymbro-48e76.firebasestorage.app",
  messagingSenderId: "122776164397",
  appId: "1:122776164397:web:abd54b08801ffd8ee1c0a4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function loginAnon() {
  await signInAnonymously(auth);
}

// --- Firestore helpers ---
export async function getAllExercises() {
  const querySnapshot = await getDocs(collection(db, "exercises"));
  const result: any = {};
  querySnapshot.forEach((doc: any) => {
    result[doc.id] = doc.data();
  });
  return result;
}

export async function saveExercise(id: string, data: any) {
  await setDoc(doc(db, "exercises", id), data);
}

export async function deleteExercise(id: string) {
  await deleteDoc(doc(db, "exercises", id));
}

export async function getAllTemplates() {
  const querySnapshot = await getDocs(collection(db, "templates"));
  const result: any[] = [];
  querySnapshot.forEach((doc: any) => {
    result.push({ id: doc.id, ...doc.data() });
  });
  return result;
}

export async function saveTemplate(id: string, data: any) {
  await setDoc(doc(db, "templates", id), data);
}

export async function deleteTemplate(id: string) {
  await deleteDoc(doc(db, "templates", id));
}

// Для результатов тренировок
export async function addWorkoutResult(data: any) {
  await addDoc(collection(db, "workoutResults"), data);
} 