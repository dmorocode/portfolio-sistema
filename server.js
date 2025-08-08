// server.js

// 1. Importando os módulos necessários
require('dotenv').config();
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const sgMail = require('@sendgrid/mail');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Modelos
const User = require('./models/User');
const Project = require('./models/Project');
const Category = require('./models/Category');
const ActivityLog = require('./models/Log');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do transportador de email
let transporter;

// Função para criar transporter do Gmail
const createGmailTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    });
};

// Função para criar transporter do Ethereal para desenvolvimento
const createEtherealTransporter = async () => {
    try {
        // Criar conta de teste no Ethereal
        const testAccount = await nodemailer.createTestAccount();
        
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    } catch (error) {
        console.error('Erro ao criar conta Ethereal:', error);
        // Fallback para configuração manual
        return nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: 'ethereal.user@ethereal.email',
                pass: 'ethereal.pass'
            }
        });
    }
};

// Função para enviar email com múltiplos métodos
const sendEmail = async (mailOptions) => {
    try {
        console.log('📧 Tentando enviar email...');
        
        // Tentar SendGrid primeiro se configurado
        if (process.env.SENDGRID_API_KEY) {
            try {
                sgMail.setApiKey(process.env.SENDGRID_API_KEY);
                const msg = {
                    to: mailOptions.to,
                    from: mailOptions.from,
                    subject: mailOptions.subject,
                    html: mailOptions.html
                };
                
                const result = await sgMail.send(msg);
                console.log('✅ Email enviado via SendGrid');
                return result;
            } catch (sgError) {
                console.warn('⚠️  SendGrid falhou:', sgError.message);
            }
        }
        
        // Tentar Gmail se configurado
        if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            try {
                const gmailTransporter = createGmailTransporter();
                const result = await gmailTransporter.sendMail(mailOptions);
                console.log('✅ Email enviado via Gmail');
                return result;
            } catch (gmailError) {
                console.warn('⚠️  Gmail falhou:', gmailError.message);
            }
        }
        
        // Fallback para transporter padrão (Ethereal)
        const result = await transporter.sendMail(mailOptions);
        console.log('✅ Email enviado via Ethereal (desenvolvimento)');
        
        // Se usando Ethereal, mostrar URL de preview
        if (result.messageId && result.messageId.includes('ethereal')) {
            const previewUrl = nodemailer.getTestMessageUrl(result);
            console.log('🔗 Preview do email:', previewUrl);
            console.log('📋 Copie e cole o link acima no navegador para ver o email');
        }
        
        return result;
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        throw error;
    }
};

// Inicializar transporter
const initializeTransporter = async () => {
    try {
        if (process.env.SENDGRID_API_KEY) {
            const options = { auth: { api_key: process.env.SENDGRID_API_KEY } };
            transporter = nodemailer.createTransport(sgTransport(options));
            console.log('📧 Email configurado com SendGrid');
        } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
            transporter = createGmailTransporter();
            console.log('📧 Email configurado com Gmail');
        } else {
            transporter = await createEtherealTransporter();
            console.log('📧 Email configurado com Ethereal para desenvolvimento');
        }
        
        // Verificar conexão apenas se não for SendGrid
        if (!process.env.SENDGRID_API_KEY) {
            await transporter.verify();
            console.log('✅ Servidor de email conectado e pronto!');
        }
        
    } catch (error) {
        console.warn('⚠️  Erro na configuração de email:', error.message);
        console.log('🔄 Configurando Ethereal como fallback...');
        
        try {
            transporter = await createEtherealTransporter();
            console.log('📧 Fallback para Ethereal configurado');
        } catch (fallbackError) {
            console.error('❌ Erro crítico na configuração de email:', fallbackError);
        }
    }
};

// Inicializar o transporter
initializeTransporter();

