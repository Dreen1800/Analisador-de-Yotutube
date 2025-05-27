// Exemplo de uso do sistema de armazenamento de imagens do Instagram

import {
    downloadAndStoreImage,
    getProxiedImageUrl,
    migrateExistingImages,
    fetchScrapingResults
} from '../src/services/instagramService';

// Exemplo 1: Download manual de uma imagem
async function exemploDownloadManual() {
    const imageUrl = 'https://scontent-gru1-2.cdninstagram.com/v/t51.2885-19/exemplo.jpg';
    const storagePath = 'profiles/exemplo_usuario';

    console.log('Iniciando download manual...');
    const supabaseUrl = await downloadAndStoreImage(imageUrl, storagePath);

    if (supabaseUrl && supabaseUrl !== imageUrl) {
        console.log('✅ Imagem salva no Supabase:', supabaseUrl);
    } else {
        console.log('⚠️ Mantendo URL original:', imageUrl);
    }
}

// Exemplo 2: Processamento automático via scraping
async function exemploScrapingCompleto() {
    const datasetId = 'seu-dataset-id-aqui';

    console.log('Iniciando scraping com armazenamento automático...');
    const resultado = await fetchScrapingResults(datasetId);

    if (resultado.success) {
        console.log(`✅ Perfil processado: ${resultado.profile.username}`);
        console.log(`📊 Posts salvos: ${resultado.postCount}`);
        console.log(`🖼️ Imagens no Supabase: ${resultado.supabaseImageCount}/${resultado.totalImageCount}`);

        const taxaSucesso = (resultado.supabaseImageCount / resultado.totalImageCount) * 100;
        console.log(`📈 Taxa de sucesso: ${taxaSucesso.toFixed(1)}%`);
    } else {
        console.error('❌ Erro no scraping:', resultado.error);
    }
}

// Exemplo 3: Migração de imagens existentes
async function exemploMigracao() {
    console.log('Iniciando migração de imagens existentes...');

    try {
        await migrateExistingImages();
        console.log('✅ Migração concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro na migração:', error);
    }
}

// Exemplo 4: Verificação de URLs otimizadas
async function exemploVerificacaoUrls() {
    const urls = [
        'https://scontent-gru1-2.cdninstagram.com/v/t51.2885-19/exemplo1.jpg',
        'https://your-project.supabase.co/storage/v1/object/public/instagram-images/profiles/user/exemplo2.jpg',
        '/instagram-img-proxy/v/t51.2885-19/exemplo3.jpg'
    ];

    console.log('Verificando URLs otimizadas...');

    urls.forEach((url, index) => {
        const optimizedUrl = getProxiedImageUrl(url);
        console.log(`URL ${index + 1}:`);
        console.log(`  Original: ${url}`);
        console.log(`  Otimizada: ${optimizedUrl}`);
        console.log(`  É Supabase: ${optimizedUrl.includes('supabase') ? '✅' : '❌'}`);
        console.log('');
    });
}

// Exemplo 5: Monitoramento de performance
async function exemploMonitoramento() {
    console.log('Exemplo de monitoramento de performance...');

    const startTime = Date.now();
    const imageUrl = 'https://scontent-gru1-2.cdninstagram.com/v/t51.2885-19/exemplo.jpg';

    try {
        const result = await downloadAndStoreImage(imageUrl, 'test/performance');
        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`⏱️ Tempo de processamento: ${duration}ms`);
        console.log(`📊 Status: ${result !== imageUrl ? 'Sucesso' : 'Fallback'}`);

        if (duration > 10000) {
            console.warn('⚠️ Download demorou mais que 10 segundos');
        }

    } catch (error) {
        console.error('❌ Erro no monitoramento:', error);
    }
}

// Exemplo 6: Verificação de saúde do sistema
async function exemploVerificacaoSaude() {
    console.log('Verificando saúde do sistema...');

    const checks = {
        supabaseConnection: false,
        bucketAccess: false,
        downloadCapability: false
    };

    try {
        // Teste 1: Conexão com Supabase
        const testUrl = 'https://httpbin.org/image/jpeg';
        const result = await downloadAndStoreImage(testUrl, 'health-check/test');

        if (result && result.includes('supabase')) {
            checks.supabaseConnection = true;
            checks.bucketAccess = true;
            checks.downloadCapability = true;
        }

    } catch (error) {
        console.error('Erro na verificação de saúde:', error);
    }

    console.log('📊 Status do Sistema:');
    console.log(`  Conexão Supabase: ${checks.supabaseConnection ? '✅' : '❌'}`);
    console.log(`  Acesso ao Bucket: ${checks.bucketAccess ? '✅' : '❌'}`);
    console.log(`  Capacidade Download: ${checks.downloadCapability ? '✅' : '❌'}`);

    const allHealthy = Object.values(checks).every(check => check);
    console.log(`\n🏥 Sistema: ${allHealthy ? '✅ Saudável' : '⚠️ Problemas detectados'}`);
}

// Exemplo 7: Limpeza de imagens órfãs (conceitual)
async function exemploLimpeza() {
    console.log('Exemplo conceitual de limpeza de imagens órfãs...');

    // NOTA: Esta é uma implementação conceitual
    // Em produção, você precisaria implementar a lógica completa

    console.log('1. Listar todas as imagens no bucket');
    console.log('2. Verificar quais têm referências no banco de dados');
    console.log('3. Marcar imagens órfãs para remoção');
    console.log('4. Remover imagens órfãs após período de segurança');

    console.log('⚠️ Implementação completa necessária para produção');
}

// Função principal para executar todos os exemplos
async function executarExemplos() {
    console.log('🚀 Iniciando exemplos do sistema de armazenamento de imagens\n');

    try {
        await exemploDownloadManual();
        console.log('\n' + '='.repeat(50) + '\n');

        await exemploVerificacaoUrls();
        console.log('='.repeat(50) + '\n');

        await exemploMonitoramento();
        console.log('\n' + '='.repeat(50) + '\n');

        await exemploVerificacaoSaude();
        console.log('\n' + '='.repeat(50) + '\n');

        exemploLimpeza();

        console.log('\n✅ Todos os exemplos executados!');

    } catch (error) {
        console.error('❌ Erro ao executar exemplos:', error);
    }
}

// Exportar funções para uso individual
export {
    exemploDownloadManual,
    exemploScrapingCompleto,
    exemploMigracao,
    exemploVerificacaoUrls,
    exemploMonitoramento,
    exemploVerificacaoSaude,
    exemploLimpeza,
    executarExemplos
};

// Executar se chamado diretamente
if (require.main === module) {
    executarExemplos();
} 