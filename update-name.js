const mongoose = require('mongoose');
require('dotenv').config();

const Project = require('./models/Project');

async function updateOriginalName() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado ao MongoDB');
        
        const project = await Project.findOne();
        console.log('📋 Projeto encontrado:', {
            id: project._id,
            title: project.title,
            filename: project.filename,
            originalName: project.originalName,
            originalFiles: project.originalFiles
        });
        
        // Atualizar para nome limpo
        await Project.findByIdAndUpdate(project._id, {
            originalName: 'teste.exe',
            originalFiles: ['teste.exe']
        });
        
        console.log('✅ Atualizado para: teste.exe');
        
        // Verificar se foi atualizado
        const updatedProject = await Project.findById(project._id);
        console.log('📋 Após atualização:', {
            originalName: updatedProject.originalName,
            originalFiles: updatedProject.originalFiles
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateOriginalName();
