// scripts/util.js
class ApiService {
    static baseURL = 'http://localhost:9000/api';

    // ========== AUTH & USERS ==========
    static async login(cpf, senha) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cpf, senha })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    }

    static async cadastro(dadosUsuario) {
        try {
            const response = await fetch(`${this.baseURL}/auth/cadastro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosUsuario)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro no cadastro:', error);
            throw error;
        }
    }

    static async verificarSessao(userId) {
        try {
            const response = await fetch(`${this.baseURL}/auth/sessao/${userId}`);
            return await response.json();
        } catch (error) {
            console.error('Erro ao verificar sessão:', error);
            throw error;
        }
    }

    static async atualizarPerfil(userId, dados) {
        try {
            const response = await fetch(`${this.baseURL}/auth/perfil/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dados)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            throw error;
        }
    }

    static async alterarSenha(userId, senhaAtual, novaSenha) {
        try {
            const response = await fetch(`${this.baseURL}/auth/senha/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            throw error;
        }
    }

    // ========== VOOS ==========
    static async getVoos() {
        try {
            const response = await fetch(`${this.baseURL}/voos`);
            const data = await response.json();
            
            if (data.success) {
                return data.voos;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar voos:', error);
            throw error;
        }
    }

    static async getVooPorId(id) {
        try {
            const response = await fetch(`${this.baseURL}/voos/${id}`);
            const data = await response.json();
            
            if (data.success) {
                return data.voo;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar voo:', error);
            throw error;
        }
    }

    static async getVoosDisponiveis(data = null, origem = null, destino = null) {
        try {
            let url = `${this.baseURL}/voos/disponiveis`;
            const params = new URLSearchParams();
            
            if (data) params.append('data', data);
            if (origem) params.append('origem', origem);
            if (destino) params.append('destino', destino);
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url);
            const result = await response.json();
            
            if (result.success) {
                return result.voos;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erro ao buscar voos disponíveis:', error);
            throw error;
        }
    }

    static async criarVoo(dadosVoo) {
        try {
            const response = await fetch(`${this.baseURL}/voos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosVoo)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao criar voo:', error);
            throw error;
        }
    }

    static async atualizarVoo(id, dadosVoo) {
        try {
            const response = await fetch(`${this.baseURL}/voos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosVoo)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar voo:', error);
            throw error;
        }
    }

    static async deletarVoo(id) {
        try {
            const response = await fetch(`${this.baseURL}/voos/${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao deletar voo:', error);
            throw error;
        }
    }

    // ========== PASSAGENS ==========
    static async comprarPassagem(dadosCompra) {
        try {
            const response = await fetch(`${this.baseURL}/passagens/comprar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosCompra)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao comprar passagem:', error);
            throw error;
        }
    }

    static async getPassagensUsuario(usuarioId) {
        try {
            const response = await fetch(`${this.baseURL}/passagens/usuario/${usuarioId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.passagens;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar passagens:', error);
            throw error;
        }
    }

    static async getTodasPassagens() {
        try {
            const response = await fetch(`${this.baseURL}/passagens`);
            const data = await response.json();
            
            if (data.success) {
                return data;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar todas as passagens:', error);
            throw error;
        }
    }

    static async cancelarPassagem(id) {
        try {
            const response = await fetch(`${this.baseURL}/passagens/cancelar/${id}`, {
                method: 'POST'
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao cancelar passagem:', error);
            throw error;
        }
    }

    static async fazerCheckin(passagemId, bagagens = 0) {
        try {
            const response = await fetch(`${this.baseURL}/passagens/checkin/${passagemId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bagagens })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao fazer check-in:', error);
            throw error;
        }
    }

    static async getCheckinsPorVoo(vooId) {
        try {
            const response = await fetch(`${this.baseURL}/passagens/checkins/voo/${vooId}`);
            const data = await response.json();
            
            if (data.success) {
                return data.checkins;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar check-ins:', error);
            throw error;
        }
    }

    // ========== PAGAMENTOS ==========
    static async processarPagamento(dadosPagamento) {
        try {
            const response = await fetch(`${this.baseURL}/pagamento/processar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dadosPagamento)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            throw error;
        }
    }

    static async getFormasPagamento() {
        try {
            const response = await fetch(`${this.baseURL}/pagamento/formas-disponiveis`);
            const data = await response.json();
            
            if (data.success) {
                return data.formasPagamento;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar formas de pagamento:', error);
            throw error;
        }
    }

    static async verificarStatusPagamento(passagemId) {
        try {
            const response = await fetch(`${this.baseURL}/pagamento/status/${passagemId}`);
            return await response.json();
        } catch (error) {
            console.error('Erro ao verificar status do pagamento:', error);
            throw error;
        }
    }

    // ========== USUÁRIOS ==========
    static async getUsuarios() {
        try {
            const response = await fetch(`${this.baseURL}/usuarios`);
            const data = await response.json();
            
            if (data.success) {
                return data.usuarios;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            throw error;
        }
    }

    static async getUsuariosPorTipo(tipo) {
        try {
            const response = await fetch(`${this.baseURL}/usuarios/tipo/${tipo}`);
            const data = await response.json();
            
            if (data.success) {
                return data.usuarios;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar usuários por tipo:', error);
            throw error;
        }
    }

    static async getPilotosDisponiveis() {
        try {
            const response = await fetch(`${this.baseURL}/usuarios/pilotos/disponiveis`);
            const data = await response.json();
            
            if (data.success) {
                return data.pilotos;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar pilotos disponíveis:', error);
            throw error;
        }
    }

    static async getComissariosDisponiveis() {
        try {
            const response = await fetch(`${this.baseURL}/usuarios/comissarios/disponiveis`);
            const data = await response.json();
            
            if (data.success) {
                return data.comissarios;
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Erro ao buscar comissários disponíveis:', error);
            throw error;
        }
    }

    static async atualizarStatusUsuario(userId, status) {
        try {
            const response = await fetch(`${this.baseURL}/usuarios/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar status do usuário:', error);
            throw error;
        }
    }

    // ========== TRIPULAÇÃO ==========
    static async adicionarComissarioVoo(vooId, comissarioId, funcao = 'comissario') {
        try {
            const response = await fetch(`${this.baseURL}/voos/${vooId}/tripulacao`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comissario_id: comissarioId, funcao })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao adicionar comissário:', error);
            throw error;
        }
    }

    static async removerComissarioVoo(vooId, comissarioId) {
        try {
            const response = await fetch(`${this.baseURL}/voos/${vooId}/tripulacao/${comissarioId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao remover comissário:', error);
            throw error;
        }
    }
}

// ========== UTILITÁRIOS DE FORMATAÇÃO ==========
class Formatadores {
    static formatarCPF(cpf) {
        if (!cpf) return '';
        
        cpf = cpf.replace(/\D/g, '');
        
        if (cpf.length > 11) {
            cpf = cpf.substring(0, 11);
        }
        
        if (cpf.length <= 11) {
            cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
            cpf = cpf.replace(/(\d{3})(\d)/, '$1.$2');
            cpf = cpf.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        
        return cpf;
    }

    static formatarTelefone(telefone) {
        if (!telefone) return '';
        
        telefone = telefone.replace(/\D/g, '');
        
        if (telefone.length > 11) {
            telefone = telefone.substring(0, 11);
        }
        
        if (telefone.length > 10) {
            telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
            telefone = telefone.replace(/(\d{5})(\d)/, '$1-$2');
        } else if (telefone.length > 6) {
            telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
            telefone = telefone.replace(/(\d{4})(\d)/, '$1-$2');
        } else if (telefone.length > 2) {
            telefone = telefone.replace(/(\d{2})(\d)/, '($1) $2');
        }
        
        return telefone;
    }

    static formatarData(data) {
        if (!data) return '';
        
        if (data instanceof Date) {
            return data.toLocaleDateString('pt-BR');
        }
        
        // Para strings no formato YYYY-MM-DD
        const partes = data.split('-');
        if (partes.length === 3) {
            return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
        
        return data;
    }

    static formatarMoeda(valor) {
        if (!valor && valor !== 0) return '';
        
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    static formatarHora(hora) {
        if (!hora) return '';
        
        // Remove segundos se presentes
        return hora.substring(0, 5);
    }

    static getNomeTipoUsuario(tipo) {
        const tipos = {
            'cliente': 'Cliente',
            'comissario': 'Comissário',
            'piloto': 'Piloto',
            'diretor': 'Diretor'
        };
        return tipos[tipo] || tipo;
    }

    static getEmojiTipoUsuario(tipo) {
        const emojis = {
            'cliente': '👤',
            'comissario': '👨‍✈️',
            'piloto': '✈️',
            'diretor': '👑'
        };
        return emojis[tipo] || '❓';
    }
}

// ========== GERENCIAMENTO DE ESTADO ==========
class GerenciadorEstado {
    static getUsuario() {
        try {
            const user = localStorage.getItem('user');
            return user ? JSON.parse(user) : null;
        } catch (error) {
            console.error('Erro ao recuperar usuário do localStorage:', error);
            return null;
        }
    }

    static setUsuario(usuario) {
        try {
            localStorage.setItem('user', JSON.stringify(usuario));
        } catch (error) {
            console.error('Erro ao salvar usuário no localStorage:', error);
        }
    }

    static removerUsuario() {
        try {
            localStorage.removeItem('user');
        } catch (error) {
            console.error('Erro ao remover usuário do localStorage:', error);
        }
    }

    static verificarAutenticacao() {
        const usuario = this.getUsuario();
        if (!usuario) {
            window.location.href = '/login.html';
            return false;
        }
        return usuario;
    }

    static redirecionarPorTipo(usuario = null) {
        const user = usuario || this.getUsuario();
        if (!user) return;

        let pagina = '';
        switch (user.tipo) {
            case 'cliente':
                pagina = 'cliente.html';
                break;
            case 'comissario':
                pagina = 'comissario.html';
                break;
            case 'piloto':
                pagina = 'piloto.html';
                break;
            case 'diretor':
                pagina = 'diretor.html';
                break;
            default:
                pagina = 'index.html';
        }

        if (window.location.pathname !== `/${pagina}`) {
            window.location.href = pagina;
        }
    }
}

// ========== UTILITÁRIOS DE INTERFACE ==========
class InterfaceUtils {
    static mostrarLoading(elemento) {
        if (elemento) {
            elemento.innerHTML = '<div class="loading"></div> <span>Carregando...</span>';
            elemento.disabled = true;
        }
    }

    static esconderLoading(elemento, textoOriginal = 'Salvar') {
        if (elemento) {
            elemento.innerHTML = `<span>${textoOriginal}</span>`;
            elemento.disabled = false;
        }
    }

    static mostrarMensagem(elemento, mensagem, tipo = 'info') {
        if (elemento) {
            elemento.textContent = mensagem;
            elemento.className = `message ${tipo}`;
            elemento.style.display = 'block';
            
            // Auto-esconder mensagens de sucesso
            if (tipo === 'success') {
                setTimeout(() => {
                    this.esconderMensagem(elemento);
                }, 5000);
            }
        }
    }

    static esconderMensagem(elemento) {
        if (elemento) {
            elemento.style.display = 'none';
        }
    }

    static confirmarAcao(mensagem) {
        return confirm(mensagem);
    }

    static formatarTempoRestante(dataPartida) {
        const agora = new Date();
        const partida = new Date(dataPartida);
        const diferenca = partida - agora;
        
        if (diferenca < 0) return 'Voo realizado';
        
        const horas = Math.floor(diferenca / (1000 * 60 * 60));
        const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
        
        if (horas > 0) {
            return `${horas}h ${minutos}m`;
        } else {
            return `${minutos}m`;
        }
    }
}

// Exportar para uso global
window.ApiService = ApiService;
window.Formatadores = Formatadores;
window.GerenciadorEstado = GerenciadorEstado;
window.InterfaceUtils = InterfaceUtils;

console.log('Utils carregados: ApiService, Formatadores, GerenciadorEstado, InterfaceUtils');