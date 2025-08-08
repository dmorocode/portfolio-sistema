/**
 * Script para criar um token de teste válido para redefinição de senha
 */

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

// Modelo do usuário (simplificado)
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    resetToken: String,
    resetTokenExpires: Date
});

const User = mongoose.model('User', userSchema);

async function createTestToken() {
    try {
        // Conectar ao MongoDB
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/portfolio');
        console.log('Conectado ao MongoDB');

        // Gerar token de teste
        const testToken = crypto.randomBytes(32).toString('hex');
        const expireTime = Date.now() + 3600000; // 1 hora

        // Encontrar ou criar usuário de teste
        let testUser = await User.findOne({ email: 'test@test.com' });
        
        if (!testUser) {
            testUser = new User({
                username: 'testuser',
                email: 'test@test.com',
                password: 'hashedpassword',
                resetToken: testToken,
                resetTokenExpires: new Date(expireTime)
            });
        } else {
            testUser.resetToken = testToken;
            testUser.resetTokenExpires = new Date(expireTime);
        }

        await testUser.save();

        console.log('\n✅ Token de teste criado com sucesso!');
        console.log('📧 Email: test@test.com');
        console.log('🔑 Token:', testToken);
        console.log('🔗 URL de teste:', `http://localhost:3000/reset-password/${testToken}`);
        console.log('⏰ Expira em:', new Date(expireTime).toLocaleString());
        console.log('\n📋 Use este link para testar o formulário de redefinição de senha');

        // Fechar conexão
        await mongoose.disconnect();
        console.log('\n✅ Script concluído!');

    } catch (error) {
        console.error('❌ Erro:', error);
        process.exit(1);
    }
}

createTestToken();