// Conexão com MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/meuPortfolioDB';
console.log('🔗 Tentando conectar ao MongoDB...');
console.log('🔗 URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Esconde credenciais no log

mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000, // 30 segundos
    socketTimeoutMS: 45000,
    bufferCommands: false,
    bufferMaxEntries: 0
})
    .then(async () => {
        console.log('Conectado ao MongoDB com sucesso!');
        
        // Criar usuário admin se não existir
        try {
            console.log('🔍 Verificando usuário admin...');
            let adminUser = await User.findOne({ username: 'admin' });
            if (!adminUser) {
                console.log('⚠️ Usuário admin não encontrado. Criando...');
                const hashedPassword = await bcrypt.hash('Danilo30!', 10);
                adminUser = new User({
                    username: 'admin',
                    email: 'admin@sistema.com',
                    password: hashedPassword,
                    isAdmin: true,
                    mfaEnabled: false
                });
                await adminUser.save();
                console.log('✅ Usuário admin criado com sucesso!');
                console.log('👤 Username: admin');
                console.log('🔑 Password: Danilo30!');
            } else {
                console.log('✅ Usuário admin já existe');
                console.log('👤 Admin ID:', adminUser._id);
            }
            
            // Criar categorias padrão se não existirem
            const categoriesCount = await Category.countDocuments();
            if (categoriesCount === 0) {
                const defaultCategories = [
                    { name: 'Aplicativos Desktop' },
                    { name: 'Utilitários' },
                    { name: 'Jogos' },
                    { name: 'Produtividade' },
                    { name: 'Desenvolvimento' }
                ];
                
                await Category.insertMany(defaultCategories);
                console.log('Categorias padrão criadas');
            }
        } catch (error) {
            console.error('❌ Erro ao criar dados iniciais:', error);
        }
})
.catch(err => {
    console.error('❌ FALHA AO CONECTAR AO MONGODB:');
    console.error('Erro:', err.message);
    console.error('Código:', err.code);
    if (err.code === 8000) {
        console.error('❌ CREDENCIAIS INVÁLIDAS - Verifique username/password');
    } else if (err.code === 6) {
        console.error('❌ HOST NÃO ENCONTRADO - Verifique a URL do cluster');
    }
    console.error('🔧 Verifique:');
    console.error('   1. String de conexão MONGODB_URI');
    console.error('   2. Network Access no MongoDB Atlas (0.0.0.0/0)');
    console.error('   3. Database Access - usuário e senha');
    console.error('   4. Cluster ativo no MongoDB Atlas');
});

// Garante que o diretório de projetos exista
const projectsDir = path.join(__dirname, 'projects');
const coversDir = path.join(__dirname, 'public', 'uploads', 'covers');

if (!fs.existsSync(projectsDir)){
    fs.mkdirSync(projectsDir, { recursive: true });
}
if (!fs.existsSync(coversDir)){
    fs.mkdirSync(coversDir, { recursive: true });
}

// 2. Configurando o EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 4. Configurando o Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/downloads', express.static(projectsDir));
app.use(session({
    secret: 'seu-segredo-super-secreto-aqui-2025',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        secure: false, // false para HTTP, true para HTTPS
        httpOnly: false, // Permitir acesso via JavaScript para debug
        sameSite: false // Desabilitar para testes locais
    },
    name: 'portfolio-session' // Nome personalizado do cookie
}));

// Armazenamento simples de sessões ativas em memória
const activeSessions = new Map();

// Função para criar token de sessão
function createSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Middleware de autenticação simplificado
const requireLogin = (req, res, next) => {
    const sessionToken = req.cookies.sessionToken;
    console.log('🔒 Verificando autenticação');
    console.log('Token do cookie:', sessionToken);
    
    if (!sessionToken || !activeSessions.has(sessionToken)) {
        console.log('❌ Token inválido ou não encontrado - redirecionando');
        return res.redirect('/login.html');
    }
    
    const sessionData = activeSessions.get(sessionToken);
    console.log('✅ Usuário autenticado:', sessionData.username);
    
    // Adicionar dados do usuário ao request
    req.user = sessionData;
    next();
};

// 5. Configurando o Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'coverImage') {
            cb(null, path.join(__dirname, 'public', 'uploads', 'covers'));
        } else {
            cb(null, projectsDir);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'coverImage') {
            if (file.mimetype.startsWith('image/')) {
                cb(null, true);
            } else {
                cb(new Error('Apenas arquivos de imagem são permitidos para capa!'), false);
            }
        } else {
            cb(null, true);
        }
    }
});

// Multer para processar dados de formulário sem arquivos (como login)
const uploadNone = multer();

// 6. Definindo as Rotas

// Rota principal
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// --- NOVA ROTA: para processar o cadastro ---
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Verifica se o usuário já existe
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
        // Em um app real, você enviaria uma mensagem de erro para o frontend.
        // Por simplicidade, vamos apenas redirecionar de volta.
        console.log(`Tentativa de cadastro falhou: usuário '${username}' já existe.`);
        return res.redirect('/register.html');
    }

    // Cria um novo usuário
    const newUser = {
        id: Date.now(), // ID único baseado no tempo
        username: username,
        password: password // ATENÇÃO: Em um app real, a senha deve ser criptografada!
    };

    users.push(newUser);
    console.log('Novo usuário cadastrado:', newUser);
    console.log('Lista de usuários atual:', users);

    // Redireciona para a página de login para que o novo usuário possa entrar
    res.redirect('/login.html');
});

