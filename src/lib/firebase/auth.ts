import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { app } from './config';

export const auth = getAuth(app);

export const registerUser = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error: any) {
    switch (error.code) {
      case 'auth/email-already-in-use':
        throw new Error('Этот email уже используется');
      case 'auth/invalid-email':
        throw new Error('Некорректный email');
      case 'auth/weak-password':
        throw new Error('Слишком простой пароль');
      default:
        throw new Error('Ошибка при регистрации');
    }
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    switch (error.code) {
      case 'auth/invalid-email':
        throw new Error('Некорректный email');
      case 'auth/user-disabled':
        throw new Error('Аккаунт заблокирован');
      case 'auth/user-not-found':
        throw new Error('Пользователь не найден');
      case 'auth/wrong-password':
        throw new Error('Неверный пароль');
      default:
        throw new Error('Ошибка при входе');
    }
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error('Ошибка при выходе из системы');
  }
};