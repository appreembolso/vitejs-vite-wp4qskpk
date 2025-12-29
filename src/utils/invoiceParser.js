import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + ' ';
    }
    return fullText;
  } catch (error) {
    console.error("Erro ao ler PDF:", error);
    return '';
  }
};

export const parseInvoiceData = async (file) => {
  if (file.type !== 'application/pdf') return null;
  
  const rawText = await extractTextFromPDF(file);
  const cleanText = rawText.replace(/\s+/g, ' ');
  
  if (!cleanText) return null;

  const data = {
    date: '',
    value: '',
    valueRaw: '',
    supplierName: '',
    supplierDocument: '',
    receiptNumber: '',
    description: '',
    receiptType: 'NF'
  };

  // Identificação de NFC-e / Cupom / Consulta DF-e
  const isNFCe = cleanText.includes('NFC') || 
                 cleanText.includes('Cupom') || 
                 cleanText.includes('Consumidor') || 
                 cleanText.includes('VALOR PAGO');

  if (isNFCe) {
    data.receiptType = 'NFCE';

    // 1. CNPJ
    const cnpjMatch = cleanText.match(/CNPJ:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
    if (cnpjMatch) data.supplierDocument = cnpjMatch[1];

    // 2. Razão Social (Mantendo a lógica de limpeza que você aprovou)
    let possibleName = cleanText.split(/CNPJ/i)[0].trim();
    possibleName = possibleName.replace(/DATA\/HORA.*?\d{2}:\d{2}:\d{2}/gi, '');
    possibleName = possibleName.replace(/VALOR PAGO.*?[\d,.]+/gi, '');
    possibleName = possibleName.replace(/[\d,]{4,}/g, '');
    const nameParts = possibleName.split(/\s{2,}/);
    data.supplierName = nameParts[nameParts.length - 1].trim().toUpperCase();

    // 3. Valor Total (NFC-e)
    const totalMatch = cleanText.match(/VALOR PAGO R\$:\s*([\d\.,]+)/i) || 
                       cleanText.match(/VALOR A PAGAR R\$:\s*([\d\.,]+)/i) ||
                       cleanText.match(/TOTAL R\$:\s*([\d\.,]+)/i);
    
    if (totalMatch) {
      const valStr = totalMatch[1].replace(/\./g, '').replace(',', '.');
      data.valueRaw = valStr;
      data.value = (parseFloat(valStr) * 100).toFixed(0);
    }

    // 4. Número e Data
    const numMatch = cleanText.match(/(?:Número|Extrato\s+Nº|nº)\s*[:\s]*(\d+)/i);
    if (numMatch) data.receiptNumber = numMatch[1];

    const dateMatch = cleanText.match(/(?:Emissão|Data)\s*[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
      const [dia, mes, ano] = dateMatch[1].split('/');
      data.date = `${ano}-${mes}-${dia}`;
    }

    // 5. Descrição (Tenta pegar o primeiro item, senão usa o padrão)
    const itemMatch = cleanText.match(/([A-Z\s]{5,})\s+Qtde\.:/i);
    data.description = itemMatch ? itemMatch[1].trim().substring(0, 70) : `Despesa em ${data.supplierName}`;

  } else {
    // === LÓGICA RESTAURADA PARA NFS-e (MODELO PREFEITURA/MEI) ===
    data.receiptType = 'NF';

    // 1. Número da NFS-e
    const numMatch = cleanText.match(/Número\s+da\s+NFS-e\s+(\d+)/i);
    if (numMatch) data.receiptNumber = numMatch[1];

    // 2. Data de Emissão
    const dateMatch = cleanText.match(/emissão\s+da\s+NFS-e\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (dateMatch) {
      const [dia, mes, ano] = dateMatch[1].split('/');
      data.date = `${ano}-${mes}-${dia}`;
    }

    // 3. CNPJ do Emitente
    const cnpjMatch = cleanText.match(/CNPJ\s*\/\s*CPF\s*\/\s*NIF\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i);
    if (cnpjMatch) data.supplierDocument = cnpjMatch[1];

    // 4. Razão Social
    const nameMatch = cleanText.match(/Nome\s*\/\s*Nome\s*Empresarial\s+(.*?)\s+E-mail/i);
    if (nameMatch) data.supplierName = nameMatch[1].trim().toUpperCase();

    // 5. DESCRIÇÃO DO SERVIÇO (Restaurado para pegar o texto longo)
    const descMatch = cleanText.match(/Descrição\s+do\s+Serviço\s+(.*?)\s+Dados\s+bancários/i);
    if (descMatch) {
      const rawDesc = descMatch[1].trim();
      data.description = rawDesc.length > 100 ? rawDesc.substring(0, 97) + "..." : rawDesc;
    }

    // 6. Valor Líquido
    const valueMatch = cleanText.match(/Valor\s+Líquido\s+da\s+NFS-e\s+R\$\s+([\d\.,]+)/i);
    if (valueMatch) {
      const valStr = valueMatch[1].replace(/\./g, '').replace(',', '.');
      data.valueRaw = valStr;
      data.value = (parseFloat(valStr) * 100).toFixed(0);
    }
  }

  return data;
};