// Rota para servir página de login
app.get('/login.html', (req, res) => {
    // Evitar cache
    res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Rota para processar o login
app.post('/login', uploadNone.none(), async (req, res) => {
    try {
        console.log('🔐 TENTATIVA DE LOGIN');
        console.log('Body:', req.body);
        
        const { username, password } = req.body;
        
        if (!username || !password) {
            console.log('❌ Campos obrigatórios não fornecidos');
            return res.redirect('/login-error.html');
        }
        
        // Buscar usuário no MongoDB (por username ou email)
        const user = await User.findOne({ 
            $or: [
                { username: username },
                { email: username }
            ]
        });
        
        console.log('🔍 Usuário encontrado:', user ? user.username : 'Não encontrado');
        console.log('🔍 Total de usuários no banco:', await User.countDocuments());
        
        if (user) {
            console.log('🔑 Hash da senha no banco:', user.password.substring(0, 20) + '...');
            const passwordMatch = await bcrypt.compare(password, user.password);
            console.log('✅ Verificação de senha:', passwordMatch ? 'Válida' : 'Inválida');
            
            if (passwordMatch) {
                // Verificar se o usuário tem MFA habilitado
                if (user.mfaEnabled && user.role === 'admin') {
                    console.log('🔐 MFA habilitado para admin - solicitando código TOTP');
                    
                    // Armazenar dados temporários da sessão para verificação MFA
                    const tempSessionToken = createSessionToken();
                    const tempSessionData = {
                        userId: user._id.toString(),
                        username: user.username,
                        role: user.role,
                        pendingMFA: true,
                        createdAt: new Date()
                    };
                    
                    activeSessions.set(tempSessionToken, tempSessionData);
                    
                    res.cookie('tempSessionToken', tempSessionToken, {
                        maxAge: 5 * 60 * 1000, // 5 minutos
                        httpOnly: false,
                        secure: false
                    });
                    
                    return res.redirect('/mfa-verify');
                }
                
                // Login normal sem MFA
                const sessionToken = createSessionToken();
                
                // Armazenar dados da sessão
                const sessionData = {
                    userId: user._id.toString(),
                    username: user.username,
                    role: user.role,
                    createdAt: new Date()
                };
                
                activeSessions.set(sessionToken, sessionData);
                
                // Definir cookie com token
                res.cookie('sessionToken', sessionToken, {
                    maxAge: 24 * 60 * 60 * 1000, // 24 horas
                    httpOnly: false, // Permitir acesso via JavaScript para debug
                    secure: false // false para HTTP
                });
                
                console.log('✅ Login bem-sucedido:', username);
                console.log('Token criado:', sessionToken);
                console.log('Sessões ativas:', activeSessions.size);
                
                res.redirect('/dashboard');
            } else {
                console.log('❌ Credenciais inválidas');
                res.redirect('/login-error.html');
            }
        } else {
            console.log('❌ Usuário não encontrado');
            res.redirect('/login-error.html');
        }
    } catch (error) {
        console.error('💥 Erro no login:', error);
        res.redirect('/login-error.html');
    }
});

// Rota de Logout
app.get('/logout', (req, res) => {
    const sessionToken = req.cookies.sessionToken;
    
    if (sessionToken && activeSessions.has(sessionToken)) {
        activeSessions.delete(sessionToken);
        console.log('🚪 Logout realizado - token removido');
    }
    
    res.clearCookie('sessionToken');
    res.redirect('/login.html');
});

// Rota do Dashboard (protegida)
app.get('/dashboard', requireLogin, async (req, res) => {
    try {
        console.log('📊 Carregando dashboard para usuário:', req.user.username);
        
        // Buscar usuário atual
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.redirect('/login.html');
        }
        
        // Buscar projetos do MongoDB
        const projects = await Project.find({}).populate('category').sort({ createdAt: -1 });
        console.log('Projetos encontrados:', projects.length);
        
        // Buscar categorias do MongoDB
        const categories = await Category.find({}).sort({ name: 1 });
        console.log('Categorias encontradas:', categories.length);
        
        // Buscar todos os usuários (para admin)
        const allUsers = await User.find({}).select('-password');
        console.log('Todos os usuários:', allUsers.length);
        
        // Buscar logs de atividade
        const activityLogs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(50);
        console.log('Logs de atividade:', activityLogs.length);
        
        res.render('dashboard', { 
            projects: projects, 
            user: user,
            categories: categories,
            allUsers: allUsers,
            activityLogs: activityLogs,
            searchQuery: req.query.search || '',
            selectedCategory: req.query.category || '',
            currentPage: 1,
            totalPages: 1,
            success_msg: req.query.success || '',
            error_msg: req.query.error || ''
        });
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        res.redirect('/login.html');
    }
});

// Rota de Upload (protegida)
app.post('/upload', requireLogin, upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'projectFile', maxCount: 1 }
]), async (req, res) => {
    try {
        if (!req.files || !req.files.projectFile) {
            return res.status(400).send('Nenhum arquivo de projeto foi enviado.');
        }
        
        const { title, description, category } = req.body;
        const projectFile = req.files.projectFile[0];
        const coverImage = req.files.coverImage ? req.files.coverImage[0] : null;
        
        // Criar novo projeto no MongoDB
        const project = new Project({
            title,
            description,
            filename: projectFile.filename,
            coverImage: coverImage ? coverImage.filename : null,
            category: category || null,
            owner: req.user.userId, // ObjectId do usuário logado
            downloads: 0
        });
        
        await project.save();
        
        // Log da atividade
        const log = new ActivityLog({
            username: req.user.username,
            action: 'PROJECT_UPLOAD',
            details: `Projeto: ${title}`
        });
        await log.save();
        
        console.log(`Novo projeto salvo no MongoDB: ${title}`);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro ao salvar projeto:', error);
        res.status(500).send('Erro interno do servidor ao salvar projeto.');
    }
});

