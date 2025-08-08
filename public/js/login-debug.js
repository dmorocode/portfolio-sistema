// Script completo para o formulário de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevenir envio padrão
            
            console.log('Formulário sendo enviado...');
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            console.log('Dados do formulário:', {
                username: username,
                password: password ? '[SENHA FORNECIDA]' : '[SENHA VAZIA]'
            });
            
            // Verificar se os campos estão preenchidos
            if (!username || !password) {
                alert('Por favor, preencha todos os campos!');
                return false;
            }
            
            // Desabilitar o botão de submit
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="flex items-center justify-center"><svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Entrando...</span>';
            
            // Criar dados do formulário
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);
            
            // Enviar dados via fetch
            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                credentials: 'include' // Incluir cookies/sessão
            })
            .then(response => {
                console.log('Response status:', response.status);
                
                if (response.redirected) {
                    console.log('Redirecionamento detectado para:', response.url);
                    window.location.href = response.url;
                    return;
                }
                
                if (response.ok) {
                    // Se o login for bem-sucedido, redirecionar para dashboard
                    console.log('Login bem-sucedido, redirecionando...');
                    window.location.href = '/dashboard';
                } else {
                    throw new Error('Credenciais inválidas');
                }
            })
            .catch(error => {
                console.error('Erro no login:', error);
                alert('Erro no login: ' + error.message);
                
                // Reabilitar o botão
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            });
            
            return false;
        });
    }
});
