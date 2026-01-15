// =====================================================
// Serviço de Exportação PDF/Excel
// v1.5.0 - Altura das linhas para endereços de 2 linhas
// Este arquivo é excluído da cobertura de testes devido
// à complexidade de mocking de PDFKit e streams.
// =====================================================

const PDFDocument = require('pdfkit');
const { format } = require('date-fns');
const https = require('https');
const http = require('http');

/**
 * Baixa uma imagem de uma URL e retorna como Buffer
 */
const fetchImage = (url) => {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, (response) => {
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
};

/**
 * Desenha o logo Bureau IT em formato vetorial
 */
const drawBureauLogo = (doc, x, y, scale = 0.12) => {
    doc.save();
    doc.translate(x, y);
    doc.scale(scale);

    // Seta (cinza)
    doc.fillColor('#6B7280');
    doc.path('M 16.59 44.68 L 16.59 87.58 L 28.69 71.86 L 45.68 71.86 Z').fill();

    // Letra t (dourado)
    doc.fillColor('#D4A017');
    doc.path('M 67.86 72.32 Q 62.86 72.32 60.31 69.99 C 58.59 68.44 57.73 66.04 57.73 62.77 L 57.73 53.57 L 54.59 53.57 L 54.59 45 L 57.73 45 L 57.73 38.29 L 68.89 38.29 L 68.89 45 L 75.06 45 L 75.06 53.57 L 68.89 53.57 L 68.89 60.29 C 68.89 61.09 69.12 61.69 69.58 62.41 C 70.04 62.72 70.58 62.90 71.58 62.90 C 72.58 62.90 74.00 62.23 75 62.23 L 75 70.8 C 74 71.3 73.18 71.5 71.82 71.9 C 70.46 72.22 69.16 72.32 67.86 72.32 Z').fill();

    // Ponto do i (dourado)
    doc.rect(41.13, 36.23, 11.16, 6.86).fill();

    // Corpo do i (dourado)
    doc.path('M 41.13 45 L 41.13 64.03 L 49.44 71.73 L 52.29 71.73 L 52.29 45 Z').fill();

    // Underline _ (dourado)
    doc.rect(78.18, 73.48, 29, 5.58).fill();

    doc.restore();
};

/**
 * Exporta lista de pedidos filtrados para PDF
 */
async function exportarPedidosPDF(res, { pedidos, totais, itensPorPedido, mes, ano, nomeVendedor }) {
    const logoUrl = 'https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-pdf.png';

    let logoBuffer = null;
    try {
        logoBuffer = await fetchImage(logoUrl);
    } catch (e) {
        console.log('Não foi possível carregar logo:', e.message);
    }

    // Criar PDF com bufferPages para paginação
    const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
        autoFirstPage: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pedidos-quatrelati-${ano || 'todos'}-${mes || 'todos'}.pdf`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const footerY = pageHeight - 35;
    const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm');

    // ===== CABEÇALHO =====
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, margin, 12, { height: 50 });
        } catch (e) {
            doc.fillColor('#124EA6').fontSize(18).font('Helvetica-Bold');
            doc.text('QUATRELATI', margin, 25, { lineBreak: false });
        }
    } else {
        doc.fillColor('#124EA6').fontSize(18).font('Helvetica-Bold');
        doc.text('QUATRELATI', margin, 25, { lineBreak: false });
    }

    // Título e período à direita
    doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold');
    doc.text('Relatório de Pedidos', pageWidth - margin - 210, 15, { width: 210, align: 'right', lineBreak: false });

    let periodoTexto = 'Todos os pedidos';
    if (mes && ano) {
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        periodoTexto = `${meses[parseInt(mes) - 1]} de ${ano}`;
    } else if (ano) {
        periodoTexto = `Ano ${ano}`;
    }
    doc.fillColor('#6B7280').fontSize(10).font('Helvetica');
    doc.text(periodoTexto, pageWidth - margin - 210, 33, { width: 210, align: 'right', lineBreak: false });

    // Indicar se é lista geral ou de vendedor
    const tipoLista = nomeVendedor ? `Vendedor: ${nomeVendedor}` : 'Lista Geral';
    doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold');
    doc.text(tipoLista, pageWidth - margin - 210, 47, { width: 210, align: 'right', lineBreak: false });

    // Linha separadora
    doc.moveTo(margin, 72).lineTo(pageWidth - margin, 72).strokeColor('#D1D5DB').lineWidth(0.5).stroke();

    // ===== BLOCOS DE RESUMO =====
    let currentY = 82;
    const blockWidth = (pageWidth - margin * 2 - 20) / 2;

    // Bloco A ENTREGAR
    doc.rect(margin, currentY, blockWidth, 32).fillAndStroke('#FFFBEB', '#F59E0B');
    doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(9);
    doc.text('A ENTREGAR', margin + 10, currentY + 6, { lineBreak: false });
    doc.fillColor('#78350F').font('Helvetica').fontSize(8);
    doc.text(`${totais.pedidos_pendentes} pedidos  |  ${parseFloat(totais.peso_pendente).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg  |  ${parseInt(totais.unidades_pendente).toLocaleString('pt-BR')} cx`, margin + 10, currentY + 18, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(parseFloat(totais.valor_pendente).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), margin + blockWidth - 100, currentY + 12, { width: 90, align: 'right', lineBreak: false });

    // Bloco ENTREGUE
    const entregueX = margin + blockWidth + 20;
    doc.rect(entregueX, currentY, blockWidth, 32).fillAndStroke('#F0FDF4', '#22C55E');
    doc.fillColor('#166534').font('Helvetica-Bold').fontSize(9);
    doc.text('ENTREGUE', entregueX + 10, currentY + 6, { lineBreak: false });
    doc.fillColor('#14532D').font('Helvetica').fontSize(8);
    doc.text(`${totais.pedidos_entregues} pedidos  |  ${parseFloat(totais.peso_entregue).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg  |  ${parseInt(totais.unidades_entregue).toLocaleString('pt-BR')} cx`, entregueX + 10, currentY + 18, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text(parseFloat(totais.valor_entregue).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), entregueX + blockWidth - 100, currentY + 12, { width: 90, align: 'right', lineBreak: false });

    currentY += 50;

    // ===== TABELA =====
    const headers = ['Pedido', 'Data', 'Cliente', 'N.F.', 'Peso', 'Cx', 'R$ Unit.', 'Total', 'Entrega', 'Status'];
    const tableWidth = pageWidth - margin * 2;
    const colWidths = [58, 58, 200, 55, 68, 42, 62, 90, 62, 67];
    const colAligns = ['left', 'center', 'left', 'center', 'right', 'right', 'right', 'right', 'center', 'center'];
    const startX = margin;
    const rowHeight = 22;

    // Função para desenhar cabeçalho da tabela
    const drawTableHeader = (y) => {
        doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8);
        let xPos = startX;
        headers.forEach((header, i) => {
            doc.text(header, xPos + 4, y + 4, { width: colWidths[i] - 8, align: colAligns[i], lineBreak: false });
            xPos += colWidths[i];
        });
        doc.moveTo(startX, y + 18).lineTo(startX + tableWidth, y + 18).strokeColor('#374151').lineWidth(1).stroke();
        return y + 22;
    };

    currentY = drawTableHeader(currentY);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    pedidos.forEach((pedido) => {
        // Verificar se precisa nova página
        if (currentY + rowHeight > pageHeight - 50) {
            doc.addPage();
            currentY = drawTableHeader(40);
        }

        const dataEntregaObj = pedido.data_entrega ? new Date(pedido.data_entrega) : null;
        const estaAtrasado = dataEntregaObj && !pedido.entregue && dataEntregaObj < hoje;

        if (pedido.entregue) {
            doc.rect(startX, currentY, tableWidth, rowHeight).fill('#FEF9C3');
            doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
        }

        doc.moveTo(startX, currentY + rowHeight).lineTo(startX + tableWidth, currentY + rowHeight).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

        const dataPedido = pedido.data_pedido ? format(new Date(pedido.data_pedido), 'dd/MM/yy') : '-';
        const dataEntrega = pedido.data_entrega ? format(new Date(pedido.data_entrega), 'dd/MM/yy') : '-';

        const valores = [
            `#${pedido.numero_pedido || ''}`,
            dataPedido,
            (pedido.cliente_nome || '').substring(0, 32),
            pedido.nf || '-',
            parseFloat(pedido.peso_kg || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' kg',
            String(pedido.quantidade_caixas || 0),
            parseFloat(pedido.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
            parseFloat(pedido.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            dataEntrega,
            pedido.entregue ? 'Entregue' : 'Pendente'
        ];

        let xPos = startX;
        valores.forEach((valor, i) => {
            if (i === 8 && estaAtrasado) {
                doc.fillColor('#DC2626');
            } else if (i === 9) {
                doc.fillColor(pedido.entregue ? '#166534' : '#92400E');
            } else if (i === 0) {
                doc.fillColor('#1D4ED8');
            } else if (i === 7) {
                doc.fillColor('#1F2937');
            } else {
                doc.fillColor('#4B5563');
            }

            if (i === 0 || i === 2 || i === 7 || i === 9 || (i === 8 && estaAtrasado)) {
                doc.font('Helvetica-Bold').fontSize(8);
            } else {
                doc.font('Helvetica').fontSize(8);
            }

            doc.text(String(valor), xPos + 4, currentY + 6, { width: colWidths[i] - 8, align: colAligns[i], lineBreak: false });
            xPos += colWidths[i];
        });

        currentY += rowHeight;
    });

    // ===== TOTAIS GERAIS =====
    const totalGeral = parseFloat(totais.valor_pendente) + parseFloat(totais.valor_entregue);
    const pesoGeral = parseFloat(totais.peso_pendente) + parseFloat(totais.peso_entregue);
    const caixasGeral = parseInt(totais.unidades_pendente) + parseInt(totais.unidades_entregue);
    const pedidosGeral = parseInt(totais.pedidos_pendentes) + parseInt(totais.pedidos_entregues);

    if (currentY + 30 > pageHeight - 60) {
        doc.addPage();
        currentY = 40;
    }

    doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).strokeColor('#374151').lineWidth(1).stroke();

    currentY += 4;
    doc.rect(startX, currentY, tableWidth, 24).fill('#1F2937');

    const col0 = startX;
    const col4 = startX + 58 + 58 + 200 + 55;
    const col5 = col4 + 68;
    const col7 = col5 + 42 + 62;

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text(`${pedidosGeral} Pedidos`, col0 + 4, currentY + 7);
    doc.text(`${pesoGeral.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`, col4, currentY + 7, { width: 68, align: 'right' });
    doc.text(`${caixasGeral.toLocaleString('pt-BR')} Cx`, col5, currentY + 7, { width: 50, align: 'right' });
    doc.fontSize(10);
    doc.text(totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), col7, currentY + 6, { width: 90, align: 'right' });

    currentY += 28;

    // ===== RODAPÉ EM TODAS AS PÁGINAS =====
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        doc.moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

        doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7);
        doc.text('Desenvolvido por', margin, footerY + 2, { continued: false, lineBreak: false });
        drawBureauLogo(doc, margin + 68, footerY - 3, 0.18);

        doc.fillColor('#6B7280').fontSize(8);
        const paginacaoTexto = `Página ${i + 1} de ${totalPages}`;
        const paginacaoWidth = doc.widthOfString(paginacaoTexto);
        doc.text(paginacaoTexto, (pageWidth - paginacaoWidth) / 2, footerY + 2, { continued: false, lineBreak: false });

        const dataTexto = `Quatrelati - ${dataGeracao}`;
        const dataWidth = doc.widthOfString(dataTexto);
        doc.text(dataTexto, pageWidth - margin - dataWidth, footerY + 2, { continued: false, lineBreak: false });
    }

    doc.end();
}