// Rota para adicionar categoria
app.post('/admin/create-category', requireLogin, async (req, res) => {
    try {
        const { name } = req.body;
        
        const category = new Category({ name });
        await category.save();
        
        // Log da atividade
        const log = new ActivityLog({
            username: req.user.username,
            action: 'CATEGORY_CREATE',
            details: `Categoria: ${name}`
        });
        await log.save();
        
        console.log(`Nova categoria criada: ${name}`);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro ao criar categoria:', error);
        res.status(500).send('Erro ao criar categoria.');
    }
});

// Rota para deletar categoria
app.post('/admin/delete-category/:id', requireLogin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send('Categoria não encontrada.');
        }
        
        const categoryName = category.name;
        await Category.findByIdAndDelete(req.params.id);
        
        // Log da atividade
        const log = new ActivityLog({
            username: req.user.username,
            action: 'CATEGORY_DELETE',
            details: `Categoria: ${categoryName}`
        });
        await log.save();
        
        console.log(`Categoria deletada: ${categoryName}`);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro ao deletar categoria:', error);
        res.status(500).send('Erro ao deletar categoria.');
    }
});

// Rota para editar projeto
app.post('/admin/edit-project/:id', requireLogin, upload.single('coverImage'), async (req, res) => {
    try {
        const { title, description, category } = req.body;
        const projectId = req.params.id;
        
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send('Projeto não encontrado.');
        }
        
        // Atualizar dados básicos
        project.title = title;
        project.description = description;
        project.category = category || null;
        
        // Se uma nova imagem de capa foi enviada
        if (req.file) {
            // Deletar imagem antiga se existir
            if (project.coverImage) {
                const oldCoverPath = path.join(coversDir, project.coverImage);
                if (fs.existsSync(oldCoverPath)) {
                    fs.unlinkSync(oldCoverPath);
                }
            }
            project.coverImage = req.file.filename;
        }
        
        await project.save();
        
        // Log da atividade
        const log = new ActivityLog({
            username: req.user.username,
            action: 'PROJECT_EDIT',
            details: `Projeto: ${title}`
        });
        await log.save();
        
        console.log(`Projeto editado: ${title}`);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro ao editar projeto:', error);
        res.status(500).send('Erro ao editar projeto.');
    }
});

