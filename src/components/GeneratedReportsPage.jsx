import React, { useState, useMemo } from 'react';
import { 
  FileText, Calendar, Search, Send, 
  RotateCcw, Pencil, Filter, Package, Eye 
} from 'lucide-react';
import { formatToBRL } from '../utils/helpers';

const GeneratedReportsPage = ({ 
  expenses, 
  onViewReport, 
  onLaunch, 
  onReopen, 
  onEditId, 
  currentCompany 
}) => {
  const currentD = new Date();
  
  // --- ESTADOS DE FILTRO (Padrão: Mês Atual) ---
  const [selectedMonth, setSelectedMonth] = useState(String(currentD.getMonth()));
  const [selectedYear, setSelectedYear] = useState(String(currentD.getFullYear()));
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- ESTILO DARK DA EMPRESA ---
  const companyColor = currentCompany?.color || 'text-indigo-600';
  const borderColorClass = companyColor.replace('text-', 'border-');

  const months = [
      { v: '0', l: 'Janeiro' }, { v: '1', l: 'Fevereiro' }, { v: '2', l: 'Março' }, 
      { v: '3', l: 'Abril' }, { v: '4', l: 'Maio' }, { v: '5', l: 'Junho' },
      { v: '6', l: 'Julho' }, { v: '7', l: 'Agosto' }, { v: '8', l: 'Setembro' }, 
      { v: '9', l: 'Outubro' }, { v: '10', l: 'Novembro' }, { v: '11', l: 'Dezembro' }
  ];
  const years = ['2025', '2026', '2027', '2028', '2029', '2030'];

  // --- LÓGICA DE DADOS ---
  const reportsList = useMemo(() => {
    // 1. Filtra despesas 'Closed' (Geradas)
    const relevantExpenses = expenses.filter(e => {
        if (e.status !== 'Closed') return false;

        // Filtro de Data (Mês/Ano baseada no fechamento)
        const date = e.closingDate 
            ? (e.closingDate instanceof Date ? e.closingDate : e.closingDate.toDate()) 
            : (e.date instanceof Date ? e.date : e.date.toDate()); // Fallback se não tiver closingDate
        
        if (String(date.getMonth()) !== selectedMonth) return false;
        if (String(date.getFullYear()) !== selectedYear) return false;

        return true;
    });

    // 2. Agrupa por Report ID
    const grouped = relevantExpenses.reduce((acc, curr) => {
        const rid = curr.reportId;
        if (!acc[rid]) acc[rid] = [];
        acc[rid].push(curr);
        return acc;
    }, {});

    // 3. Transforma em Array
    const list = Object.values(grouped).map(items => {
        const first = items[0];
        const total = items.reduce((sum, i) => sum + Number(i.value), 0);
        
        const dateObj = first.closingDate 
            ? (first.closingDate instanceof Date ? first.closingDate : first.closingDate.toDate())
            : new Date();

        return {
            id: first.reportId,
            ownerId: first.userId,
            costCenter: first.costCenter,
            itemsCount: items.length,
            totalValue: total,
            date: dateObj,
            sampleItem: first // Para pegar dados extras se precisar
        };
    });

    // 4. Filtra por busca
    const filtered = list.filter(r => 
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.costCenter.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 5. Ordenação: ID DECRESCENTE
    return filtered.sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));

  }, [expenses, selectedMonth, selectedYear, searchTerm]);

  // KPI Rápido
  const totalValue = reportsList.reduce((acc, r) => acc + r.totalValue, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* --- HEADER DARK PREMIUM --- */}
      <div className={`min-h-20 px-8 py-4 flex flex-col lg:flex-row justify-between lg:items-center gap-4 shrink-0 bg-slate-900 border-b-2 ${borderColorClass} shadow-md z-20`}>
        
        {/* TÍTULO */}
        <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                <Package size={24} className={companyColor} />
                Relatórios Gerados
            </h2>
            <p className="text-xs text-slate-400 font-medium pl-9">Prontos para conferência e envio</p>
        </div>
        
        {/* BARRA DE FERRAMENTAS */}
        <div className="flex items-center gap-3 flex-wrap">
            
            {/* SELETOR DE MÊS/ANO */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-sm">
                <div className="pl-2 pr-1 text-slate-400"><Calendar size={14}/></div>
                <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(e.target.value)} 
                    className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white"
                >
                    {months.map(m => <option key={m.v} value={m.v} className="bg-slate-800">{m.l}</option>)}
                </select>
                <div className="w-px h-4 bg-slate-600 mx-1"></div>
                <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(e.target.value)} 
                    className="bg-transparent text-xs font-bold text-slate-200 outline-none py-1 px-1 cursor-pointer hover:text-white"
                >
                    {years.map(y => <option key={y} value={y} className="bg-slate-800">{y}</option>)}
                </select>
            </div>

            {/* BUSCA */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input 
                    type="text" 
                    placeholder="Buscar ID ou Centro..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    className="pl-9 pr-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-bold outline-none text-white focus:border-slate-500 w-40 placeholder-slate-500 transition-all"
                />
            </div>
        </div>
      </div>

      {/* KPI SUB-HEADER */}
      <div className="bg-white border-b border-slate-200 px-8 py-3 flex gap-6 text-xs">
          <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase">Total Gerado ({months[Number(selectedMonth)].l}):</span>
              <span className="font-black text-slate-800 text-sm">{formatToBRL(totalValue)}</span>
          </div>
          <div className="w-px h-4 bg-slate-300"></div>
          <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500 uppercase">Qtd. Relatórios:</span>
              <span className="font-black text-indigo-600 text-sm">{reportsList.length}</span>
          </div>
      </div>

      {/* LISTAGEM (TABELA CLEAN) */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                        <th className="p-4 pl-8">ID Relatório</th>
                        <th className="p-4">Data Geração</th>
                        <th className="p-4">Centro Custo</th>
                        <th className="p-4 text-center">Itens</th>
                        <th className="p-4 text-right">Valor Total</th>
                        <th className="p-4 text-center pr-8">Ações</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-600">
                    {reportsList.map((report) => (
                        <tr key={report.id} className="hover:bg-slate-50 transition-colors group">
                            
                            {/* ID */}
                            <td className="p-4 pl-8">
                                <div className={`font-mono font-bold flex items-center gap-2 ${companyColor} text-sm`}>
                                    <FileText size={16}/> 
                                    {report.id}
                                </div>
                            </td>

                            {/* DATA */}
                            <td className="p-4 font-medium text-slate-500">
                                {report.date.toLocaleDateString()}
                            </td>

                            {/* CENTRO DE CUSTO */}
                            <td className="p-4 font-bold text-slate-700">
                                {report.costCenter}
                            </td>

                            {/* ITENS */}
                            <td className="p-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-[10px] font-bold border border-slate-200">
                                    {report.itemsCount} itens
                                </span>
                            </td>

                            {/* VALOR */}
                            <td className="p-4 text-right">
                                <span className="font-mono font-black text-slate-800 text-sm">{formatToBRL(report.totalValue)}</span>
                            </td>

                            {/* AÇÕES */}
                            <td className="p-4 text-center pr-8">
                                <div className="flex justify-center gap-2 opacity-100">
                                    {/* VISUALIZAR */}
                                    <button 
                                        onClick={() => onViewReport(report)} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all"
                                        title="Visualizar Impressão"
                                    >
                                        <Eye size={16}/>
                                    </button>

                                    {/* EDITAR ID */}
                                    <button 
                                        onClick={() => onEditId(report.id)} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all"
                                        title="Editar ID"
                                    >
                                        <Pencil size={16}/>
                                    </button>

                                    {/* REABRIR (DESFAZER) */}
                                    <button 
                                        onClick={() => onReopen(report.id, report.ownerId)} 
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all"
                                        title="Reabrir (Voltar para Lançamentos)"
                                    >
                                        <RotateCcw size={16}/>
                                    </button>

                                    {/* ENVIAR (SUBMIT) */}
                                    <button 
                                        onClick={() => onLaunch(report.id, report.ownerId)} 
                                        className={`p-1.5 rounded-lg text-white shadow-md transition-all flex items-center gap-2 px-3 ml-2 ${companyColor.replace('text-', 'bg-').replace('600', '600')} hover:opacity-90`}
                                        title="Enviar Relatório"
                                    >
                                        <Send size={14} /> <span className="text-[10px] font-bold uppercase">Enviar</span>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {reportsList.length === 0 && (
                        <tr>
                            <td colSpan="6" className="p-12 text-center text-slate-400 italic bg-slate-50/50">
                                <div className="flex flex-col items-center gap-2">
                                    <Filter size={32} strokeWidth={1} className="text-slate-300"/>
                                    <span>Nenhum relatório gerado encontrado neste período.</span>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default GeneratedReportsPage;