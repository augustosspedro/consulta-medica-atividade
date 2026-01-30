//======================================================================
// "BANCO DE DADOS" FALSO DO HOSPITAL (NOVO)
//======================================================================
const hospitalDB = {
    especialidades: [
        { id: 'cardio', nome: 'Cardiologia' },
        { id: 'pedia', nome: 'Pediatria' },
        { id: 'neuro', nome: 'Neurologia' }
    ],
    medicos: [
        { id: 'dr_silva', nome: 'Dr. João Silva', especialidadeId: 'cardio' },
        { id: 'dra_souza', nome: 'Dra. Ana Souza', especialidadeId: 'cardio' },
        { id: 'dr_rocha', nome: 'Dr. Pedro Rocha', especialidadeId: 'pedia' },
        { id: 'dra_lima', nome: 'Dra. Maria Lima', especialidadeId: 'neuro' }
    ],
    // Horários brutos que cada médico disponibiliza
    horariosDisponiveis: {
        dr_silva: [
            { data: '2025-11-10', hora: '09:00' },
            { data: '2025-11-10', hora: '09:30' },
            { data: '2025-11-10', hora: '10:00' },
            { data: '2025-11-12', hora: '09:00' }
        ],
        dra_souza: [
            { data: '2025-11-11', hora: '14:00' },
            { data: '2025-11-11', hora: '14:30' }
        ],
        dr_rocha: [
            { data: '2025-11-10', hora: '08:00' },
            { data: '2025-11-10', hora: '08:30' }
        ],
        dra_lima: [
            { data: '2025-11-12', hora: '11:00' },
            { data: '2025-11-12', hora: '11:30' }
        ]
    }
};


//======================================================================
// BANCO DE DADOS FALSO (LocalStorage) E FUNÇÕES AUXILIARES
//======================================================================

const DB_KEY = 'consultasDB';

function getConsultas() {
    return JSON.parse(localStorage.getItem(DB_KEY)) || [];
}

function saveConsultas(consultas) {
    localStorage.setItem(DB_KEY, JSON.stringify(consultas));
}

function checkAuth() {
    const user = sessionStorage.getItem('loggedInUser');
    if (!user) {
        window.location.href = 'index.html';
    }
    return user;
}

function logout() {
    sessionStorage.clear(); 
    window.location.href = 'index.html';
}

function formatarData(dataISO) {
    const [ano, mes, dia] = dataISO.split('-');
    return `${dia}/${mes}/${ano}`;
}


//======================================================================
// LÓGICA DA PÁGINA DE LOGIN (index.html)
//======================================================================
// (Sem mudanças, igual ao anterior)
function setupLogin() {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault(); 
            const usuario = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;

            if (usuario === 'secretaria' && senha === '123') {
                sessionStorage.setItem('loggedInUser', 'secretaria');
                window.location.href = 'secretaria.html'; 

            } else if (usuario === 'medico' && senha === '456') {
                sessionStorage.setItem('loggedInUser', 'medico');
                window.location.href = 'medico.html'; 

            } else if (usuario === 'paciente' && senha === '789') {
                sessionStorage.setItem('loggedInUser', 'paciente');
                sessionStorage.setItem('patientName', 'Carlos Silva'); 
                window.location.href = 'paciente.html';

            } else {
                errorMsg.textContent = 'Usuário ou senha inválidos.';
                errorMsg.style.display = 'block';
            }
        });
    }
}


//======================================================================
// LÓGICA DO PAINEL DO PACIENTE (paciente.html) - *** GRANDES MUDANÇAS ***
//======================================================================