// Rota para deletar projeto
app.post('/admin/delete-project/:id', requireLogin, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).send('Projeto não encontrado.');
        }
        
        const projectTitle = project.title;
        
        // Deletar arquivos físicos
        try {
            if (project.filename) {
                const projectFilePath = path.join(projectsDir, project.filename);
                if (fs.existsSync(projectFilePath)) {
                    fs.unlinkSync(projectFilePath);
                }
            }
            
            if (project.coverImage) {
                const coverImagePath = path.join(coversDir, project.coverImage);
                if (fs.existsSync(coverImagePath)) {
                    fs.unlinkSync(coverImagePath);
                }
            }
        } catch (fileError) {
            console.warn('Erro ao deletar arquivos físicos:', fileError);
            // Continua mesmo se houver erro na deleção de arquivos
        }
        
        // Deletar projeto do banco
        await Project.findByIdAndDelete(req.params.id);
        
        // Log da atividade
        const log = new ActivityLog({
            username: req.user.username,
            action: 'PROJECT_DELETE',
            details: `Projeto: ${projectTitle}`
        });
        await log.save();
        
        console.log(`Projeto deletado: ${projectTitle}`);
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Erro ao deletar projeto:', error);
        res.status(500).send('Erro ao deletar projeto.');
    }
});

