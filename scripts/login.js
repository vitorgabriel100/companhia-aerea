// scripts/login.js
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById("loginForm");
    const messageDiv = document.getElementById("loginMessage");
    const loginBtn = document.getElementById("loginBtn");
    const cpfInput = document.getElementById('cpf');
    const senhaInput = document.getElementById('senha');

    console.log('✅ Login script externo carregado!');

    // Formatação automática do CPF
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
        cpfInput.focus();
    }

    // Navegação por teclado
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement.id === 'cpf') {
                senhaInput.focus();
                e.preventDefault();
            } else if (activeElement.id === 'senha') {
                form.dispatchEvent(new Event('submit'));
                e.preventDefault();
            }
        }
    });

    // Verificar se há usuário logado
    function checkExistingSession() {
        const user = localStorage.getItem('user');
        if (user) {
            try {
                const userData = JSON.parse(user);
                console.log('🔍 Usuário encontrado no localStorage:', userData);
                
                fetch(`/api/auth/sessao/${userData.id}`)
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            // ✅ CORREÇÃO: A rota de sessão retorna 'usuario'
                            const userFromServer = data.usuario; 
                            
                            if (!userFromServer || !userFromServer.nome) {
                                localStorage.removeItem('user');
                                throw new Error("Dados de usuário inválidos do servidor");
                            }

                            console.log('✅ Sessão válida, redirecionando...');
                            showMessage(`Bem-vindo de volta, ${userFromServer.nome}! Redirecionando...`, 'success');
                            setTimeout(() => {
                                redirectByUserType(userFromServer);
                            }, 1000);
                        } else {
                            localStorage.removeItem('user');
                            console.log('❌ Sessão expirada, localStorage limpo');
                        }
                    })
                    .catch(error => {
                        console.error('❌ Erro ao verificar sessão:', error);
                        localStorage.removeItem('user');
                    });
            } catch (error) {
                console.error('❌ Erro ao parsear usuário do localStorage:', error);
                localStorage.removeItem('user');
            }
        }
    }

    if (form) {
        form.addEventListener("submit", async function(e) {
            e.preventDefault();
            console.log('📝 Formulário de login submetido');
            
            const cpfLimpo = cpfInput.value.replace(/\D/g, '');
            const senha = senhaInput.value.trim();

            console.log('🔐 Tentando login com:', { cpf: cpfLimpo });
            hideMessage();

            if (cpfLimpo.length !== 11) {
                showMessage("CPF inválido. Use 11 dígitos.", "error");
                cpfInput.focus();
                return;
            }
            if (!senha || senha.length < 4) {
                showMessage("A senha deve ter pelo menos 4 caracteres.", "error");
                senhaInput.focus();
                return;
            }

            try {
                showLoading(true);

                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf: cpfLimpo, senha: senha })
                });

                console.log('📡 Resposta do servidor:', response.status);

                const data = await response.json();
                console.log('📊 Dados da resposta:', data);

                if (data.success && data.usuario) { // <-- Verificação extra
                    // ✅ ***** CORREÇÃO *****
                    // O backend envia 'data.usuario', não 'data.user'
                    const user = data.usuario;
                    
                    showMessage(`✅ Login realizado com sucesso! Bem-vindo, ${user.nome}!`, "success");
                    
                    localStorage.setItem('user', JSON.stringify(user));
                    console.log('💾 Usuário salvo no localStorage:', user);
                    
                    addSuccessAnimation();
                    
                    setTimeout(() => {
                        if (data.redirectTo) {
                            window.location.href = data.redirectTo;
                        } else {
                            redirectByUserType(user);
                        }
                    }, 2000);
                    
                } else {
                    showMessage(data.message || "Erro desconhecido no login", "error");
                    showLoading(false); 
                    addErrorAnimation();
                }
            } catch (error) {
                console.error('❌ Erro no login:', error);
                showMessage("❌ Erro de conexão. Verifique sua internet e tente novamente.", "error");
                showLoading(false); 
                addErrorAnimation();
            }
        });
    }

    function showMessage(message, type) {
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = `message ${type}`;
            messageDiv.style.display = 'block';
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log('💬 Mensagem:', message, 'Tipo:', type);
            if (type === 'success') setTimeout(hideMessage, 5000);
        }
    }

    function hideMessage() {
        if (messageDiv) messageDiv.style.display = 'none';
    }

    function showLoading(show) {
        const btnText = document.getElementById('btnText');
        if (loginBtn) {
            if (show) {
                loginBtn.classList.add('btn-loading');
                if (btnText) btnText.textContent = 'Entrando...';
                loginBtn.disabled = true;
            } else {
                loginBtn.classList.remove('btn-loading');
                if (btnText) btnText.textContent = 'Entrar';
                loginBtn.disabled = false;
            }
        }
    }

    // Espera o objeto 'user'
    function redirectByUserType(user) { 
        if (!user || typeof user.tipo === 'undefined') {
            console.error('Redirecionamento falhou: objeto de usuário ou tipo é inválido.', user);
            window.location.href = '/cliente'; // Fallback
            return;
        }
        console.log('🔄 Redirecionando para:', user.tipo);
        
        let redirectUrl = '/';
        switch (user.tipo) {
            case 'cliente': redirectUrl = '/cliente'; break;
            case 'comissario': redirectUrl = '/comissario'; break;
            case 'piloto': redirectUrl = '/piloto'; break;
            case 'diretor': redirectUrl = '/diretor'; break;
        }
        window.location.href = redirectUrl;
    }

    function addSuccessAnimation() { /* ... (código de animação) ... */ }
    function addErrorAnimation() { /* ... (código de animação) ... */ }
    function createParticles() { /* ... (código de partículas) ... */ }

    // Inicialização
    createParticles();
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
        showMessage(decodeURIComponent(error), 'error');
    }
    checkExistingSession(); 
});