function setupPaciente() {
    const user = checkAuth();
    if (user !== 'paciente') {
        logout();
        return;
    }

    const nomePaciente = sessionStorage.getItem('patientName');
    
    // Elementos do DOM
    document.getElementById('header-paciente').textContent = `Bem-vindo, ${nomePaciente}!`;
    const formSolicitacao = document.getElementById('form-solicitacao');
    const listaMinhasConsultas = document.getElementById('lista-minhas-consultas');
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Elementos do novo formulário
    const especialidadeSelect = document.getElementById('especialidade');
    const medicoSelect = document.getElementById('medico');
    const horariosContainer = document.getElementById('horarios-container');

    // 1. Popular Especialidades no carregamento da página
    function popularEspecialidades() {
        hospitalDB.especialidades.forEach(esp => {
            const option = document.createElement('option');
            option.value = esp.id;
            option.textContent = esp.nome;
            especialidadeSelect.appendChild(option);
        });
    }

    // 2. Atualizar Médicos quando Especialidade muda
    especialidadeSelect.addEventListener('change', function() {
        const especialidadeId = this.value;
        // Limpa seleção anterior
        medicoSelect.innerHTML = '<option value="">-- Selecione um médico --</option>';
        horariosContainer.innerHTML = '<p>-- Aguardando médico --</p>';

        if (especialidadeId) {
            const medicosFiltrados = hospitalDB.medicos.filter(m => m.especialidadeId === especialidadeId);
            
            medicosFiltrados.forEach(medico => {
                const option = document.createElement('option');
                option.value = medico.id;
                option.textContent = medico.nome;
                medicoSelect.appendChild(option);
            });
            medicoSelect.disabled = false;
        } else {
            medicoSelect.disabled = true;
        }
    });

    // 3. Atualizar Horários quando Médico muda
    medicoSelect.addEventListener('change', function() {
        const medicoId = this.value;
        horariosContainer.innerHTML = ''; // Limpa

        if (medicoId) {
            // Pega todos os horários da "agenda" do médico
            const todosHorarios = hospitalDB.horariosDisponiveis[medicoId] || [];
            
            // Pega as consultas já salvas (pendentes ou confirmadas)
            const consultasAgendadas = getConsultas().filter(
                c => c.medicoId === medicoId && (c.status === 'pendente' || c.status === 'confirmada')
            );

            // Filtra os horários, removendo os que já estão agendados
            const horariosLivres = todosHorarios.filter(horario => {
                // Verifica se existe alguma consulta agendada para este mesmo dia e hora
                return !consultasAgendadas.some(
                    c => c.data === horario.data && c.hora === horario.hora
                );
            });

            // Renderiza os horários livres
            if (horariosLivres.length > 0) {
                horariosLivres.forEach((horario, index) => {
                    const slotId = `slot-${index}`;
                    // Usamos JSON no value para guardar data e hora juntos
                    const valorSlot = JSON.stringify({ data: horario.data, hora: horario.hora });
                    
                    const div = document.createElement('div');
                    div.className = 'horario-slot';
                    div.innerHTML = `
                        <input type="radio" name="horario_selecionado" id="${slotId}" value='${valorSlot}' required>
                        <label for="${slotId}">${formatarData(horario.data)} às ${horario.hora}</label>
                    `;
                    horariosContainer.appendChild(div);
                });
            } else {
                horariosContainer.innerHTML = '<p>Nenhum horário disponível para este médico.</p>';
            }
        } else {
            horariosContainer.innerHTML = '<p>-- Aguardando médico --</p>';
        }
    });

    // 4. Enviar a Solicitação (Form Submit)
    formSolicitacao.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Pega os dados dos selects
        const especialidadeNome = especialidadeSelect.options[especialidadeSelect.selectedIndex].text;
        const medicoId = medicoSelect.value;
        const medicoNome = medicoSelect.options[medicoSelect.selectedIndex].text;
        
        // Pega o horário (que é um JSON string)
        const horarioRadio = document.querySelector('input[name="horario_selecionado"]:checked');
        
        if (!horarioRadio) {
            alert('Por favor, selecione um horário.');
            return;
        }
        
        const { data, hora } = JSON.parse(horarioRadio.value);
        const motivo = document.getElementById('motivo').value;

        // Cria a nova consulta
        const novaConsulta = {
            id: Date.now(),
            paciente: nomePaciente,
            especialidade: especialidadeNome,
            medicoId: medicoId,
            medicoNome: medicoNome,
            data: data,
            hora: hora,
            motivo: motivo,
            status: 'pendente' 
        };

        const consultas = getConsultas();
        consultas.push(novaConsulta);
        saveConsultas(consultas);
        
        // Reseta o formulário e recarrega tudo
        formSolicitacao.reset();
        medicoSelect.innerHTML = '<option value="">-- Aguardando especialidade --</option>';
        medicoSelect.disabled = true;
        horariosContainer.innerHTML = '<p>-- Aguardando médico --</p>';
        
        renderizarMinhasConsultas();
        // Atualiza os horários disponíveis (pois um foi pego)
        medicoSelect.dispatchEvent(new Event('change')); 
    });

    // 5. Renderizar a lista "Minhas Solicitações" (Atualizada)
    function renderizarMinhasConsultas() {
        const consultas = getConsultas();
        const minhasConsultas = consultas.filter(c => c.paciente === nomePaciente);
        
        listaMinhasConsultas.innerHTML = ''; 
        if (minhasConsultas.length === 0) {
            listaMinhasConsultas.innerHTML = '<li>Nenhuma solicitação encontrada.</li>';
            return;
        }

        minhasConsultas.forEach(consulta => {
            const item = document.createElement('li');
            item.className = 'consulta-item';

            let statusClass = '';
            if (consulta.status === 'pendente') statusClass = 'status-pendente';
            else if (consulta.status === 'confirmada') statusClass = 'status-confirmada';
            else if (consulta.status === 'indisponivel') statusClass = 'status-indisponivel';

            item.innerHTML = `
                <div class="info">
                    <strong>${formatarData(consulta.data)} às ${consulta.hora}</strong>
                    <span>Com ${consulta.medicoNome} (${consulta.especialidade})</span>
                    <span>Motivo: ${consulta.motivo}</span>
                </div>
                <div class="status ${statusClass}">
                    ${consulta.status.toUpperCase()}
                </div>
            `;
            listaMinhasConsultas.appendChild(item);
        });
    }

    // Carregamento inicial
    popularEspecialidades();
    renderizarMinhasConsultas();
}