// Rota para criar usuário
app.post('/admin/create-user', requireLogin, uploadNone.none(), async (req, res) => {
    try {
        console.log('🆕 Criando novo usuário');
        console.log('Body:', req.body);
        
        const { username, email, password, role } = req.body;
        
        // Validar dados obrigatórios
        if (!username || !email || !password || !role) {
            console.log('❌ Campos obrigatórios não fornecidos');
            return res.redirect('/dashboard?error=Todos os campos são obrigatórios');
        }
        
        // Verificar se usuário já existe
        const existingUser = await User.findOne({ 
            $or: [
                { username: username },
                { email: email.toLowerCase() }
            ]
        });
        
        if (existingUser) {
            console.log('❌ Usuário ou email já existe');
            return res.redirect('/dashboard?error=Usuário ou email já existe');
        }
        
        // Validar role
        if (!['admin', 'user'].includes(role)) {
            console.log('❌ Role inválido');
            return res.redirect('/dashboard?error=Tipo de usuário inválido');
        }
        
        // Criptografar senha
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Criar novo usuário
        const newUser = new User({
            username: username,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: role
        });
        
        await newUser.save();
        
        // Log da atividade
        const log = new ActivityLog({
            username: req.user.username,
            action: 'USER_CREATE',
            details: `Usuário criado: ${username} (${role})`
        });
        await log.save();
        
        console.log('✅ Usuário criado com sucesso:', username);
        res.redirect('/dashboard?success=Usuário criado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        res.redirect('/dashboard?error=Erro interno do servidor');
    }
});

// Rota para solicitar reset de senha
app.post('/forgot-password', uploadNone.none(), async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.render('forgot-password', { 
                message: 'Se este email estiver cadastrado, você receberá instruções para redefinir sua senha.',
                type: 'info'
            });
        }
        
        // Gerar token de reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetToken = resetToken;
        user.resetTokenExpires = Date.now() + 3600000; // 1 hora
        await user.save();
        
        // Enviar email
        // URL dinâmica baseada no ambiente
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? `https://${req.get('host')}` 
            : `http://localhost:${PORT}`;
        const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@portfolio.com',
            to: user.email,
            subject: 'Redefinição de Senha - Meu Portfólio',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background-color: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
                        
                        <!-- Header -->
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">🔐 Redefinição de Senha</h1>
                            <p style="color: #64748b; font-size: 16px; margin: 0;">Seu Portfólio - Sistema de Gerenciamento</p>
                        </div>
                        
                        <!-- Conteúdo -->
                        <div style="margin-bottom: 30px;">
                            <p style="font-size: 18px; color: #1f2937; margin-bottom: 15px;">Olá <strong style="color: #1e40af;">${user.username}</strong>,</p>
                            <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 25px;">
                                Você solicitou a redefinição de sua senha no sistema Meu Portfólio. 
                                Clique no botão abaixo para criar uma nova senha:
                            </p>
                        </div>
                        
                        <!-- Botão Principal -->
                        <div style="text-align: center; margin: 40px 0;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; 
                                      background-color: #059669; 
                                      color: #ffffff !important; 
                                      padding: 18px 40px; 
                                      text-decoration: none; 
                                      border-radius: 8px; 
                                      font-weight: bold; 
                                      font-size: 18px; 
                                      font-family: Arial, sans-serif;
                                      border: none;">
                                CLIQUE AQUI PARA REDEFINIR SUA SENHA
                            </a>
                        </div>
                        
                        <!-- Link alternativo -->
                        <div style="text-align: center; margin: 20px 0;">
                            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                                Se o botão acima não funcionar, copie e cole este link no seu navegador:
                            </p>
                            <p style="font-size: 14px; color: #1e40af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                                ${resetUrl}
                            </p>
                        </div>
                        
                        <!-- Aviso de Segurança -->
                        <div style="background-color: #fef3c7; 
                                    border-left: 5px solid #f59e0b; 
                                    padding: 20px; 
                                    margin: 30px 0; 
                                    border-radius: 8px;">
                            <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold; font-size: 16px;">
                                ⚠️ Importante:
                            </p>
                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                Este link expira em <strong>1 hora</strong> por motivos de segurança. 
                                Se não foi você quem solicitou, ignore este email.
                            </p>
                        </div>
                        
                        <!-- Link Alternativo -->
                        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
                            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; font-weight: bold;">
                                Se o botão não funcionar, copie e cole este link:
                            </p>
                            <p style="margin: 0; word-break: break-all;">
                                <a href="${resetUrl}" style="color: #1e40af; text-decoration: underline; font-size: 14px;">
                                    ${resetUrl}
                                </a>
                            </p>
                        </div>
                        
                        <!-- Footer -->
                        <div style="text-align: center; margin-top: 40px; padding-top: 25px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                📧 Email automático - Não responda a esta mensagem
                            </p>
                            <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">
                                🚀 <strong>Meu Portfólio</strong> - Sistema de Gerenciamento de Projetos
                            </p>
                        </div>
                        
                    </div>
                </div>
            `
        };
        
        try {
            const info = await sendEmail(mailOptions);
            console.log('📧 Email de reset enviado com sucesso!');
            console.log('Message ID:', info.messageId || 'SendGrid');
            
            // Log da atividade
            const log = new ActivityLog({
                username: user.username,
                action: 'PASSWORD_RESET_REQUEST',
                details: `Email de reset enviado para ${user.email}`
            });
            await log.save();
            
        } catch (emailError) {
            console.error('❌ Erro ao enviar email:', emailError);
            return res.render('forgot-password', { 
                message: 'Erro ao enviar email. Verifique sua conexão e tente novamente.',
                type: 'error'
            });
        }
        
        res.render('forgot-password', { 
            message: 'Se este email estiver cadastrado, você receberá instruções para redefinir sua senha.',
            type: 'success'
        });
        
    } catch (error) {
        console.error('Erro ao processar reset de senha:', error);
        res.render('forgot-password', { 
            message: 'Erro interno. Tente novamente mais tarde.',
            type: 'error'
        });
    }
});

// Rota para exibir formulário de reset de senha
app.get('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.render('reset-password', { 
                token: null,
                message: 'Token inválido ou expirado.',
                type: 'error'
            });
        }
        
        res.render('reset-password', { 
            token: token,
            message: null,
            type: null
        });
        
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        res.render('reset-password', { 
            token: null,
            message: 'Erro interno. Tente novamente mais tarde.',
            type: 'error'
        });
    }
});

// Rota para processar nova senha
app.post('/reset-password/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            return res.render('reset-password', { 
                token: token,
                message: 'As senhas não coincidem.',
                type: 'error'
            });
        }
        
        if (password.length < 6) {
            return res.render('reset-password', { 
                token: token,
                message: 'A senha deve ter pelo menos 6 caracteres.',
                type: 'error'
            });
        }
        
        const user = await User.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.render('reset-password', { 
                token: null,
                message: 'Token inválido ou expirado.',
                type: 'error'
            });
        }
        
        // Atualizar senha
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetToken = undefined;
        user.resetTokenExpires = undefined;
        await user.save();
          // Log da atividade
        const log = new ActivityLog({
            username: user.username,
            action: 'PASSWORD_RESET_SUCCESS',
            details: 'Senha redefinida via email'
        });
        await log.save();

        console.log(`✅ Senha redefinida com sucesso para usuário: ${user.username}`);

        // TEMPORÁRIO: renderizar página de sucesso para debug
        res.render('reset-password', { 
            token: null,
            message: 'Sua senha foi redefinida com sucesso! Você será redirecionado para o login em alguns segundos...',
            type: 'success'
        });
        
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        res.render('reset-password', { 
            token: req.params.token,
            message: 'Erro interno. Tente novamente mais tarde.',
            type: 'error'
        });
    }
});

// Rota de teste para email (desenvolvimento)
app.get('/test-email', async (req, res) => {
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@portfolio.com',
            to: 'admin@portfolio.com',
            subject: 'Teste de Email - Meu Portfólio',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #3B82F6; text-align: center;">Teste de Email</h2>
                    <p>Este é um email de teste para verificar se o sistema de envio está funcionando.</p>
                    <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('Email de teste enviado:', info.messageId);
        
        // Se usando Ethereal, mostrar URL de preview
        if (info.messageId && nodemailer.getTestMessageUrl) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('Preview URL:', previewUrl);
            
            return res.json({
                success: true,
                messageId: info.messageId,
                previewUrl: previewUrl
            });
        }
        
        res.json({
            success: true,
            messageId: info.messageId
        });
        
    } catch (error) {
        console.error('Erro ao enviar email de teste:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Rota para página de teste de email
app.get('/email-test', (req, res) => {
    res.render('email-test');
});

// Rota para exibir página de esqueci minha senha
app.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { message: null, type: null });
});

// API endpoint para listar projetos
app.get('/api/projects', requireLogin, async (req, res) => {
    try {
        const projects = await Project.find({}).populate('category').sort({ createdAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Erro ao buscar projetos via API:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ================== ROTAS MFA (Multi-Factor Authentication) ==================

// Rota para configurar MFA (apenas para admins)
app.get('/mfa-setup', requireLogin, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.redirect('/dashboard?error=Acesso negado - apenas administradores');
        }
        
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.redirect('/login.html');
        }
        
        if (user.mfaEnabled) {
            return res.redirect('/dashboard?message=MFA já está habilitado');
        }
        
        // Gerar secret para TOTP
        const secret = speakeasy.generateSecret({
            name: `Meu Portfólio (${user.username})`,
            issuer: 'Meu Portfólio - Admin Panel',
            length: 32
        });
        
        // Gerar QR Code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        
        res.render('mfa-setup', {
            user: user,
            secret: secret.base32,
            qrCode: qrCodeUrl,
            manualEntryKey: secret.base32
        });
        
    } catch (error) {
        console.error('Erro na configuração MFA:', error);
        res.redirect('/dashboard?error=Erro ao configurar MFA');
    }
});

// Rota para confirmar configuração MFA
app.post('/mfa-setup', requireLogin, uploadNone.none(), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.redirect('/dashboard?error=Acesso negado');
        }
        
        const { secret, token } = req.body;
        
        if (!secret || !token) {
            return res.redirect('/mfa-setup?error=Campos obrigatórios');
        }
        
        // Verificar token TOTP
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2
        });
        
        if (!verified) {
            return res.redirect('/mfa-setup?error=Código inválido. Tente novamente.');
        }
        
        // Gerar códigos de backup
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push({
                code: crypto.randomBytes(4).toString('hex').toUpperCase(),
                used: false
            });
        }
        
        // Salvar no banco
        const user = await User.findById(req.user.userId);
        user.mfaEnabled = true;
        user.mfaSecret = secret;
        user.mfaBackupCodes = backupCodes;
        await user.save();
        
        // Log da atividade
        const log = new ActivityLog({
            username: user.username,
            action: 'MFA_ENABLED',
            details: 'MFA habilitado para conta admin'
        });
        await log.save();
        
        console.log(`🔐 MFA habilitado para usuário: ${user.username}`);
        
        res.render('mfa-backup-codes', {
            user: user,
            backupCodes: backupCodes.map(bc => bc.code)
        });
        
    } catch (error) {
        console.error('Erro ao confirmar MFA:', error);
        res.redirect('/mfa-setup?error=Erro interno');
    }
});

// Rota para verificação MFA no login
app.get('/mfa-verify', (req, res) => {
    const tempSessionToken = req.cookies.tempSessionToken;
    
    if (!tempSessionToken || !activeSessions.has(tempSessionToken)) {
        return res.redirect('/login.html?error=Sessão expirada');
    }
    
    const sessionData = activeSessions.get(tempSessionToken);
    if (!sessionData.pendingMFA) {
        return res.redirect('/login.html');
    }
    
    res.render('mfa-verify', {
        username: sessionData.username
    });
});

// Rota para processar verificação MFA
app.post('/mfa-verify', uploadNone.none(), async (req, res) => {
    try {
        const tempSessionToken = req.cookies.tempSessionToken;
        const { token } = req.body;
        
        if (!tempSessionToken || !activeSessions.has(tempSessionToken)) {
            return res.redirect('/login.html?error=Sessão expirada');
        }
        
        const sessionData = activeSessions.get(tempSessionToken);
        if (!sessionData.pendingMFA) {
            return res.redirect('/login.html');
        }
        
        const user = await User.findById(sessionData.userId);
        if (!user || !user.mfaEnabled) {
            return res.redirect('/login.html?error=Configuração inválida');
        }
        
        let verified = false;
        
        // Verificar código TOTP
        if (token.length === 6) {
            verified = speakeasy.totp.verify({
                secret: user.mfaSecret,
                encoding: 'base32',
                token: token,
                window: 2
            });
        }
        
        // Se falhou, tentar código de backup
        if (!verified && token.length === 8) {
            const backupCode = user.mfaBackupCodes.find(bc => 
                bc.code.toUpperCase() === token.toUpperCase() && !bc.used
            );
            
            if (backupCode) {
                backupCode.used = true;
                await user.save();
                verified = true;
                
                console.log(`🔑 Código de backup usado: ${token}`);
            }
        }
        
        if (!verified) {
            return res.render('mfa-verify', {
                username: sessionData.username,
                error: 'Código inválido. Tente novamente.'
            });
        }
        
        // MFA verificado com sucesso - criar sessão permanente
        const finalSessionToken = createSessionToken();
        const finalSessionData = {
            userId: user._id.toString(),
            username: user.username,
            role: user.role,
            createdAt: new Date()
        };
        
        // Remover sessão temporária
        activeSessions.delete(tempSessionToken);
        res.clearCookie('tempSessionToken');
        
        // Criar sessão final
        activeSessions.set(finalSessionToken, finalSessionData);
        res.cookie('sessionToken', finalSessionToken, {
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            httpOnly: false,
            secure: false
        });
        
        // Log da atividade
        const log = new ActivityLog({
            username: user.username,
            action: 'MFA_LOGIN_SUCCESS',
            details: 'Login com MFA realizado com sucesso'
        });
        await log.save();
        
        console.log(`🔐 Login MFA bem-sucedido: ${user.username}`);
        res.redirect('/dashboard');
        
    } catch (error) {
        console.error('Erro na verificação MFA:', error);
        res.render('mfa-verify', {
            username: 'Usuário',
            error: 'Erro interno. Tente novamente.'
        });
    }
});

// Rota para desabilitar MFA
app.post('/mfa-disable', requireLogin, uploadNone.none(), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.redirect('/dashboard?error=Acesso negado');
        }
        
        const { password } = req.body;
        const user = await User.findById(req.user.userId);
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.redirect('/dashboard?error=Senha incorreta');
        }
        
        user.mfaEnabled = false;
        user.mfaSecret = null;
        user.mfaBackupCodes = [];
        await user.save();
        
        // Log da atividade
        const log = new ActivityLog({
            username: user.username,
            action: 'MFA_DISABLED',
            details: 'MFA desabilitado para conta admin'
        });
        await log.save();
        
        console.log(`🔓 MFA desabilitado para usuário: ${user.username}`);
        res.redirect('/dashboard?success=MFA desabilitado com sucesso');
        
    } catch (error) {
        console.error('Erro ao desabilitar MFA:', error);
        res.redirect('/dashboard?error=Erro ao desabilitar MFA');
    }
});

// ================== FIM DAS ROTAS MFA ==================

// ================== ROTA DE DEBUG ADMIN ==================
app.get('/debug-admin', async (req, res) => {
    try {
        console.log('🔧 DEBUG: Verificando usuário admin');
        
        // Verificar se usuário existe
        let adminUser = await User.findOne({ username: 'admin' });
        
        if (!adminUser) {
            console.log('❌ Usuário admin não encontrado. Criando...');
            const hashedPassword = await bcrypt.hash('Danilo30!', 10);
            adminUser = new User({
                username: 'admin',
                email: 'admin@sistema.com',
                password: hashedPassword,
                isAdmin: true,
                mfaEnabled: false
            });
            await adminUser.save();
            console.log('✅ Usuário admin criado!');
        }
        
        // Teste de senha
        const passwordTest = await bcrypt.compare('Danilo30!', adminUser.password);
        
        const debug = {
            userExists: !!adminUser,
            userId: adminUser._id,
            username: adminUser.username,
            isAdmin: adminUser.isAdmin,
            passwordHash: adminUser.password.substring(0, 20) + '...',
            passwordTest: passwordTest,
            totalUsers: await User.countDocuments(),
            mongoConnected: mongoose.connection.readyState === 1
        };
        
        res.json({
            status: 'success',
            message: 'Debug do usuário admin',
            debug: debug,
            instructions: {
                login: 'Use: admin / Danilo30!',
                url: '/login.html'
            }
        });
        
    } catch (error) {
        console.error('Erro no debug admin:', error);
        res.json({
            status: 'error',
            message: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📋 Dashboard disponível em: http://localhost:${PORT}/dashboard`);
    console.log(`🔐 MFA Setup disponível em: http://localhost:${PORT}/mfa-setup`);
});