/**
 * Exporta pedidos para Excel
 */
async function exportarPedidosExcel(res, { pedidos, mes, ano }) {
    const ExcelJS = require('exceljs');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Quatrelati ERP';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Pedidos', {
        properties: { tabColor: { argb: '1E3A8A' } }
    });

    worksheet.columns = [
        { header: 'N. Pedido', key: 'numero_pedido', width: 12 },
        { header: 'Data Pedido', key: 'data_pedido', width: 12 },
        { header: 'Data Entrega', key: 'data_entrega', width: 12 },
        { header: 'Cliente', key: 'cliente_nome', width: 30 },
        { header: 'Cidade', key: 'cliente_cidade', width: 15 },
        { header: 'UF', key: 'cliente_estado', width: 5 },
        { header: 'Vendedor', key: 'vendedor_nome', width: 20 },
        { header: 'Produto', key: 'produto_nome', width: 25 },
        { header: 'Caixas', key: 'quantidade_caixas', width: 10 },
        { header: 'Peso (kg)', key: 'peso_total', width: 12 },
        { header: 'Preco Unit.', key: 'preco_unitario', width: 12 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'NF', key: 'nf', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E3A8A' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    pedidos.forEach(row => {
        const pesoTotal = (row.quantidade_caixas || 0) * (row.peso_caixa_kg || 0);
        const total = (row.quantidade_caixas || 0) * (row.preco_unitario || 0);

        worksheet.addRow({
            numero_pedido: row.numero_pedido,
            data_pedido: row.data_pedido ? format(new Date(row.data_pedido), 'dd/MM/yyyy') : '',
            data_entrega: row.data_entrega ? format(new Date(row.data_entrega), 'dd/MM/yyyy') : '',
            cliente_nome: row.cliente_nome,
            cliente_cidade: row.cliente_cidade,
            cliente_estado: row.cliente_estado,
            vendedor_nome: row.vendedor_nome || '-',
            produto_nome: row.produto_nome,
            quantidade_caixas: row.quantidade_caixas,
            peso_total: pesoTotal.toFixed(2),
            preco_unitario: row.preco_unitario,
            total: total.toFixed(2),
            nf: row.nf || '-',
            status: row.entregue ? 'Entregue' : 'Pendente'
        });
    });

    worksheet.getColumn('preco_unitario').numFmt = 'R$ #,##0.00';
    worksheet.getColumn('total').numFmt = 'R$ #,##0.00';

    const lastRow = worksheet.rowCount + 1;
    worksheet.addRow({});
    const totalRow = worksheet.addRow({
        numero_pedido: 'TOTAIS',
        quantidade_caixas: { formula: `SUM(I2:I${lastRow - 1})` },
        peso_total: { formula: `SUM(J2:J${lastRow - 1})` },
        total: { formula: `SUM(L2:L${lastRow - 1})` }
    });
    totalRow.font = { bold: true };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=pedidos-quatrelati-${ano || 'todos'}-${mes || 'todos'}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
}

