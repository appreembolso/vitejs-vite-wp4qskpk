import { doc, runTransaction } from 'firebase/firestore';
import { appId } from '../services/firebase';

export const generateUUID = () => crypto.randomUUID();

export const formatToBRL = (v) => 
  v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

export const formatCents = (s) => 
  s ? `${s.replace(/\D/g, '').padStart(3, '0').slice(0, -2).replace(/^0+/, '') || '0'},${s.replace(/\D/g, '').slice(-2)}` : '';

export const parseCurrency = (v) => 
  v ? parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0 : 0;

export const sortByName = (a, b) => {
  const nameA = a.name ? a.name.toUpperCase() : '';
  const nameB = b.name ? b.name.toUpperCase() : '';
  return nameA.localeCompare(nameB);
};

export const safePromise = (promise, timeoutMs = 25000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo limite excedido')), timeoutMs))
  ]);
};

export const generateSequentialId = async (db, userId) => {
  const year = new Date().getFullYear().toString();
  if (!db || !userId) return `OFF-${Date.now().toString().slice(-4)}`;
  
  const counterRef = doc(db, 'artifacts', appId, 'users', userId, 'counters', year);
  
  try {
    return await runTransaction(db, async (t) => {
      const docSnap = await t.get(counterRef);
      const count = (docSnap.exists() ? docSnap.data().count : 0) + 1;
      t.set(counterRef, { count }, { merge: true });
      return `${year}-${count.toString().padStart(4, '0')}`;
    });
  } catch (e) { 
    return `${year}-${Date.now().toString().slice(-4)}`; 
  }
};