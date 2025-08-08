const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Models
const Project = require('./models/Project');

async function improveOriginalNames() {
    try {
        console.log('🎯 MELHORIA: Corrigindo nomes originais inteligentemente');
        console.log('====================================================');
        
        // Conectar ao MongoDB
        if (process.env.MONGO_URI) {
            await mongoose.connect(process.env.MONGO_URI);
            console.log('✅ Conectado ao MongoDB');
        } else {
            console.log('❌ MONGO_URI não definida');
            return;
        }
        
        // Buscar todos os projetos
        const projects = await Project.find({});
        console.log(`📋 Encontrados ${projects.length} projetos`);
        
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            console.log(`\n${i + 1}. Analisando projeto: ${project.title}`);
            console.log(`   Filename: ${project.filename}`);
            console.log(`   Original Name atual: ${project.originalName}`);
            
            // Se o originalName contém timestamp, vamos tentar melhorar
            const hasTimestamp = /^\d{13}-\d+-/.test(project.originalName || '');
            
            if (hasTimestamp || !project.originalName) {
                console.log('   🔍 Tentando deduzir nome original melhor...');
                
                // Estratégias para deduzir o nome original:
                
                // 1. Baseado no título do projeto + extensão do arquivo
                let extension = '';
                if (project.filename) {
                    extension = path.extname(project.filename);
                }
                
                let suggestedName = null;
                
                // Limpar título (remover caracteres especiais, espaços, etc.)
                const cleanTitle = project.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]/g, '') // remove caracteres especiais
                    .substring(0, 20); // máximo 20 caracteres
                
                if (cleanTitle && extension) {
                    suggestedName = cleanTitle + extension;
                    console.log(`   💡 Sugestão baseada no título: ${suggestedName}`);
                }
                
                // 2. Se não conseguiu pelo título, tentar nomes comuns
                if (!suggestedName && extension) {
                    const commonNames = [
                        'programa',
                        'aplicativo',
                        'software',
                        'tool',
                        'app',
                        'sistema'
                    ];
                    
                    suggestedName = commonNames[0] + extension;
                    console.log(`   💡 Sugestão nome genérico: ${suggestedName}`);
                }
                
                // 3. Se ainda não tem, usar filename sem timestamp
                if (!suggestedName && project.filename) {
                    suggestedName = project.filename.replace(/^\d{13}-\d+-/, '');
                    console.log(`   💡 Sugestão removendo timestamp: ${suggestedName}`);
                }
                
                // Perguntar ao usuário (simulado - aqui vamos usar a melhor opção)
                if (suggestedName && suggestedName !== project.originalName) {
                    console.log(`   ✏️  Atualizando originalName: ${project.originalName} -> ${suggestedName}`);
                    
                    await Project.findByIdAndUpdate(project._id, {
                        originalName: suggestedName,
                        originalFiles: [suggestedName]
                    });
                    
                    console.log(`   ✅ Atualizado com sucesso`);
                } else {
                    console.log(`   ⏭️  Mantendo nome atual`);
                }
            } else {
                console.log(`   ✅ Nome original já está bom`);
            }
        }
        
        console.log('\n✅ MELHORIA CONCLUÍDA');
        
        // Verificar os resultados finais
        console.log('\n🎉 RESULTADO FINAL:');
        const finalProjects = await Project.find({});
        for (const project of finalProjects) {
            console.log(`📄 ${project.title}:`);
            console.log(`   Arquivo no servidor: ${project.filename}`);
            console.log(`   Nome original: ${project.originalName}`);
            console.log(`   Para download será: ${project.originalName}`);
        }
        
    } catch (error) {
        console.error('❌ Erro na melhoria:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');
    }
}

// Executar a melhoria
improveOriginalNames();
