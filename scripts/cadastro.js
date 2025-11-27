// scripts/cadastro.js - VERSÃO CORRIGIDA SEM ALERT
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 CADASTRO SCRIPT CARREGADO!');
    
    const form = document.getElementById("cadastroForm");

    if (form) {
        form.addEventListener("submit", async function(e) {
            e.preventDefault();
            console.log('📝 FORMULÁRIO SUBMETIDO');

            // Coletar dados REAIS do formulário
            const getValue = (id) => {
                const element = document.getElementById(id);
                return element ? element.value.trim() : '';
            };

            // DADOS REAIS DO FORMULÁRIO - CPF LIMPO
            const dados = {
                nome: getValue('nome'),
                cpf: getValue('cpf').replace(/\D/g, ''), // ← CPF APENAS NÚMEROS
                email: getValue('email'),
                tipo: getValue('tipo'),
                senha: getValue('senha'),
                matricula: getValue('matricula'),
                data_admissao: getValue('data_admissao'),
                salario: getValue('salario')
            };

            console.log('📤 DADOS PARA CADASTRO:', dados);

            // Validações básicas
            if (!dados.nome) {
                showMessage('❌ Nome é obrigatório', 'error');
                return;
            }

            if (!dados.cpf || dados.cpf.length !== 11) {
                showMessage('❌ CPF inválido', 'error');
                return;
            }

            if (!dados.senha || dados.senha.length < 8) {
                showMessage('❌ Senha deve ter pelo menos 8 caracteres', 'error');
                return;
            }

            if (dados.tipo !== 'cliente' && !dados.matricula) {
                showMessage('❌ Matrícula é obrigatória para funcionários', 'error');
                return;
            }

            try {
                // Mostrar loading
                const btn = document.getElementById('cadastroBtn');
                const btnText = document.getElementById('btnText');
                btn.classList.add('btn-loading');
                btnText.textContent = 'Criando conta...';

                console.log('🔄 ENVIANDO PARA API...');
                
                const response = await fetch('/api/auth/cadastro', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(dados)
                });

                console.log('📥 STATUS:', response.status);

                const data = await response.json();
                console.log('📥 RESPOSTA:', data);

                // Remover loading
                btn.classList.remove('btn-loading');
                btnText.textContent = 'Criar Conta';

                if (data.success) {
                    showMessage('✅ ' + data.message, 'success');
                    console.log('✅ USUÁRIO CRIADO:', data.usuario);
                    
                    // Redirecionar para login
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    showMessage('❌ ' + data.message, 'error');
                }

            } catch (error) {
                console.error('❌ ERRO:', error);
                showMessage('❌ Erro de conexão: ' + error.message, 'error');
                
                // Remover loading em caso de erro
                const btn = document.getElementById('cadastroBtn');
                const btnText = document.getElementById('btnText');
                btn.classList.remove('btn-loading');
                btnText.textContent = 'Criar Conta';
            }
        });
    } else {
        console.error('❌ FORMULÁRIO NÃO ENCONTRADO!');
    }

    // Função para mostrar mensagens na página
    function showMessage(message, type) {
        const messageEl = document.getElementById('cadastroMessage');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            // Scroll para a mensagem
            messageEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Auto-esconder mensagens de sucesso após 5 segundos
            if (type === 'success') {
                setTimeout(() => {
                    messageEl.style.display = 'none';
                }, 5000);
            }
        } else {
            console.log('Mensagem:', message, 'Tipo:', type);
        }
    }
});