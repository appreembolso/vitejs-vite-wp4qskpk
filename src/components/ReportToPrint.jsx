import React from 'react';
import { User, Coins, Building, LayoutList, AlertTriangle, RefreshCw, Calendar } from 'lucide-react';
import { formatToBRL } from '../utils/helpers';

// Função para formatar Data
const formatDateSafe = (dateVal) => {
  if (!dateVal) return '-';
  try {
    if (typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000).toLocaleDateString('pt-BR');
    if (dateVal instanceof Date) return dateVal.toLocaleDateString('pt-BR');
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
    return '-';
  } catch (e) { return '-'; }
};

// Formata CPF ou CNPJ
const formatDocument = (doc) => {
  if (!doc) return '-';
  const cleanDoc = doc.toString().replace(/\D/g, '');
  if (cleanDoc.length === 11) return cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (cleanDoc.length === 14) return cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return doc;
};

// Cores para as categorias (Gráfico)
const CATEGORY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#6366f1', '#ef4444', '#64748b'];

const ReportToPrint = React.forwardRef(({ report, items, company, appUsers, preloadedImages }, ref) => {
  if (!report) return null;

  // --- 1. PREPARAÇÃO DE DADOS ---
  const owner = appUsers.find(u => u.id === report.ownerId) || { name: 'Desconhecido', email: 'N/A' };
  const reportDate = formatDateSafe(report.closingDate || new Date());

  // Detecta se é relatório de substitutas
  const isSubstituteReport = items.some(i => i.substituteType);

  // Separa os itens
  const realExpenses = isSubstituteReport ? items.filter(i => i.substituteType === 'Real Sem NF') : [];
  const subExpenses = isSubstituteReport ? items.filter(i => i.substituteType === 'Substituta') : [];
  
  // Lista padrão (se não for substituta)
  const standardItems = !isSubstituteReport ? [...items] : [];

  // Totais
  const totalReal = realExpenses.reduce((acc, item) => acc + item.value, 0);
  const totalSub = subExpenses.reduce((acc, item) => acc + item.value, 0);
  const totalStandard = standardItems.reduce((acc, item) => acc + item.value, 0);

  // Total a Pagar
  const finalTotalToPay = isSubstituteReport ? totalSub : totalStandard;

  // Lista para Categorias e Anexos
  const validItems = isSubstituteReport ? subExpenses : standardItems;

  // Ordenação
  const sortItems = (list) => list.sort((a, b) => {
    const dateA = a.date?.seconds ? new Date(a.date.seconds * 1000) : new Date(a.date);
    const dateB = b.date?.seconds ? new Date(b.date.seconds * 1000) : new Date(b.date);
    return dateA - dateB;
  });

  // Lógica de Categorias
  const categoryData = validItems.reduce((acc, item) => {
    if (item.adminStatus !== 'rejected') {
        acc[item.category] = (acc[item.category] || 0) + item.value;
    }
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  let finalCategories = [];
  if (sortedCategories.length > 5) {
      const top4 = sortedCategories.slice(0, 4);
      const othersValue = sortedCategories.slice(4).reduce((acc, curr) => acc + curr.value, 0);
      finalCategories = [...top4, { name: 'Outros', value: othersValue }];
  } else {
      finalCategories = sortedCategories;
  }

  // Helper para Tipo de Doc
  const getDocType = (item) => {
      if (!item.receiptNumber) return 'DOC';
      return item.receiptNumber.length > 20 ? 'NFCe' : 'NF';
  };

  return (
    <div 
        ref={ref} 
        className="bg-white w-[210mm] min-h-[297mm] p-[5mm] mx-auto text-slate-800 font-sans relative"
        // Garante que as cores de fundo sejam impressas
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      
      {/* CABEÇALHO */}
      <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
        <div className="flex flex-col gap-2">
           {company?.logoUrl ? (
             <img src={company.logoUrl} alt="Logo" className="h-14 w-auto object-contain object-left" />
           ) : (
             <h1 className="text-xl font-black text-slate-900 uppercase">{company?.name || 'EMPRESA'}</h1>
           )}
           <div>
             <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">{company?.name || 'Relatório Corporativo'}</h2>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {isSubstituteReport ? 'Relatório de Despesas Substitutas' : 'Relatório de Reembolso de Despesas'}
             </p>
           </div>
        </div>
        <div className="text-right">
          <div className="bg-white border border-red-100 rounded-lg px-3 py-1.5 shadow-sm mb-1 inline-block">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">ID Relatório</span>
            <span className="text-lg font-black font-mono text-red-600">{report.reportId || report.id}</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Enviado em: <b>{reportDate}</b></p>
        </div>
      </div>

      {/* --- GRID DE 3 CARTÕES --- */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        
        {/* CARD 1: Colaborador & Data & Centro de Custo */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col justify-between shadow-sm">
            <div className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-8">
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <User size={10} /> Colaborador
                    </h3>
                    <p className="text-sm font-bold text-slate-800 truncate">{owner.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{owner.email}</p>
                </div>
                <div className="col-span-4 text-right">
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1 justify-end">
                        <Calendar size={10} /> Data
                    </h3>
                    <p className="text-sm font-bold text-slate-800">{reportDate}</p>
                </div>
            </div>
            <div className="border-t border-slate-200 pt-2 w-full">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Building size={10} /> Centro de Custo
                </h3>
                <p className="text-xs font-bold text-slate-700 w-full truncate" title={report.costCenter}>
                    {report.costCenter || 'Geral'}
                </p>
            </div>
        </div>

        {/* CARD 2: Top Categorias */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col shadow-sm">
            <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                <LayoutList size={10} /> Top Categorias
            </h3>
            <div className="flex-1 flex flex-col justify-center space-y-1">
                {finalCategories.map((cat, i) => (
                    <div key={cat.name} className="flex justify-between items-center text-[9px] w-full">
                        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.name === 'Outros' ? '#94a3b8' : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}></div>
                            <span className="truncate font-medium text-slate-600 block w-full">{cat.name}</span>
                        </div>
                        <span className="font-bold text-slate-700 shrink-0">{formatToBRL(cat.value)}</span>
                    </div>
                ))}
                {finalCategories.length === 0 && <p className="text-[9px] text-slate-400 italic text-center">Sem dados</p>}
            </div>
        </div>

        {/* CARD 3: Resumo Financeiro */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between shadow-sm">
          <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Coins size={10} /> Resumo Financeiro
          </h3>
          <div>
            {isSubstituteReport ? (
                <>
                    <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[9px] text-stone-600 font-bold flex gap-1 items-center">
                            <AlertTriangle size={8}/> Real
                        </span>
                        <span className="text-[9px] font-bold text-stone-600">{formatToBRL(totalReal)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                         <span className="text-[9px] text-indigo-900 font-bold flex gap-1 items-center">
                            <RefreshCw size={8}/> Subst.
                         </span>
                         <span className="text-[9px] font-bold text-indigo-900">{formatToBRL(totalSub)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-[9px] font-black text-slate-800 uppercase">A PAGAR</span>
                        <span className="text-lg font-black text-slate-900">{formatToBRL(finalTotalToPay)}</span>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex justify-between items-end border-b border-slate-200 pb-2 mb-2 mt-2">
                        <span className="text-[9px] text-slate-500">Total Bruto</span>
                        <span className="text-[9px] text-slate-400 line-through decoration-red-300"></span> 
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-800 uppercase">A PAGAR</span>
                        <span className="text-lg font-black text-slate-900">{formatToBRL(finalTotalToPay)}</span>
                    </div>
                </>
            )}
          </div>
        </div>

      </div>

      {/* --- TABELAS DE DESPESAS --- */}
      {!isSubstituteReport ? (
          <div className="mb-10">
            <h3 className="text-[10px] font-bold text-slate-700 mb-2 uppercase tracking-wide">DESPESAS À REEMBOLSAR</h3>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
               <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-500 font-bold uppercase border-b border-slate-200">
                     <tr>
                        <th className="p-2 w-20">Data</th>
                        <th className="p-2 w-40">Categoria</th> 
                        <th className="p-2 w-36">Fornecedor / Doc</th> 
                        <th className="p-2 w-28">Nº Doc</th>
                        <th className="p-2">Descrição</th>
                        <th className="p-2 text-right w-24">Valor</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                     {sortItems(standardItems).map((item) => (
                        <tr key={item.id} className={item.adminStatus === 'rejected' ? 'bg-red-50 text-slate-400' : ''}>
                           <td className="p-2 font-medium align-top">{formatDateSafe(item.date)}</td>
                           <td className="p-2 align-top">
                             <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded border border-slate-200 text-[9px] font-bold block w-fit">
                                 {item.category}
                             </span>
                           </td>
                           <td className="p-2 align-top">
                             <div className="flex flex-col">
                                <span className="text-[8px] font-bold text-slate-700 uppercase leading-tight truncate max-w-[140px]" title={item.supplierName}>
                                    {item.supplierName || ''}
                                </span>
                                <span className="text-[9px] text-slate-500 font-mono leading-tight">
                                    {formatDocument(item.supplierDocument)}
                                </span>
                             </div>
                           </td>
                           <td className="p-2 align-top">
                                <div className="flex items-center gap-1.5">
                                    {item.receiptNumber && <span className="text-[8px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded">{getDocType(item)}</span>}
                                    <span className="text-slate-700 font-mono text-[10px] font-bold">{item.receiptNumber || '-'}</span>
                                </div>
                           </td>
                           <td className="p-2 font-medium text-slate-800 align-top text-[10px]">{item.description}</td>
                           <td className={`p-2 text-right font-bold align-top ${item.adminStatus === 'rejected' ? 'line-through' : 'text-slate-700'}`}>
                             {formatToBRL(item.value)}
                           </td>
                        </tr>
                     ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-700 border-t border-slate-200">
                     <tr>
                        <td colSpan="5" className="p-2 text-right text-[9px] uppercase text-slate-400">TOTAL</td>
                        <td className="p-2 text-right text-base">{formatToBRL(finalTotalToPay)}</td>
                     </tr>
                  </tfoot>
               </table>
            </div>
          </div>
      ) : (
          /* SUBSTITUTA */
          <>
            {realExpenses.length > 0 && (
                <div className="mb-6 break-inside-avoid">
                    <h3 className="text-[10px] font-black text-stone-600 mb-1 uppercase tracking-wide border-l-4 border-stone-400 pl-2">
                        1. Despesas Reais (Sem Nota Fiscal)
                    </h3>
                    <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-stone-50 text-stone-700 font-bold uppercase border-b border-stone-200">
                            <tr>
                                <th className="p-2 w-20">Data</th>
                                <th className="p-2">Descrição / Motivo</th>
                                <th className="p-2 w-24 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 bg-white">
                            {sortItems(realExpenses).map((item) => (
                                <tr key={item.id}>
                                    <td className="p-2 font-medium text-stone-600">{formatDateSafe(item.date)}</td>
                                    <td className="p-2">
                                        <div className="font-bold text-stone-800">{item.description}</div>
                                        <div className="text-[9px] text-stone-500 italic">Original sem comprovante fiscal</div>
                                    </td>
                                    <td className="p-2 text-right font-bold text-stone-700">{formatToBRL(item.value)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-stone-50 font-bold text-stone-800 border-t border-stone-200">
                            <tr>
                                <td colSpan="2" className="p-2 text-right text-[9px] uppercase">TOTAL REAL</td>
                                <td className="p-2 text-right">{formatToBRL(totalReal)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    </div>
                </div>
            )}

            <div className="mb-10 break-inside-avoid">
                <h3 className="text-[10px] font-black text-slate-800 mb-1 uppercase tracking-wide border-l-4 border-indigo-900 pl-2">
                    2. Despesas Substitutas (Válidas para Reembolso)
                </h3>
                <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-800 font-bold uppercase border-b border-slate-300">
                        <tr>
                            <th className="p-2 w-20">Data</th>
                            <th className="p-2 w-40">Categoria</th>
                            <th className="p-2 w-28">Nº Doc / Tipo</th>
                            <th className="p-2">Descrição</th>
                            <th className="p-2 w-24 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {sortItems(subExpenses).map((item) => (
                            <tr key={item.id}>
                                <td className="p-2 font-medium text-slate-700">{formatDateSafe(item.date)}</td>
                                <td className="p-2">
                                    <span className="bg-white border border-slate-300 px-2 py-0.5 rounded text-[9px] text-slate-700 font-bold block w-fit">
                                        {item.category}
                                    </span>
                                </td>
                                <td className="p-2">
                                    <div className="flex items-center gap-1.5">
                                        {item.receiptNumber && <span className="text-[8px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1 rounded">{getDocType(item)}</span>}
                                        <span className="text-slate-700 font-mono text-[10px] font-bold">{item.receiptNumber || 'S/N'}</span>
                                    </div>
                                </td>
                                <td className="p-2 font-medium text-slate-900">{item.description}</td>
                                <td className="p-2 text-right font-bold text-slate-900">{formatToBRL(item.value)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-slate-900 border-t border-slate-300">
                        <tr>
                            <td colSpan="4" className="p-2 text-right text-[9px] uppercase">TOTAL A PAGAR</td>
                            <td className="p-2 text-right text-base">{formatToBRL(totalSub)}</td>
                        </tr>
                    </tfoot>
                </table>
                </div>
            </div>
          </>
      )}

      {/* ASSINATURAS */}
      <div className="mt-8 pt-4 grid grid-cols-2 gap-10 page-break-inside-avoid mb-8">
         <div className="text-center">
            <div className="border-b border-slate-300 mb-1 mx-4"></div>
            <p className="text-xs font-bold text-slate-800">{owner.name}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Assinatura do Colaborador</p>
         </div>
         <div className="text-center">
            <div className="border-b border-slate-300 mb-1 mx-4"></div>
            <p className="text-xs font-bold text-slate-800">Aprovação</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-wider">Gestor / Financeiro</p>
         </div>
      </div>

      {/* ANEXOS (CORRIGIDO PARA MÚLTIPLAS PÁGINAS) */}
      {validItems.some(i => preloadedImages && (preloadedImages[i.id] || i.attachmentUrl)) && (
        <div className="border-t-2 border-dashed border-slate-200 pt-4">
            {sortItems(validItems).map((item, idx) => {
                // Tenta pegar o array de imagens pré-carregadas
                const imagesList = preloadedImages ? preloadedImages[item.id] : null;
                
                // Se não tiver imagens carregadas (e nem URL), pula
                if (!imagesList && !item.attachmentUrl) return null;

                // Garante que imagesList seja um array (mesmo que seja só a URL direta)
                const pagesToRender = Array.isArray(imagesList) 
                    ? imagesList 
                    : (item.attachmentUrl ? [item.attachmentUrl] : []);

                if (pagesToRender.length === 0) return null;

                return (
                    <div key={item.id} className="break-before-page flex flex-col items-center justify-start pt-0 break-inside-avoid">
                        {/* Header do Anexo */}
                        <div className="w-full mb-1 rounded-lg border border-slate-200 overflow-hidden shadow-sm font-sans shrink-0">
                            <div className="bg-slate-100 px-2 py-1 border-b border-slate-200">
                                <h4 className="text-[10px] font-bold text-slate-700">
                                  Anexo #{idx + 1} - {item.category || 'Despesa'} {item.substituteType === 'Substituta' ? '(Substituta)' : ''}
                                </h4>
                            </div>

                            <div className="p-2 bg-slate-50 grid grid-cols-12">
                                <div className="col-span-7 border-r border-slate-300 pr-2 flex flex-col justify-center">
                                    <span className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">FORNECEDOR</span>
                                    <span className="text-[10px] font-black text-slate-800 leading-tight truncate" title={item.supplierName}>
                                        {item.supplierName || 'N/A'}
                                    </span>
                                    <span className="text-[9px] text-slate-500 leading-tight font-medium mt-0.5">
                                        {formatDocument(item.supplierDocument)}
                                    </span>
                                </div>

                                <div className="col-span-5 flex justify-between items-center pl-2">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">Nº DOC</span>
                                        <div className="flex items-center gap-1">
                                            {item.receiptNumber && <span className="text-[7px] font-bold text-slate-500 bg-slate-100 px-1 rounded border border-slate-200">{getDocType(item)}</span>}
                                            <span className="text-[10px] font-bold text-slate-800 leading-tight">{item.receiptNumber || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] text-slate-400 font-bold uppercase leading-none mb-0.5">VALOR</span>
                                        <span className="text-[10px] font-black text-slate-800 leading-tight">{formatToBRL(item.value)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* LOOP PELAS PÁGINAS DO ANEXO */}
                        {pagesToRender.map((imgSrc, pageIndex) => (
                            <div key={pageIndex} className="w-full flex-1 flex items-start justify-center overflow-hidden bg-white rounded-lg border border-slate-100 mb-1">
                                <img 
                                    src={imgSrc} 
                                    alt={`Comprovante - Página ${pageIndex + 1}`} 
                                    className="w-full h-auto max-h-[200mm] object-contain"
                                />
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
});

export default ReportToPrint;