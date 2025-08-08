const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Models
const Project = require('./models/Project');

async function fixMissingOriginalNames() {
    try {
        console.log('🔧 CORREÇÃO: Adicionando nomes originais faltantes');
        console.log('==============================================');
        
        // Conectar ao MongoDB
        if (process.env.MONGO_URI) {
            await mongoose.connect(process.env.MONGO_URI);
            console.log('✅ Conectado ao MongoDB');
        } else {
            console.log('❌ MONGO_URI não definida');
            return;
        }
        
        // Buscar projetos sem originalName ou originalFiles
        const projectsToFix = await Project.find({
            $or: [
                { originalName: { $exists: false } },
                { originalName: null },
                { originalName: undefined },
                { originalFiles: { $exists: false } },
                { originalFiles: { $size: 0 } }
            ]
        });
        
        console.log(`📋 Encontrados ${projectsToFix.length} projetos para corrigir`);
        
        if (projectsToFix.length === 0) {
            console.log('✅ Todos os projetos já têm nomes originais');
            return;
        }
        
        for (let i = 0; i < projectsToFix.length; i++) {
            const project = projectsToFix[i];
            console.log(`\n${i + 1}. Corrigindo projeto: ${project.title}`);
            console.log(`   ID: ${project._id}`);
            console.log(`   Filename atual: ${project.filename}`);
            console.log(`   Original Name atual: ${project.originalName}`);
            console.log(`   Files: ${JSON.stringify(project.files)}`);
            console.log(`   Original Files: ${JSON.stringify(project.originalFiles)}`);
            
            // Tentar deduzir o nome original baseado no filename
            let deducedOriginalName = null;
            
            if (project.filename) {
                // Remover timestamp do início do filename
                const timestampPattern = /^\d{13}-\d+-/; // padrão: 1754675781863-806196733-
                if (timestampPattern.test(project.filename)) {
                    deducedOriginalName = project.filename.replace(timestampPattern, '');
                } else {
                    // Se não tem timestamp, usar o filename como está
                    deducedOriginalName = project.filename;
                }
            }
            
            // Atualizar o projeto
            const updateData = {};
            
            if (!project.originalName && deducedOriginalName) {
                updateData.originalName = deducedOriginalName;
                console.log(`   ✏️  Adicionando originalName: ${deducedOriginalName}`);
            }
            
            if (!project.files || project.files.length === 0) {
                updateData.files = [project.filename];
                console.log(`   ✏️  Adicionando files: [${project.filename}]`);
            }
            
            if (!project.originalFiles || project.originalFiles.length === 0) {
                updateData.originalFiles = deducedOriginalName ? [deducedOriginalName] : [];
                console.log(`   ✏️  Adicionando originalFiles: [${deducedOriginalName}]`);
            }
            
            if (Object.keys(updateData).length > 0) {
                await Project.findByIdAndUpdate(project._id, updateData);
                console.log(`   ✅ Projeto atualizado`);
            } else {
                console.log(`   ⏭️  Nada para atualizar`);
            }
        }
        
        console.log('\n✅ CORREÇÃO CONCLUÍDA');
        
        // Verificar os resultados
        console.log('\n🔍 VERIFICAÇÃO FINAL:');
        const updatedProjects = await Project.find({});
        for (const project of updatedProjects) {
            console.log(`📄 ${project.title}:`);
            console.log(`   Original Name: ${project.originalName}`);
            console.log(`   Original Files: ${JSON.stringify(project.originalFiles)}`);
        }
        
    } catch (error) {
        console.error('❌ Erro na correção:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado do MongoDB');
    }
}

// Executar a correção
fixMissingOriginalNames();
