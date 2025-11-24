// scripts/cadastro.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("cadastroForm");
    const messageDiv = document.getElementById("cadastroMessage");
    const cadastroBtn = document.getElementById("cadastroBtn");
    const cpfInput = document.getElementById('cpf');
    const tipoSelect = document.getElementById('tipo');
    const matriculaGroup = document.getElementById('matriculaGroup');
    const funcionarioFields = document.getElementById('funcionarioFields');
    const matriculaInput = document.getElementById('matricula');
    const telefoneInput = document.getElementById('telefone');
    const dataNascimentoInput = document.getElementById('data_nascimento');
    const salarioInput = document.getElementById('salario');
    const dataAdmissaoInput = document.getElementById('data_admissao');
    const senhaInput = document.getElementById('senha');
    const confirmarSenhaInput = document.getElementById('confirmarSenha');

    console.log('Cadastro script carregado!');

    // (Todas as funções de formatação de CPF, data, etc. permanecem as mesmas)
    if (cpfInput) {
        cpfInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 11) value = value.substring(0, 11);
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            e.target.value = value;
        });
    }
    if (tipoSelect) {
        tipoSelect.addEventListener('change', function() {
            const tipo = this.value;
            if (matriculaGroup) matriculaGroup.style.display = (tipo !== 'cliente' && tipo !== '') ? 'block' : 'none';
            if (funcionarioFields) funcionarioFields.style.display = (tipo !== 'cliente' && tipo !== '') ? 'block' : 'none';
            updateMatriculaPlaceholder(tipo);
        });
        tipoSelect.dispatchEvent(new Event('change'));
    }
    function updateMatriculaPlaceholder(tipo) { /* ... (sem alterações) ... */ }
    if (matriculaInput) { /* ... (sem alterações) ... */ }
    if (telefoneInput) { /* ... (sem alterações) ... */ }
    if (dataNascimentoInput) { /* ... (sem alterações) ... */ }
    if (salarioInput) { /* ... (sem alterações) ... */ }
    if (dataAdmissaoInput) { dataAdmissaoInput.value = new Date().toISOString().split('T')[0]; }
    if (senhaInput && confirmarSenhaInput) { /* ... (sem alterações) ... */ }


    // Submit do formulário
    if (form) {
        form.addEventListener("submit", async function(e) {
            e.preventDefault();
            console.log('Formulário de cadastro submetido');
            
            const formData = new FormData(form);
            const dados = {};
            formData.forEach((value, key) => { dados[key] = value.trim(); });

            console.log('Dados do cadastro:', dados);
            hideMessage();

            // Validações
            const cpfLimpo = dados.cpf.replace(/\D/g, '');
            if (!dados.nome || !cpfLimpo || !dados.senha || !dados.confirmarSenha || !dados.tipo) {
                showMessage("Por favor, preencha todos os campos obrigatórios.", "error");
                return;
            }
            if (cpfLimpo.length !== 11) {
                showMessage("CPF inválido. Use 11 dígitos.", "error");
                cpfInput.focus();
                return;
            }
            if (dados.senha.length < 4) {
                showMessage("A senha deve ter pelo menos 4 caracteres.", "error");
                senhaInput.focus();
                return;
            }
            if (dados.senha !== dados.confirmarSenha) {
                showMessage("As senhas não coincidem.", "error");
                confirmarSenhaInput.focus();
                return;
            }
            if (dados.tipo !== 'cliente' && !dados.matricula) {
                showMessage("Matrícula é obrigatória para funcionários.", "error");
                matriculaInput.focus();
                return;
            }

            try {
                showLoading(true);
                const dadosEnvio = {
                    ...dados,
                    cpf: cpfLimpo, 
                    salario: dados.salario ? parseFloat(dados.salario.replace(/\./g, '').replace(',', '.')) : undefined,
                    matricula: dados.tipo !== 'cliente' ? dados.matricula : undefined
                };
                delete dadosEnvio.confirmarSenha;

                console.log('📤 Enviando dados para cadastro:', dadosEnvio);

                const response = await fetch('/api/auth/cadastro', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadosEnvio)
                });

                console.log('Resposta do servidor:', response.status);
                const data = await response.json();
                console.log('Dados da resposta:', data);

                if (data.success && data.usuario) { // <-- Verificação extra
                    // ***** CORREÇÃO AQUI *****
                    // O backend envia 'data.usuario', não 'data.user'
                    const user = data.usuario; 

                    showMessage("Cadastro realizado com sucesso! Redirecionando...", "success");
                    
                    localStorage.setItem('user', JSON.stringify(user)); 
                    
                    setTimeout(() => {
                        if (data.redirectTo) {
                            window.location.href = data.redirectTo;
                        } else {
                            redirectByUserType(user); 
                        }
                    }, 2000);
                    
                } else {
                    showMessage(data.message || "Erro desconhecido no cadastro", "error");
                    showLoading(false);
                }
            } catch (error) {
                console.error('Erro no cadastro:', error);
                showMessage("Erro de conexão. Verifique sua internet e tente novamente.", "error");
                showLoading(false);
            }
        });
    }

    function showMessage(message, type) {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (type === 'success') setTimeout(hideMessage, 5000);
        }
    }

    function hideMessage() {
        if (messageDiv) messageDiv.style.display = 'none';
    }

    function showLoading(show) {
        const btnText = document.getElementById('btnText'); // Assumindo que o botão de cadastro tem id="btnText" no span
        const aCadastroBtn = document.getElementById('cadastroBtn'); // Assumindo que o botão tem id="cadastroBtn"

        const button = aCadastroBtn || cadastroBtn; 
        const textSpan = btnText || button?.querySelector('span');

        if (button) {
            if (show) {
                if (textSpan) textSpan.textContent = 'Cadastrando...';
                button.classList.add('btn-loading'); 
                button.disabled = true;
            } else {
                if (textSpan) textSpan.textContent = 'Cadastrar';
                button.classList.remove('btn-loading');
                button.disabled = false;
            }
        }
    }

    function redirectByUserType(user) { 
        if (!user || typeof user.tipo === 'undefined') {
            console.error('Redirecionamento falhou: objeto de usuário ou tipo é inválido.', user);
            window.location.href = '/cliente'; // Fallback
            return;
        }
        console.log('Redirecionando para:', user.tipo);
        
        let redirectUrl = '/';
        switch (user.tipo) {
            case 'cliente': redirectUrl = '/cliente'; break;
            case 'comissario': redirectUrl = '/comissario'; break;
            case 'piloto': redirectUrl = '/piloto'; break;
            case 'diretor': redirectUrl = '/diretor'; break;
        }
        window.location.href = redirectUrl;
    }
});