//======================================================================
// LÓGICA DO PAINEL DA SECRETÁRIA (secretaria.html) - *** ATUALIZADO ***
//======================================================================

// ... (Todo o código anterior do app.js permanece o mesmo) ...


//======================================================================
// LÓGICA DO PAINEL DA SECRETÁRIA (secretaria.html) - *** ATUALIZADO ***
//======================================================================

function setupSecretaria() {
    const user = checkAuth();
    if (user !== 'secretaria') {
        logout(); 
        return;
    }

    // Elementos do DOM
    const listaConsultasEl = document.getElementById('lista-consultas');
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // *** NOVO CÓDIGO AQUI ***
    const limparConsultasBtn = document.getElementById('limpar-consultas-btn');

    // Adiciona o evento de clique para o novo botão
    limparConsultasBtn.addEventListener('click', function() {
        // Pedir confirmação, pois é uma ação destrutiva
        if (confirm('TEM CERTEZA?\n\nEsta ação apagará TODAS as consultas (pendentes e confirmadas) e reabrirá todos os horários para teste.')) {
            
            // A "limpeza" é apenas salvar um array vazio no localStorage
            saveConsultas([]); 
            
            // Atualiza a tela da secretária (que ficará vazia)
            renderizarAgendaSecretaria(); 
            
            alert('Agenda limpa! Todos os horários de teste estão disponíveis novamente.');
        }
    });
    // *** FIM DO NOVO CÓDIGO ***


    // Renderiza a agenda (agora só de gerenciamento)
    renderizarAgendaSecretaria();

    // Função de renderização ATUALIZADA para mostrar mais dados
    function renderizarAgendaSecretaria() {
        const consultas = getConsultas();
        listaConsultasEl.innerHTML = ''; 

        if (consultas.length === 0) {
            listaConsultasEl.innerHTML = '<li>Nenhuma solicitação de consulta.</li>';
            return;
        }

        consultas.sort((a, b) => {
            if (a.status === 'pendente' && b.status !== 'pendente') return -1;
            if (a.status !== 'pendente' && b.status === 'pendente') return 1;
            return 0;
        });

        consultas.forEach(consulta => {
            const item = document.createElement('li');
            item.className = 'consulta-item';

            let statusClass = '';
            if (consulta.status === 'pendente') statusClass = 'status-pendente';
            else if (consulta.status === 'confirmada') statusClass = 'status-confirmada';
            else if (consulta.status === 'indisponivel') statusClass = 'status-indisponivel';

            item.innerHTML = `
                <div class="info">
                    <strong>${consulta.paciente}</strong> (Dr/Dra: ${consulta.medicoNome})<br>
                    Data: ${formatarData(consulta.data)} às ${consulta.hora}
                    <span>Motivo: ${consulta.motivo}</span>
                </div>
                <div class="status ${statusClass}">
                    ${consulta.status.toUpperCase()}
                </div>
                <div class="acoes">
                    ${consulta.status === 'pendente' ? 
                    `<button class="btn btn-sm btn-success" data-id="${consulta.id}" data-acao="confirmada">Confirmar</button>
                     <button class="btn btn-sm btn-warning" data-id="${consulta.id}" data-acao="indisponivel">Indisponível</button>` 
                    : ''}
                </div>
            `;
            listaConsultasEl.appendChild(item);
        });
    }

    // Lógica dos botões (Confirmar / Indisponível)
    listaConsultasEl.addEventListener('click', function(e) {
        if (e.target.dataset.id) {
            const id = parseInt(e.target.dataset.id);
            const acao = e.target.dataset.acao;
            
            atualizarStatusConsulta(id, acao);
        }
    });

    function atualizarStatusConsulta(id, novoStatus) {
        const consultas = getConsultas();
        const index = consultas.findIndex(c => c.id === id);

        if (index !== -1) {
            consultas[index].status = novoStatus;
            
            if (novoStatus === 'confirmada') {
                sessionStorage.setItem('novaNotificacaoMedico', 'true');
            }
            
            saveConsultas(consultas);
            renderizarAgendaSecretaria(); 
        }
    }
}