/**
 * Exporta um pedido individual para PDF
 */
async function exportarPedidoIndividualPDF(res, { pedido, itens }) {
    const logoUrl = 'https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-azul.png';

    let logoBuffer = null;
    try {
        logoBuffer = await fetchImage(logoUrl);
    } catch (e) {
        console.log('Não foi possível carregar logo Quatrelati:', e.message);
    }

    const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'portrait'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pedido-${pedido.numero_pedido}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    // ==================== NÚMERO DO PEDIDO ====================
    let currentY = margin;

    const pedidoBoxWidth = 120;
    const pedidoBoxHeight = 50;
    const pedidoBoxX = pageWidth - margin - pedidoBoxWidth;
    doc.rect(pedidoBoxX, currentY, pedidoBoxWidth, pedidoBoxHeight).fill('#FFE500');
    doc.rect(pedidoBoxX, currentY, pedidoBoxWidth, pedidoBoxHeight).stroke('#E5B800');
    doc.fillColor('#92400E').fontSize(9).font('Helvetica-Bold');
    doc.text('PEDIDO Nº', pedidoBoxX, currentY + 10, { width: pedidoBoxWidth, align: 'center' });
    doc.fillColor('#1F2937').fontSize(20).font('Helvetica-Bold');
    doc.text(`#${pedido.numero_pedido}`, pedidoBoxX, currentY + 24, { width: pedidoBoxWidth, align: 'center' });

    // ==================== HEADER DA EMPRESA ====================
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, margin, currentY, { height: 50 });
        } catch (e) {
            doc.fillColor('#124EA6').fontSize(20).font('Helvetica-Bold');
            doc.text('QUATRELATI', margin, currentY + 15);
        }
    } else {
        doc.fillColor('#124EA6').fontSize(20).font('Helvetica-Bold');
        doc.text('QUATRELATI', margin, currentY + 15);
    }

    const empresaX = margin + 115;
    doc.fillColor('#333333').fontSize(10).font('Helvetica-Bold');
    doc.text('QUATRELATI ALIMENTOS LTDA', empresaX, currentY);
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    doc.text('RUA LUIZ PIMENTEL MATOS, 75 - Itapeva/SP - 18410-630', empresaX, currentY + 12);
    doc.text('(11) 98944-1945 - www.quatrelatimanteiga.com.br', empresaX, currentY + 22);
    doc.font('Helvetica-Bold').fillColor('#333333').fontSize(8);
    doc.text('CNPJ: 11.391.594/0001-25    IE: 372.247.938.116', empresaX, currentY + 34);

    currentY += 65;

    // ==================== TÍTULO ====================
    doc.fillColor('#124EA6').fontSize(24).font('Helvetica-Bold');
    doc.text('Pedido de Vendas', margin, currentY, { width: contentWidth, align: 'center' });

    currentY += 40;

    // ==================== LINHA REPRESENTANTE / EMISSÃO ====================
    const infoRowHeight = 24;
    doc.rect(margin, currentY, contentWidth, infoRowHeight).fill('#F1F5F9');

    doc.fillColor('#64748B').fontSize(8).font('Helvetica');
    doc.text('Representante:', margin + 12, currentY + 8);
    doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(9);
    doc.text(pedido.vendedor_nome || '-', margin + 85, currentY + 7);

    doc.fillColor('#64748B').fontSize(8).font('Helvetica');
    doc.text('Emissão:', pageWidth - margin - 100, currentY + 8);
    doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(9);
    doc.text(format(new Date(pedido.data_pedido), 'dd/MM/yyyy'), pageWidth - margin - 55, currentY + 7);

    currentY += infoRowHeight + 10;

    // ==================== DADOS DO CLIENTE ====================
    const clienteBoxHeight = 85;
    doc.rect(margin, currentY, contentWidth, clienteBoxHeight).stroke('#CCCCCC');

    const labelX = margin + 5;
    const valueX = margin + 75;
    doc.fillColor('#666666').fontSize(8).font('Helvetica');

    doc.text('Cliente:', labelX, currentY + 8);
    doc.fillColor('#333333').font('Helvetica-Bold').fontSize(9);
    const nomeCliente = pedido.cliente_razao_social || pedido.cliente_nome || '-';
    doc.text(nomeCliente, valueX, currentY + 8);

    doc.fillColor('#666666').font('Helvetica').fontSize(8);
    doc.text('Endereço:', labelX, currentY + 22);
    doc.fillColor('#333333').fontSize(8);
    const endereco = pedido.cliente_endereco_entrega || pedido.cliente_endereco || '-';
    doc.text(endereco, valueX, currentY + 22, { width: 250 });

    doc.fillColor('#666666');
    doc.text('Município/U.F.:', labelX, currentY + 36);
    doc.fillColor('#333333');
    const municipio = `${pedido.cliente_cidade || '-'} - ${pedido.cliente_estado || ''} ${pedido.cliente_cep ? `CEP ${pedido.cliente_cep}` : ''}`;
    doc.text(municipio, valueX, currentY + 36);

    doc.fillColor('#666666');
    doc.text('Telefone:', labelX, currentY + 50);
    doc.fillColor('#333333');
    doc.text(pedido.cliente_telefone || '-', valueX, currentY + 50);

    doc.fillColor('#666666');
    doc.text('Contato:', labelX, currentY + 64);
    doc.fillColor('#333333');
    doc.text(pedido.cliente_contato || '-', valueX, currentY + 64);

    const rightColX = pageWidth - margin - 180;
    doc.fillColor('#666666').font('Helvetica').fontSize(8);
    doc.text('CNPJ:', rightColX, currentY + 36);
    doc.fillColor('#333333');
    doc.text(pedido.cliente_cnpj || '-', rightColX + 35, currentY + 36);

    doc.fillColor('#666666');
    doc.text('IE:', rightColX, currentY + 50);
    doc.fillColor('#333333');
    doc.text('-', rightColX + 35, currentY + 50);

    doc.fillColor('#666666');
    doc.text('E-mail:', rightColX, currentY + 64);
    doc.fillColor('#333333');
    doc.text(pedido.cliente_email || '-', rightColX + 35, currentY + 64, { width: 140 });

    currentY += clienteBoxHeight + 10;

    // ==================== RESUMO DE QUANTIDADE ====================
    const resumoBoxWidth = (contentWidth - 15) / 2;
    const resumoBoxHeight = 35;

    doc.rect(margin, currentY, resumoBoxWidth, resumoBoxHeight).fill('#F8FAFC');
    doc.rect(margin, currentY, 4, resumoBoxHeight).fill('#124EA6');
    doc.fillColor('#64748B').fontSize(8).font('Helvetica');
    doc.text('QUANTIDADE', margin + 12, currentY + 8);
    doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(16);
    doc.text(`${parseInt(pedido.quantidade_caixas || 0)} CX`, margin + 12, currentY + 18);

    const pesoBoxX = margin + resumoBoxWidth + 15;
    doc.rect(pesoBoxX, currentY, resumoBoxWidth, resumoBoxHeight).fill('#F8FAFC');
    doc.rect(pesoBoxX, currentY, 4, resumoBoxHeight).fill('#124EA6');
    doc.fillColor('#64748B').fontSize(8).font('Helvetica');
    doc.text('PESO TOTAL', pesoBoxX + 12, currentY + 8);
    doc.fillColor('#1E293B').font('Helvetica-Bold').fontSize(16);
    doc.text(`${parseFloat(pedido.peso_kg || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`, pesoBoxX + 12, currentY + 18);

    currentY += resumoBoxHeight + 15;

    // ==================== TABELA DE ITENS ====================
    const tableX = margin;
    const colWidths = [35, contentWidth - 35 - 65 - 75 - 70 - 90, 65, 75, 70, 90];
    const tableWidth = contentWidth;
    const minRowHeight = 24;
    const headerHeight = 24;

    doc.rect(tableX, currentY, tableWidth, headerHeight).fill('#124EA6');
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

    let colX = tableX + 8;
    const headers = ['Item', 'Descrição do Produto', 'Qtd', 'Peso', 'R$/kg', 'Subtotal'];
    headers.forEach((header, i) => {
        const align = i > 1 ? 'center' : 'left';
        doc.text(header, colX, currentY + 8, { width: colWidths[i] - 12, align });
        colX += colWidths[i];
    });

    currentY += headerHeight;

    let tableEndY = currentY;
    for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        const produtoNome = item.produto_nome || '-';

        doc.fontSize(9).font('Helvetica-Bold');
        const produtoWidth = colWidths[1] - 12;
        const textHeight = doc.heightOfString(produtoNome, { width: produtoWidth });
        const rowHeight = Math.max(minRowHeight, textHeight + 14);

        const bgColor = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
        doc.rect(tableX, currentY, tableWidth, rowHeight).fill(bgColor);
        doc.rect(tableX, currentY, tableWidth, rowHeight).stroke('#E5E7EB');

        const textY = currentY + (rowHeight - textHeight) / 2;
        const singleLineY = currentY + (rowHeight - 9) / 2;

        colX = tableX + 8;
        doc.fillColor('#374151').fontSize(9).font('Helvetica');

        doc.fillColor('#64748B');
        doc.text(String(i + 1), colX, singleLineY);
        colX += colWidths[0];

        doc.fillColor('#1F2937').font('Helvetica-Bold');
        doc.text(produtoNome, colX, textY, { width: produtoWidth });
        colX += colWidths[1];

        doc.font('Helvetica').fillColor('#374151');
        doc.text(`${parseInt(item.quantidade_caixas || 0)} cx`, colX, singleLineY, { width: colWidths[2] - 12, align: 'center' });
        colX += colWidths[2];

        doc.text(`${parseFloat(item.peso_kg || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`, colX, singleLineY, { width: colWidths[3] - 12, align: 'center' });
        colX += colWidths[3];

        doc.text(`R$ ${parseFloat(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colX, singleLineY, { width: colWidths[4] - 12, align: 'right' });
        colX += colWidths[4];

        doc.font('Helvetica-Bold').fillColor('#124EA6');
        doc.text(`R$ ${parseFloat(item.subtotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, colX, singleLineY, { width: colWidths[5] - 12, align: 'right' });

        currentY += rowHeight;
        tableEndY = currentY;
    }

    currentY = tableEndY + 10;

    // ==================== LINHA DE TOTAL ====================
    const totalRowHeight = 35;
    doc.rect(tableX, currentY, tableWidth, totalRowHeight).fill('#124EA6');

    doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold');
    doc.text('VALOR TOTAL:', tableX + tableWidth - 250, currentY + 11);
    doc.fontSize(16).font('Helvetica-Bold');
    doc.text(`R$ ${parseFloat(pedido.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, tableX + tableWidth - 130, currentY + 9, { width: 120, align: 'right' });

    currentY += totalRowHeight + 15;

    // ==================== INFORMAÇÕES ADICIONAIS ====================
    const infoColWidth = contentWidth * 0.50;
    const condColWidth = contentWidth * 0.50;
    const infoBoxHeight = 80;

    doc.rect(margin, currentY, infoColWidth - 5, infoBoxHeight).fill('#FAFAFA');
    doc.rect(margin, currentY, infoColWidth - 5, infoBoxHeight).stroke('#E5E7EB');

    let obsY = currentY + 10;
    const obsLabelWidth = 100;
    const obsValueX = margin + obsLabelWidth;

    doc.fillColor('#64748B').fontSize(8).font('Helvetica-Bold');
    doc.text('Horário Receb.:', margin + 8, obsY);
    doc.fillColor('#1F2937').font('Helvetica').fontSize(8);
    const horarioReceb = pedido.horario_recebimento || 'Seg à Sex, 8:00 às 17:00hs';
    doc.text(horarioReceb, obsValueX, obsY);

    obsY += 14;

    doc.fillColor('#64748B').font('Helvetica-Bold');
    doc.text('Preço Desc. Pallet:', margin + 8, obsY);
    doc.fillColor('#1F2937').font('Helvetica');
    const precoDescarga = pedido.preco_descarga_pallet
        ? `R$ ${parseFloat(pedido.preco_descarga_pallet).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        : '-';
    doc.text(precoDescarga, obsValueX, obsY);

    obsY += 14;

    doc.fillColor('#64748B').font('Helvetica-Bold');
    doc.text('Obs. Pedido:', margin + 8, obsY);
    doc.fillColor('#B45309').font('Helvetica');
    doc.text(pedido.observacoes || '-', obsValueX, obsY, { width: infoColWidth - obsLabelWidth - 20 });

    obsY += 14;

    doc.fillColor('#64748B').font('Helvetica-Bold');
    doc.text('Obs. Cliente:', margin + 8, obsY);
    doc.fillColor('#6B7280').font('Helvetica');
    doc.text(pedido.cliente_observacoes || '-', obsValueX, obsY, { width: infoColWidth - obsLabelWidth - 20 });

    const condX = margin + infoColWidth + 5;
    doc.rect(condX, currentY, condColWidth - 5, infoBoxHeight).fill('#F8FAFC');
    doc.rect(condX, currentY, condColWidth - 5, infoBoxHeight).stroke('#E5E7EB');

    let condY = currentY + 12;
    const condLabelX = condX + 12;
    const condValueX = condX + condColWidth - 20;

    doc.fillColor('#64748B').fontSize(9).font('Helvetica');
    doc.text('Prazo Pagamento:', condLabelX, condY);
    doc.fillColor('#1F2937').font('Helvetica-Bold');
    doc.text('28 DDL', condValueX - 60, condY, { width: 60, align: 'right' });

    condY += 18;

    doc.fillColor('#64748B').font('Helvetica');
    doc.text('Frete:', condLabelX, condY);
    const tipoFrete = pedido.entregue ? 'Entregue' : 'A entregar';
    doc.fillColor('#1F2937').font('Helvetica-Bold');
    doc.text(tipoFrete, condValueX - 60, condY, { width: 60, align: 'right' });

    // ==================== RODAPÉ ====================
    const footerY = pageHeight - 30;
    const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm');

    doc.strokeColor('#E5E7EB').lineWidth(0.5);
    doc.moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8).stroke();

    doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7);
    doc.text('Desenvolvido por', margin, footerY + 2, { continued: false, lineBreak: false });
    drawBureauLogo(doc, margin + 60, footerY - 3, 0.16);

    doc.fillColor('#9CA3AF').fontSize(8);
    const paginacaoTexto = 'Página 1 de 1';
    const paginacaoWidth = doc.widthOfString(paginacaoTexto);
    doc.text(paginacaoTexto, (pageWidth - paginacaoWidth) / 2, footerY + 1, { continued: false, lineBreak: false });

    const dataTexto = `Quatrelati - ${dataGeracao}`;
    const dataWidth = doc.widthOfString(dataTexto);
    doc.text(dataTexto, pageWidth - margin - dataWidth, footerY + 1, { continued: false, lineBreak: false });

    doc.end();
}

