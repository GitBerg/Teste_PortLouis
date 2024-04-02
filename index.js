const fs = require('fs');

// Função para ler e validar os arquivos de pedidos
function lerPedidos(pastaPedidos) {
    const pedidos = {};
    const arquivos = fs.readdirSync(pastaPedidos);

    for (const arquivo of arquivos) {
        const idPedido = arquivo.split('.')[0];
        const conteudo = fs.readFileSync(`${pastaPedidos}/${arquivo}`, 'utf-8');
        const linhas = conteudo.split('\n');

        for (let linha of linhas) {
            try {
                linha = linha.trim()
                const pedido = JSON.parse(linha);
                let { número_item: numero_item, código_produto: codigo_produto, quantidade_produto, valor_unitário_produto: valor_unitario_produto } = pedido;

                valor_unitario_produto = parseFloat(valor_unitario_produto);

                // Validar tipo dos valores
                if (typeof numero_item !== 'number' || typeof codigo_produto !== 'string' ||
                    typeof quantidade_produto !== 'number' || typeof valor_unitario_produto !== 'number') {
                    throw new Error(`Pedido inválido no arquivo ${arquivo}: valores devem ser numéricos ou alfanuméricos.`);
                }

                // Verificar repetição de número_item
                if (pedidos[idPedido] && pedidos[idPedido][numero_item]) {
                    throw new Error(`Pedido inválido no arquivo ${arquivo}: número_item ${numero_item} repetido.`);
                }

                // Adicionar pedido ao objeto pedidos
                pedidos[idPedido] = pedidos[idPedido] || {};
                pedidos[idPedido][numero_item] = pedido;
            } catch (error) {
                console.error(error.message);
            }
        }
    }

    return pedidos;
}

// Função para ler e validar os arquivos de notas
function lerNotas(pastaNotas, pedidos) {
    const notas = [];
    const arquivos = fs.readdirSync(pastaNotas);

    for (const arquivo of arquivos) {
        const conteudo = fs.readFileSync(`${pastaNotas}/${arquivo}`, 'utf-8');
        const linhas = conteudo.split('\n');

        for (let linha of linhas) {
            try {
                linha = linha.trim()
                const nota = JSON.parse(linha);
                const { id_pedido, número_item: numero_item, quantidade_produto } = nota;

                // Validar tipo dos valores
                if (typeof id_pedido !== 'number' || typeof numero_item !== 'number' ||
                    typeof quantidade_produto !== 'number') {
                    throw new Error(`Nota inválida no arquivo ${arquivo}: valores devem ser numéricos ou alfanuméricos.`);
                }

                // Verificar se id_pedido e numero_item existem nos pedidos
                for (let pedido in pedidos[`P${id_pedido}`]) {
                    if (pedidos[`P${id_pedido}`][pedido]['número_item'] === numero_item) {
                        if (!pedidos[`P${id_pedido}`] || pedidos[`P${id_pedido}`][pedido]['numero_item']) {
                            throw new Error(`Nota inválida no arquivo ${arquivo}: id_pedido ou numero_item não encontrados nos pedidos.`);
                        }


                        // Verificar quantidade_produto
                        const quantidade_pedido = pedidos[`P${id_pedido}`][pedido]['quantidade_produto'];
                        if (quantidade_produto > quantidade_pedido) {
                            throw new Error(`Nota inválida no arquivo ${arquivo}: quantidade_produto excede a quantidade do pedido.`);
                        }
                    }
                }

                // Adicionar nota ao array de notas
                notas.push(nota);
            } catch (error) {
                console.error(error.message);
            }
        }
    }

    return notas;
}

// Função para cruzar pedidos e notas e identificar itens pendentes
function identificarItensPendentes(pedidos, notas) {
    const itensPendentes = {};

    // Percorrer as notas e identificar itens pendentes
    for (const nota of notas) {
        const { id_pedido, número_item: numero_item, quantidade_produto } = nota;

        for (let el in pedidos[`P${id_pedido}`]) {
            if (pedidos[`P${id_pedido}`][el]['número_item'] === numero_item) {
                const qtd_pedido = pedidos[`P${id_pedido}`][el]['quantidade_produto'];
                const val_produto = parseFloat(pedidos[`P${id_pedido}`][el]['valor_unitário_produto']);
                let saldoQuantidade = qtd_pedido - quantidade_produto;


                // Se saldoQuantidade for maior que zero, adicionar ao objeto itensPendentes
                if (saldoQuantidade > 0) {
                    itensPendentes[id_pedido] = itensPendentes[id_pedido] || { valor_total: 0, saldo_valor: 0, itens: [] };
                    itensPendentes[id_pedido].valor_total += qtd_pedido * val_produto;
                    itensPendentes[id_pedido].saldo_valor += saldoQuantidade * val_produto;
                    itensPendentes[id_pedido].itens.push({ numero_item, saldo_quantidade: saldoQuantidade });
                }
            }
        }
    }

    return itensPendentes;
}

// Função para gravar a listagem de pedidos pendentes em um arquivo de texto
function gravarListagemPedidosPendentes(listaPedidosPendentes, nomeArquivo) {
    const conteudo = Object.entries(listaPedidosPendentes).map(([id_pedido, dados]) => {
        const itens = dados.itens.map(item => `  - Item ${item.numero_item}: saldo quantidade ${item.saldo_quantidade}`).join('\n');
        return `Pedido ${id_pedido}:\n  - Valor total: R$ ${dados.valor_total.toFixed(2)}\n  - Saldo valor: R$ ${dados.saldo_valor.toFixed(2)}\n${itens}\n`;
    }).join('\n');

    fs.writeFileSync(nomeArquivo, conteudo, 'utf-8');
}

// Função principal
function main() {
    const pastaPedidos = './Pedidos';
    const pastaNotas = './Notas';

    // Ler e validar os arquivos de pedidos
    const pedidos = lerPedidos(pastaPedidos);

    // Ler e validar os arquivos de notas
    const notas = lerNotas(pastaNotas, pedidos);

    // Identificar itens pendentes
    const listaPedidosPendentes = identificarItensPendentes(pedidos, notas);

    // Gravar a listagem de pedidos pendentes em um arquivo de texto
    const nomeArquivo = 'pedidos_pendentes.txt';
    gravarListagemPedidosPendentes(listaPedidosPendentes, nomeArquivo);
}

// Chamada da função principal
main();