import React, { useState, useMemo } from 'react';
import { 
  Search, FileSearch, DollarSign, 
  Trash2, RotateCcw, FileText, SendHorizontal, 
  User, ShieldCheck, Calendar, Filter
} from 'lucide-react';
import { formatToBRL, getHexFromTailwind } from '../utils/helpers';

const SubmittedReportsPage = ({ 
  expenses, 
  costCenters, 
  appUsers, 
  isAdminView, 
  onViewReport, 
  onEditId, 
  onAudit, 
  onPay, 
  onDelete, 
  onReopen, 
  currentCompany 
}) => {
  const currentD = new Date();
  const [filterCC, setFilterCC] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterId, setFilterId] = useState('');
  
  // --- FILTROS DE DATA ---
  const [filterMonth, setFilterMonth] = useState(String(currentD.getMonth()));
  const [filterYear, setFilterYear] = useState(String(currentD.getFullYear()));

  // --- ESTILO DARK PREMIUM ---
  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.includes('text-') ? companyColor.replace('text-', 'border-') : 'border-indigo-600';

  const months = [
      { v: '0', l: 'Janeiro' }, { v: '1', l: 'Fevereiro' }, { v: '2', l: 'Março' }, 
      { v: '3', l: 'Abril' }, { v: '4', l: 'Maio' }, { v: '5', l: 'Junho' },
      { v: '6', l: 'Julho' }, { v: '7', l: 'Agosto' }, { v: '8', l: 'Setembro' }, 
      { v: '9', l: 'Outubro' }, { v: '10', l: 'Novembro' }, { v: '11', l: 'Dezembro' }
  ];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  // --- LÓGICA DE DADOS (MANTIDA INTEGRALMENTE) ---
  const reports = useMemo(() => {
    // 1. Filtra apenas despesas ENVIADAS ('Submitted')
    const submittedExpenses = expenses.filter(e => {
        if (e.status !== 'Submitted') return false;

        // Filtro de Data (Mês/Ano)
        const date = e.closingDate 
            ? (e.closingDate instanceof Date ? e.closingDate : e.closingDate.toDate()) 
            : null;
        
        if (!date) return false;
        if (String(date.getMonth()) !== filterMonth) return false;
        if (String(date.getFullYear()) !== filterYear) return false;

        return true;
    });
    
    // 2. Agrupa por ID do Relatório e Usuário
    const grouped = submittedExpenses.reduce((acc, curr) => {
      const k = `${curr.reportId}_${curr.userId}`;
      if (!acc[k]) acc[k] = [];
      acc[k].push(curr);
      return acc;
    }, {});

    // 3. Processa a lista e aplica a SOMA CONDICIONAL
    const list = Object.values(grouped).map(items => {
      const first = items[0];
      const owner = appUsers?.find(u => u.id === first.userId) || { name: 'Desconhecido' };

      // Lógica de Soma
      const isSubstituteReport = items.some(i => i.substituteType);
      let totalToPay = 0;

      if (isSubstituteReport) {
        const subExpenses = items.filter(i => i.substituteType === 'Substituta');
        totalToPay = subExpenses.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
      } else {
        totalToPay = items.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
      }

      const isFullyPaid = items.every(i => i.isPaid);

      return {
        uniqueKey: `${first.reportId}_${first.userId}`,
        reportId: first.reportId,
        ownerId: first.userId,
        ownerName: owner.name,
        costCenter: first.costCenter,
        date: first.closingDate instanceof Date 
          ? first.closingDate 
          : (first.closingDate ? first.closingDate.toDate() : new Date()),
        total: totalToPay,
        isPaid: isFullyPaid
      };
    });

    // 4. Ordenação e Filtros
    const sortedList = list.sort((a, b) => {
        return b.reportId.localeCompare(a.reportId, undefined, { numeric: true });
    });
    
    return sortedList.filter(r => {
      const matchCC = !filterCC || r.costCenter === filterCC;
      const matchUser = !filterUser || r.ownerId === filterUser;
      const matchId = !filterId || r.reportId.toLowerCase().includes(filterId.toLowerCase());
      return matchCC && matchUser && matchId;
    });
  }, [expenses, appUsers, filterCC, filterUser, filterId, filterMonth, filterYear]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* --- HEADER DARK PREMIUM (DESIGN NOVO) --- */}
      <div 
        className="min-h-20 px-8 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 bg-slate-900 border-b-2 shadow-md z-20"
        style={{ borderBottomColor: getHexFromTailwind(companyColor) }}
      >
        
        {/* TÍTULO */}
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <SendHorizontal size={24} className={companyColor} />
                Relatórios Enviados
            </h2>
            <p className="text-xs text-slate-400 font-medium pl-9">Aguardando aprovação ou pagamento</p>
        </div>
        
        {/* BARRA DE FERRAMENTAS ESCURA */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* SELETOR DE MÊS/ANO (Estilo Escuro) */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm">
             <div className="pl-2 pr-1 text-slate-400"><Calendar size={14}/></div>
             <select 
                value={filterMonth} 
                onChange={e => setFilterMonth(e.target.value)} 
                className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white"
             >
                {months.map(m => <option key={m.v} value={m.v} className="bg-slate-800">{m.l}</option>)}
             </select>
             <div className="w-px h-4 bg-slate-600 mx-1"></div>
             <select 
                value={filterYear} 
                onChange={e => setFilterYear(e.target.value)} 
                className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white"
             >
                {years.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
             </select>
          </div>

          {/* BUSCA ID */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input 
                type="text" 
                placeholder="Buscar ID..." 
                value={filterId} 
                onChange={e => setFilterId(e.target.value)} 
                className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-32 placeholder-slate-500 transition-all"
            />
          </div>
          
          {/* FILTRO CENTRO DE CUSTO */}
          <select 
            value={filterCC} 
            onChange={e => setFilterCC(e.target.value)} 
            className="py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-slate-300 focus:border-slate-500 cursor-pointer hover:text-white"
          >
            <option value="" className="bg-slate-800">Centro de Custo (Todos)</option>
            {costCenters.map(c => <option key={c.id} value={c.name} className="bg-slate-800">{c.name}</option>)}
          </select>
          
          {/* FILTRO USUÁRIO (ADMIN) */}
          {isAdminView && (
            <select 
                value={filterUser} 
                onChange={e => setFilterUser(e.target.value)} 
                className="py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-slate-300 focus:border-slate-500 cursor-pointer hover:text-white"
            >
              <option value="" className="bg-slate-800">Usuário (Todos)</option>
              {appUsers.map(u => <option key={u.id} value={u.id} className="bg-slate-800">{u.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* --- TABELA (DESIGN CLEAN/WHITE) --- */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                <th className="p-4 pl-8">Usuário</th>
                <th className="p-4">ID Relatório</th>
                <th className="p-4">Data Envio</th>
                <th className="p-4">Centro Custo</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4 text-center">Pagamento</th>
                <th className="p-4 text-center pr-8">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-600">
                {reports.map(item => (
                <tr key={item.uniqueKey} className="hover:bg-slate-50 transition-colors group">
                    
                    {/* COLUNA 1: USUÁRIO */}
                    <td className="p-4 pl-8">
                    <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 border border-slate-200">
                            <User size={12}/>
                        </div>
                        <span className="font-bold text-slate-700 truncate max-w-[150px]">{item.ownerName}</span>
                    </div>
                    </td>

                    {/* COLUNA 2: ID RELATÓRIO */}
                    <td className="p-4">
                        <div className={`font-mono font-bold flex items-center gap-2 ${companyColor}`}>
                            <FileText size={14}/> 
                            {item.reportId}
                        </div>
                    </td>
                    
                    {/* COLUNA 3: DATA */}
                    <td className="p-4 font-medium text-slate-500">{item.date.toLocaleDateString()}</td>

                    {/* COLUNA 4: CENTRO DE CUSTO */}
                    <td className="p-4 font-bold text-slate-700">{item.costCenter}</td>
                    
                    {/* COLUNA 5: TOTAL */}
                    <td className="p-4 text-right">
                        <span className="font-mono font-bold text-slate-800 text-sm">{formatToBRL(item.total)}</span>
                    </td>

                    {/* COLUNA 6: PAGAMENTO */}
                    <td className="p-4 text-center">
                    {item.isPaid 
                        ? <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 text-[9px] shadow-sm uppercase tracking-wide">PAGO</span> 
                        : <span className="text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 text-[9px] uppercase tracking-wide">ABERTO</span>
                    }
                    </td>

                    {/* COLUNA 7: AÇÕES */}
                    <td className="p-4 text-center pr-8">
                        <div className="flex justify-center gap-2">
                            {/* VER */}
                            <button 
                                onClick={() => onViewReport(item)} 
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all" 
                                title="Ver Detalhes"
                            >
                                <FileSearch size={16}/>
                            </button>

                            {isAdminView && (
                                <>
                                    {/* AUDITAR */}
                                    <button 
                                        onClick={() => onAudit({ reportId: item.reportId, ownerId: item.ownerId })} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100 transition-all" 
                                        title="Auditar / Aprovar"
                                    >
                                        <ShieldCheck size={16}/>
                                    </button>

                                    {/* PAGAR */}
                                    {!item.isPaid && (
                                        <button 
                                            onClick={() => onPay(item.reportId, item.ownerId)} 
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all" 
                                            title="Marcar como Pago"
                                        >
                                            <DollarSign size={16}/>
                                        </button>
                                    )}
                                    
                                    {/* REABRIR */}
                                    <button 
                                        onClick={() => onReopen(item.reportId, item.ownerId)} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 border border-transparent hover:border-purple-100 transition-all" 
                                        title="Devolver (Corrigir)"
                                    >
                                        <RotateCcw size={16}/>
                                    </button>

                                    {/* EXCLUIR */}
                                    <button 
                                        onClick={() => onDelete({ reportId: item.reportId, ownerId: item.ownerId })} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all" 
                                        title="Excluir Definitivamente"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </>
                            )}
                        </div>
                    </td>
                </tr>
                ))}
                {reports.length === 0 && (
                    <tr><td colSpan="7" className="p-12 text-center text-slate-400 italic bg-slate-50/50">Nenhum relatório encontrado neste período.</td></tr>
                )}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default SubmittedReportsPage;