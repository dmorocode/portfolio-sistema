const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    username: { // Guardamos o nome para o caso de o utilizador ser apagado
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [ // Ações pré-definidas para consistência
            'LOGIN', 'LOGOUT',
            'PROJECT_UPLOAD', 'PROJECT_DOWNLOAD', 'PROJECT_EDIT', 'PROJECT_DELETE',
            'USER_CREATE', 'USER_DELETE', 'PASSWORD_CHANGE',
            'CATEGORY_CREATE', 'CATEGORY_DELETE',
            'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_SUCCESS',
            'MFA_SETUP', 'MFA_ENABLED', 'MFA_DISABLED', 'MFA_VERIFIED', 'MFA_LOGIN_SUCCESS', 'MFA_LOGIN_FAILED'
        ]
    },
    details: { // Detalhes adicionais, como o nome do projeto ou do utilizador afetado
        type: String
    }
}, { timestamps: true }); // Adiciona a data e hora automaticamente

module.exports = mongoose.model('ActivityLog', activityLogSchema);
