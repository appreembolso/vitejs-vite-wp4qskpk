import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  collectionGroup, 
  where,
  orderBy,   // Adicionado para ordenação
  Timestamp  // Adicionado para filtro de data
} from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { useAuth } from './AuthContext';
import { DEFAULT_COMPANIES } from '../data/constants';

// Criação do Contexto
const DataContext = createContext();

export function DataProvider({ children }) {
  const { currentUser, isAdmin } = useAuth();
  
  // --- ESTADOS GLOBAIS ---
  const [expenses, setExpenses] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [categories, setCategories] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  
  // Estado da Empresa Atual
  const [currentCompany, setCurrentCompany] = useState(null);
  
  const [loading, setLoading] = useState(true);

  // --- 1. CARREGAR CONFIGURAÇÕES ---
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    
    const unsubs = [];

    // Função auxiliar para simplificar os listeners
    const createListener = (collectionName, setter) => {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', collectionName));
      return onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Ordenação simples por nome, se existir
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setter(list);
      }, (error) => console.warn(`Erro ao buscar ${collectionName}:`, error));
    };

    unsubs.push(createListener('companies', setCompanies));
    unsubs.push(createListener('costCenters', setCostCenters));
    unsubs.push(createListener('expenseCategories', setCategories));
    unsubs.push(createListener('app_users', setAppUsers));

    return () => unsubs.forEach(u => u());
  }, []);

  // --- 2. LÓGICA DE EMPRESAS DISPONÍVEIS ---
  const availableCompanies = useMemo(() => {
    // Se ainda não carregou usuários ou empresas, retorna vazio
    if (!currentUser || companies.length === 0) return [];
    
    // Se for admin, vê todas
    if (isAdmin) return companies;

    // Se for usuário comum, verifica o array 'allowedCompanies'
    const userData = appUsers.find(u => u.id === currentUser.uid);
    if (userData && userData.allowedCompanies && userData.allowedCompanies.length > 0) {
      return companies.filter(c => userData.allowedCompanies.includes(c.id));
    }
    
    // Fallback
    return [];
  }, [companies, isAdmin, currentUser, appUsers]);

  // Define a empresa inicial automaticamente
  useEffect(() => {
    if (availableCompanies.length > 0 && !currentCompany) {
      setCurrentCompany(availableCompanies[0]);
    } else if (availableCompanies.length > 0 && currentCompany) {
        // Verifica se a empresa selecionada ainda é válida
        const isValid = availableCompanies.find(c => c.id === currentCompany.id);
        if (!isValid) setCurrentCompany(availableCompanies[0]);
    }
  }, [availableCompanies, currentCompany]);

  // --- 3. CARREGAR DESPESAS (OTIMIZADO) ---
  useEffect(() => {
    // Só busca se tiver usuário logado
    if (!currentUser) {
      setExpenses([]);
      return;
    }

    let q;
    try {
      if (isAdmin) {
        // --- LÓGICA DE ADMIN (OTIMIZADA) ---
        // Pega o primeiro dia do mês atual
        const now = new Date();
        const startPeriod = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Converte para Timestamp do Firestore
        const firebaseDate = Timestamp.fromDate(startPeriod);

        console.log("Admin: Buscando despesas a partir de:", startPeriod.toLocaleDateString());

        // Busca GLOBAL (todos os usuários), mas filtrado por DATA
        q = query(
          collectionGroup(db, 'expenses'),
          where('date', '>=', firebaseDate),
          orderBy('date', 'desc') // *Requer índice composto no Firestore (ver console)*
        );
      } else {
        // --- LÓGICA DE USUÁRIO COMUM ---
        // Vê apenas suas despesas na subcoleção dele
        q = query(
          collection(db, 'artifacts', appId, 'users', currentUser.uid, 'expenses')
          // Você pode adicionar orderBy aqui também se quiser garantir a ordem no retorno
        );
      }

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // --- TRATAMENTO DE DATAS ---
          let dateObj = new Date();
          if (data.date) {
             if (data.date.toDate) dateObj = data.date.toDate();
             else dateObj = new Date(data.date);
          }

          let closingDateObj = null;
          if (data.closingDate) {
             if (data.closingDate.toDate) closingDateObj = data.closingDate.toDate();
             else closingDateObj = new Date(data.closingDate);
          }

          return {
            id: doc.id,
            ...data,
            date: dateObj,
            closingDate: closingDateObj
          };
        });

        // Ordenação final no cliente (garantia extra)
        setExpenses(list.sort((a, b) => b.date - a.date));
        setLoading(false); // Dados carregados
      }, (error) => {
        console.error("Erro crítico ao buscar despesas:", error);
        
        // Alerta visual para criação de índice
        if (error.message.includes('requires an index')) {
            const msg = "ADMIN: Necessário criar índice no Firebase. Abra o Console (F12) e clique no link do erro.";
            console.error(msg);
            alert(msg);
        }
        
        setLoading(false);
      });

      return () => unsubscribe();

    } catch (err) {
      console.error("Erro na query de despesas:", err);
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  // Objeto que será distribuído para toda a app
  const value = {
    // Dados
    expenses,
    costCenters: costCenters.length ? costCenters : [{id:'def', name:'Geral'}],
    categories: categories.length ? categories : [{id:'def', name:'Geral'}],
    appUsers,
    companies,
    
    // Estado de Empresa
    currentCompany,
    setCurrentCompany,
    availableCompanies,
    
    // Status
    loading
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

// Hook personalizado para usar o contexto facilmente
export function useData() {
  return useContext(DataContext);
}