// ... (Restante do código do app.js, setupMedico, etc.) ...


//======================================================================
// LÓGICA DO PAINEL DO MÉDICO (medico.html) - *** ATUALIZADO ***
//======================================================================

function setupMedico() {
    const user = checkAuth();
    if (user !== 'medico') {
        logout();
        return;
    }

    const listaConsultasMedicoEl = document.getElementById('lista-consultas-medico');
    const notificacaoEl = document.getElementById('notificacao-medico');
    document.getElementById('logout-btn').addEventListener('click', logout);

    if (sessionStorage.getItem('novaNotificacaoMedico') === 'true') {
        notificacaoEl.textContent = 'Novas consultas foram confirmadas pela secretária!';
        notificacaoEl.style.display = 'block';
        
        setTimeout(() => {
            notificacaoEl.style.display = 'none';
            sessionStorage.removeItem('novaNotificacaoMedico');
        }, 5000);
    }

    renderizarAgendaMedico();

    // Função de renderização ATUALIZADA
    function renderizarAgendaMedico() {
        const consultas = getConsultas();
        
        // FILTRAGEM IMPORTANTE:
        // O médico logado (que é Fixo, 'medico') só vê consultas 
        // associadas aos médicos do "seu" ID.
        // **Para este protótipo, vamos simplificar e o 'medico' logado vê TUDO**
        // Em um sistema real, o login 'medico' seria 'dr_silva' e ele só veria as dele.
        
        const consultasConfirmadas = consultas.filter(c => c.status === 'confirmada');

        listaConsultasMedicoEl.innerHTML = ''; 

        if (consultasConfirmadas.length === 0) {
            listaConsultasMedicoEl.innerHTML = '<li>Nenhuma consulta confirmada para hoje.</li>';
            return;
        }
        
        consultasConfirmadas.sort((a, b) => new Date(a.data) - new Date(b.data));

        consultasConfirmadas.forEach(consulta => {
            const item = document.createElement('li');
            item.className = 'consulta-item';
            
            item.innerHTML = `
                <div class="info">
                    <strong>${consulta.paciente}</strong><br>
                    Data: ${formatarData(consulta.data)} às ${consulta.hora}
                    <span>Motivo: ${consulta.motivo}</span>
                    <span>(Agendado com: ${consulta.medicoNome})</span> 
                </div>
                <div class="status status-confirmada">
                    CONFIRMADA
                </div>
            `;
            listaConsultasMedicoEl.appendChild(item);
        });
    }
}