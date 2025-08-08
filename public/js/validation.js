document.addEventListener('DOMContentLoaded', () => {
    // Função para mostrar mensagem de erro
    function showError(input, message) {
        let errorDiv = input.parentNode.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message text-red-500 text-xs mt-1';
            input.parentNode.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        input.classList.add('border-red-500');
    }

    // Função para limpar mensagem de erro
    function clearError(input) {
        const errorDiv = input.parentNode.querySelector('.error-message');
        if (errorDiv) {
            errorDiv.textContent = '';
        }
        input.classList.remove('border-red-500');
    }

    // Validação de formulários antes do envio
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            let hasErrors = false;
            const requiredInputs = form.querySelectorAll('input[required], textarea[required]');
            
            requiredInputs.forEach(input => {
                clearError(input);
                if (!input.value.trim()) {
                    showError(input, 'Este campo é obrigatório.');
                    hasErrors = true;
                }
            });

            if (hasErrors) {
                e.preventDefault();
            }
        });
    });
});
