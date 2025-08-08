# 📁 Meu Portfólio - Sistema de Gerenciamento

Sistema completo de portfólio desenvolvido em Node.js com autenticação, gerenciamento de projetos e MFA (Multi-Factor Authentication).

## 🚀 Funcionalidades

### 🔐 Autenticação e Segurança
- ✅ Sistema de login/logout com sessões seguras
- ✅ Redefinição de senha via email (Gmail)
- ✅ **MFA (Autenticação de Dois Fatores)** para administradores
  - QR Code para configuração no Google Authenticator/Authy
  - Códigos de backup de emergência
  - Verificação TOTP (Time-based One-Time Password)

### 📋 Gerenciamento de Projetos
- ✅ Upload de múltiplos arquivos
- ✅ Upload de imagens de capa
- ✅ Categorização de projetos
- ✅ CRUD completo (Create, Read, Update, Delete)

### 👥 Gerenciamento de Usuários
- ✅ Criação de usuários por administradores
- ✅ Diferentes níveis de acesso (admin/user)
- ✅ Logs de auditoria completos

### 🎨 Interface
- ✅ Design moderno e responsivo
- ✅ Tema claro/escuro
- ✅ Feedback visual (loading, sucesso, erro)
- ✅ Notificações toast

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** + **Express.js**
- **MongoDB** + **Mongoose**
- **EJS** (Template Engine)
- **Multer** (Upload de arquivos)
- **Nodemailer** (Envio de emails)
- **Speakeasy** (TOTP para MFA)
- **QRCode** (Geração de QR Codes)

### Frontend
- **HTML5** + **CSS3** + **JavaScript**
- **Bootstrap** (Framework CSS)
- **Font Awesome** (Ícones)

## ⚙️ Configuração

### 1. Variáveis de Ambiente (.env)
```env
MONGODB_URI=sua_string_de_conexao_mongodb
GMAIL_USER=seu_email@gmail.com
GMAIL_PASS=sua_senha_de_app_gmail
NODE_ENV=production
```

### 2. Instalação
```bash
npm install
npm start
```

### 3. Configuração do Gmail
1. Acesse sua conta Google
2. Ative a verificação em duas etapas
3. Gere uma "Senha de app" para o projeto
4. Use essa senha na variável `GMAIL_PASS`

## 🔧 Estrutura do Projeto

```
meuportifolio/
├── 📁 models/           # Modelos MongoDB
│   ├── User.js
│   ├── Project.js
│   ├── Category.js
│   └── Log.js
├── 📁 public/           # Arquivos estáticos
│   ├── 📁 css/
│   ├── 📁 js/
│   └── 📁 uploads/
├── 📁 views/            # Templates EJS
│   ├── dashboard.ejs
│   ├── mfa-setup.ejs
│   ├── mfa-verify.ejs
│   └── ...
├── server.js            # Servidor principal
└── package.json
```

## 🔐 Configuração MFA

### Para Administradores:
1. Faça login no dashboard
2. Clique em "Configurar MFA"
3. Escaneie o QR Code com Google Authenticator/Authy
4. Digite o código de 6 dígitos para confirmar
5. Salve os códigos de backup em local seguro

### Login com MFA:
1. Digite usuário e senha normalmente
2. Na tela de verificação MFA, digite o código do app
3. Em emergência, use um dos códigos de backup

## 🚀 Deploy

### Heroku
```bash
git init
git add .
git commit -m "Initial commit"
heroku create seu-app-name
git push heroku main
```

### Railway/Render
1. Conecte seu repositório GitHub
2. Configure as variáveis de ambiente
3. Deploy automático

## 📧 Suporte

Para suporte ou dúvidas, entre em contato através do sistema.

---

Desenvolvido com ❤️ usando Node.js
