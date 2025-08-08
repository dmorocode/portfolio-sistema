const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    filename: { type: String, required: true }, // Nome gerado pelo multer
    originalName: { type: String, required: true }, // Nome original do arquivo
    files: { type: [String], default: [] }, // Array de arquivos
    originalFiles: { type: [String], default: [] }, // Array de nomes originais
    coverImage: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category'
    },
    downloads: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);