/**
 * Exporta lista de clientes para PDF
 * v1.3.0 - Agrupado por vendedor, sem coluna vendedor
 */
async function exportarClientesPDF(res, { clientes, nomeVendedor }) {
    const logoUrl = 'https://s3.amazonaws.com/bureau-it.com/quatrelati/logo-pdf.png';

    let logoBuffer = null;
    try {
        logoBuffer = await fetchImage(logoUrl);
    } catch (e) {
        console.log('Não foi possível carregar logo:', e.message);
    }

    const doc = new PDFDocument({
        margin: 40,
        size: 'A4',
        layout: 'landscape',
        bufferPages: true,
        autoFirstPage: true
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=clientes-quatrelati.pdf');

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 40;
    const footerY = pageHeight - 35;
    const dataGeracao = format(new Date(), 'dd/MM/yyyy HH:mm');

    // ===== CABEÇALHO =====
    if (logoBuffer) {
        try {
            doc.image(logoBuffer, margin, 12, { height: 50 });
        } catch (e) {
            doc.fillColor('#124EA6').fontSize(18).font('Helvetica-Bold');
            doc.text('QUATRELATI', margin, 25, { lineBreak: false });
        }
    } else {
        doc.fillColor('#124EA6').fontSize(18).font('Helvetica-Bold');
        doc.text('QUATRELATI', margin, 25, { lineBreak: false });
    }

    // Título à direita
    doc.fillColor('#1F2937').fontSize(14).font('Helvetica-Bold');
    doc.text('Cadastro de Clientes', pageWidth - margin - 210, 15, { width: 210, align: 'right', lineBreak: false });

    doc.fillColor('#6B7280').fontSize(10).font('Helvetica');
    doc.text(`${clientes.length} clientes`, pageWidth - margin - 210, 33, { width: 210, align: 'right', lineBreak: false });

    // Indicar se é lista geral ou de vendedor
    const tipoLista = nomeVendedor ? `Vendedor: ${nomeVendedor}` : 'Lista Geral';
    doc.fillColor('#4B5563').fontSize(9).font('Helvetica-Bold');
    doc.text(tipoLista, pageWidth - margin - 210, 47, { width: 210, align: 'right', lineBreak: false });

    // Linha separadora
    doc.moveTo(margin, 72).lineTo(pageWidth - margin, 72).strokeColor('#D1D5DB').lineWidth(0.5).stroke();

    let currentY = 82;

    // ===== TABELA (sem coluna vendedor - agrupado) =====
    const headers = ['Cliente', 'Contato', 'Telefone', 'Email', 'Endereço', 'Pedidos'];
    const tableWidth = pageWidth - margin * 2;
    // Larguras ajustadas (total = 762)
    const colWidths = [140, 90, 85, 140, 235, 72];
    const colAligns = ['left', 'left', 'left', 'left', 'left', 'right'];
    const startX = margin;
    const rowHeight = 32;
    const vendedorHeaderHeight = 26;

    // Agrupar clientes por vendedor
    const clientesPorVendedor = {};
    clientes.forEach(cliente => {
        const vendedor = cliente.vendedor_nome || 'Sem Vendedor';
        if (!clientesPorVendedor[vendedor]) {
            clientesPorVendedor[vendedor] = [];
        }
        clientesPorVendedor[vendedor].push(cliente);
    });

    // Ordenar vendedores alfabeticamente
    const vendedoresOrdenados = Object.keys(clientesPorVendedor).sort((a, b) => {
        if (a === 'Sem Vendedor') return 1;
        if (b === 'Sem Vendedor') return -1;
        return a.localeCompare(b);
    });

    // Função para desenhar cabeçalho da tabela
    const drawTableHeader = (y) => {
        doc.fillColor('#374151').font('Helvetica-Bold').fontSize(8);
        let xPos = startX;
        headers.forEach((header, i) => {
            doc.text(header, xPos + 4, y + 4, { width: colWidths[i] - 8, align: colAligns[i], lineBreak: false });
            xPos += colWidths[i];
        });
        doc.moveTo(startX, y + 18).lineTo(startX + tableWidth, y + 18).strokeColor('#374151').lineWidth(1).stroke();
        return y + 22;
    };

    // Função para desenhar cabeçalho de vendedor
    const drawVendedorHeader = (y, vendedor, qtdClientes) => {
        doc.rect(startX, y, tableWidth, vendedorHeaderHeight).fill('#1E3A8A');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10);
        doc.text(vendedor, startX + 10, y + 7, { lineBreak: false });
        doc.font('Helvetica').fontSize(9);
        doc.text(`${qtdClientes} cliente${qtdClientes > 1 ? 's' : ''}`, startX + tableWidth - 100, y + 8, { width: 90, align: 'right', lineBreak: false });
        return y + vendedorHeaderHeight;
    };

    let rowIndex = 0;

    vendedoresOrdenados.forEach((vendedor) => {
        const clientesVendedor = clientesPorVendedor[vendedor];

        // Verificar se cabe o header do vendedor + header da tabela + pelo menos 1 linha
        if (currentY + vendedorHeaderHeight + 22 + rowHeight > pageHeight - 50) {
            doc.addPage();
            currentY = 40;
        }

        // Header do vendedor
        currentY = drawVendedorHeader(currentY, vendedor, clientesVendedor.length);

        // Header da tabela
        currentY = drawTableHeader(currentY);

        clientesVendedor.forEach((cliente) => {
            // Verificar se precisa nova página
            if (currentY + rowHeight > pageHeight - 50) {
                doc.addPage();
                currentY = 40;
                // Repetir header do vendedor e tabela na nova página
                currentY = drawVendedorHeader(currentY, vendedor + ' (cont.)', clientesVendedor.length);
                currentY = drawTableHeader(currentY);
            }

            // Alternar cor de fundo
            if (rowIndex % 2 === 0) {
                doc.rect(startX, currentY, tableWidth, rowHeight).fill('#F8FAFC');
            }

            doc.moveTo(startX, currentY + rowHeight).lineTo(startX + tableWidth, currentY + rowHeight).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

            // Montar endereço completo
            const enderecoPartes = [];
            if (cliente.endereco) {
                let rua = cliente.endereco;
                if (cliente.numero) rua += `, ${cliente.numero}`;
                if (cliente.complemento) rua += ` - ${cliente.complemento}`;
                enderecoPartes.push(rua);
            }
            const cidadeUf = [cliente.cidade, cliente.estado].filter(Boolean).join('/');
            if (cidadeUf) enderecoPartes.push(cidadeUf);
            if (cliente.cep) enderecoPartes.push(`CEP ${cliente.cep}`);
            const enderecoCompleto = enderecoPartes.join(' - ') || '-';

            const totalPedidos = parseInt(cliente.total_pedidos) || 0;

            const valores = [
                cliente.nome || '-',
                cliente.contato_nome || '-',
                cliente.telefone || '-',
                cliente.email || '-',
                enderecoCompleto,
                String(totalPedidos)
            ];

            let xPos = startX;
            valores.forEach((valor, i) => {
                // Texto preto para todos os campos
                if (i === 0) {
                    doc.fillColor('#1F2937').font('Helvetica-Bold').fontSize(8);
                } else if (i === 5) {
                    // Coluna Pedidos (última)
                    doc.fillColor(totalPedidos > 0 ? '#166534' : '#6B7280').font('Helvetica-Bold').fontSize(8);
                } else if (i === 3) {
                    // Coluna Email - cor azul discreto
                    doc.fillColor('#4B5563').font('Helvetica').fontSize(7);
                } else {
                    doc.fillColor('#1F2937').font('Helvetica').fontSize(8);
                }

                doc.text(String(valor), xPos + 4, currentY + 8, { width: colWidths[i] - 8, align: colAligns[i], lineBreak: i === 4 });
                xPos += colWidths[i];
            });

            currentY += rowHeight;
            rowIndex++;
        });

        // Espaço entre grupos
        currentY += 8;
    });

    // ===== TOTAIS =====
    if (currentY + 30 > pageHeight - 60) {
        doc.addPage();
        currentY = 40;
    }

    doc.moveTo(startX, currentY).lineTo(startX + tableWidth, currentY).strokeColor('#374151').lineWidth(1).stroke();

    currentY += 4;
    doc.rect(startX, currentY, tableWidth, 24).fill('#1F2937');

    const totalPedidosGeral = clientes.reduce((acc, c) => acc + (parseInt(c.total_pedidos) || 0), 0);

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    doc.text(`${clientes.length} Clientes`, startX + 4, currentY + 7);
    doc.text(`${totalPedidosGeral} Pedidos`, startX + tableWidth - 80, currentY + 7, { width: 70, align: 'right' });

    // ===== RODAPÉ EM TODAS AS PÁGINAS =====
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);

        doc.moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8).strokeColor('#E5E7EB').lineWidth(0.5).stroke();

        doc.fillColor('#9CA3AF').font('Helvetica').fontSize(7);
        doc.text('Desenvolvido por', margin, footerY + 2, { continued: false, lineBreak: false });
        drawBureauLogo(doc, margin + 58, footerY - 5, 0.18);

        doc.fillColor('#6B7280').fontSize(8);
        const paginacaoTexto = `Página ${i + 1} de ${totalPages}`;
        const paginacaoWidth = doc.widthOfString(paginacaoTexto);
        doc.text(paginacaoTexto, (pageWidth - paginacaoWidth) / 2, footerY + 2, { continued: false, lineBreak: false });

        const dataTexto = `Quatrelati - ${dataGeracao}`;
        const dataWidth = doc.widthOfString(dataTexto);
        doc.text(dataTexto, pageWidth - margin - dataWidth, footerY + 2, { continued: false, lineBreak: false });
    }

    doc.end();
}

module.exports = {
    exportarPedidosPDF,
    exportarPedidosExcel,
    exportarPedidoIndividualPDF,
    exportarClientesPDF,
    fetchImage
};
