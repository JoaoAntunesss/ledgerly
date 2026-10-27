/* Ledgerly — Portuguese (pt-PT) layer. Translates the interface text at runtime so the app code stays in English.
   Enable it in Settings → Notifications & language. Anything not listed here simply stays in English. */
(function () {
  'use strict';
  var lang; try { lang = localStorage.getItem('ledgerly.lang'); } catch (e) { }
  if (lang !== 'pt') return;
  document.documentElement.lang = 'pt-PT';

  var D = {
    'Home': 'Início',
    'Bills': 'Contas',
    'Money': 'Dinheiro',
    'More': 'Mais',
    'Add something': 'Adicionar',
    'All sections': 'Todas as secções',
    'Install app': 'Instalar app',
    '📲 Install app': '📲 Instalar app',
    '📲 Install the app on this phone': '📲 Instalar a app neste telemóvel',
    'Good night': 'Boa noite',
    'Good morning': 'Bom dia',
    'Good afternoon': 'Boa tarde',
    'Good evening': 'Boa noite',
    'Welcome to Ledgerly 👋': 'Bem-vindo ao Ledgerly 👋',
    'Everything stays on your device unless you turn on sync. What do you want to manage?': 'Tudo fica no teu dispositivo, a menos que atives a sincronização. O que queres gerir?',
    '🏠 Home & family': '🏠 Casa e família',
    'Bills, subscriptions, loans, savings, shared costs': 'Contas, subscrições, créditos, poupanças, despesas partilhadas',
    '💼 My business': '💼 O meu negócio',
    'Invoices, clients, expenses, VAT': 'Faturas, clientes, despesas, IVA',
    '✨ Both': '✨ Ambos',
    'Everything in one place': 'Tudo num só sítio',
    'Look around with demo data first': 'Explorar primeiro com dados de demonstração',
    '＋ Bill': '＋ Conta',
    '📷 Receipt': '📷 Recibo',
    '＋ Expense': '＋ Despesa',
    '＋ Income': '＋ Rendimento',
    '＋ Subscription': '＋ Subscrição',
    '＋ Invoice': '＋ Fatura',
    'Left over this month (estimate)': 'Sobra este mês (estimativa)',
    'Monthly costs (estimate)': 'Custos mensais (estimativa)',
    'Where your money goes': 'Para onde vai o teu dinheiro',
    'Last 6 months': 'Últimos 6 meses',
    'Money in': 'Entradas',
    'Money out': 'Saídas',
    'per month': 'por mês',
    'Home bills': 'Contas da casa',
    'Other expenses': 'Outras despesas',
    'Net worth': 'Património líquido',
    'Still owed on loans': 'Ainda em dívida nos créditos',
    '💼 Work': '💼 Trabalho',
    'What do you use Ledgerly for?': 'Para que usas o Ledgerly?',
    'Home and business': 'Casa e negócio',
    'Home & family only': 'Só casa e família',
    'My business only': 'Só o meu negócio',
    'Your name / business name': 'O teu nome / nome do negócio',
    '🧾 Bill': '🧾 Conta',
    'Electricity, water, gas, internet…': 'Luz, água, gás, internet…',
    'Photo → expense, automatic': 'Foto → despesa, automático',
    '💸 Expense': '💸 Despesa',
    'Type it in': 'Escrever à mão',
    '💰 Income': '💰 Rendimento',
    'Salary or other': 'Salário ou outro',
    '🔁 Subscription': '🔁 Subscrição',
    'Netflix, gym, IPTV…': 'Netflix, ginásio, IPTV…',
    '🏦 Loan': '🏦 Crédito',
    'Mortgage, car, credit': 'Casa, carro, crédito',
    '📄 Invoice': '📄 Fatura',
    'Bill a client': 'Faturar a um cliente',
    '🎯 Savings goal': '🎯 Objetivo de poupança',
    'Holidays, emergency fund': 'Férias, fundo de emergência',
    'Install on your iPhone': 'Instalar no iPhone',
    'Got it': 'Percebi',
    'Close': 'Fechar',
    'Sign in with Google (optional)': 'Entrar com Google (opcional)',
    'Sign in with Google': 'Entrar com Google',
    'Google account sync': 'Sincronização com conta Google',
    'Sign out': 'Terminar sessão',
    'Encryption password (use the same on every device)': 'Palavra-passe de cifra (a mesma em todos os dispositivos)',
    'Firebase project ID': 'ID do projeto Firebase',
    'Database URL': 'URL da base de dados',
    'Firebase Web API key': 'Chave API Web do Firebase',
    'One-time Firebase setup': 'Configuração única do Firebase',
    // navigation & pages
    'Dashboard': 'Painel', 'Home & family': 'Casa e família', 'Utilities': 'Contas da casa', 'Subscriptions': 'Subscrições', 'Income': 'Rendimentos', 'Loans': 'Créditos', 'Wealth & goals': 'Património e metas',
    'Split expenses': 'Dividir despesas', 'Warranties & deadlines': 'Garantias e prazos', 'Work': 'Trabalho', 'Invoices': 'Faturas', 'Clients': 'Clientes', 'Expenses': 'Despesas', 'VAT report': 'Relatório de IVA', 'Settings': 'Definições',
    'Your data never leaves this browser. Back it up in Settings.': 'Os teus dados ficam neste browser. Faz cópias de segurança nas Definições.',
    'Loans & credit': 'Créditos e empréstimos', 'Wealth': 'Património',
    // common buttons
    'Cancel': 'Cancelar', 'Save': 'Guardar', 'Edit': 'Editar', 'Delete': 'Apagar', 'Import': 'Importar', 'Replace': 'Substituir', 'Estimate': 'Estimar', 'Unlock': 'Desbloquear', 'Copy': 'Copiar', 'Reset': 'Repor', 'Join': 'Entrar', 'Leave': 'Sair', 'Erase': 'Apagar tudo', 'Load demo': 'Carregar demo',
    '+ New invoice': '+ Nova fatura', '+ Add bill': '+ Adicionar conta', '+ Add income': '+ Adicionar rendimento', '+ Add line': '+ Adicionar linha', '+ Add loan': '+ Adicionar crédito', '+ Add subscription': '+ Adicionar subscrição', '+ Deadline': '+ Prazo', '+ Expense': '+ Despesa', '+ Goal': '+ Meta',
    '+ New client': '+ Novo cliente', '+ New expense': '+ Nova despesa', '+ New group': '+ Novo grupo', '+ Account': '+ Conta', '+ Warranty': '+ Garantia',
    'Export CSV': 'Exportar CSV', 'Import backup': 'Importar cópia', 'Export backup (.json)': 'Exportar cópia (.json)', 'Load demo data': 'Carregar dados de demonstração', 'Erase everything': 'Apagar tudo', 'Budgets': 'Orçamentos',
    'Mark as paid': 'Marcar como paga', 'Mark unpaid': 'Marcar por pagar', 'Duplicate': 'Duplicar', 'Print / Save PDF': 'Imprimir / Guardar PDF', '← Invoices': '← Faturas', '← All groups': '← Todos os grupos', 'Edit group': 'Editar grupo',
    '📷 Import photo / PDF': '📷 Importar foto / PDF', '📷 Scan receipts': '📷 Ler recibos', '🏦 Import bank statement': '🏦 Importar extrato bancário', 'Cancel ': 'Cancelar', 'Reactivate': 'Reativar',
    'Forecast next bill': 'Prever próxima conta', 'Add offer': 'Adicionar oferta', 'Edit offer': 'Editar oferta', 'Remove offer': 'Remover oferta', 'Sync now': 'Sincronizar agora', 'Create family space': 'Criar espaço de família', 'Join with a code': 'Entrar com um código', 'Leave family space': 'Sair do espaço de família',
    'Set a PIN lock': 'Definir bloqueio com PIN', 'Change / remove PIN': 'Alterar / remover PIN', 'Choose backup folder': 'Escolher pasta de cópia', 'Change backup folder': 'Mudar pasta de cópia', 'Re-enable auto backup': 'Reativar cópia automática', 'Turn on reminders': 'Ativar lembretes', 'Notifications are on ✓': 'Notificações ativas ✓',
    'Delete bill': 'Apagar conta', 'Delete client': 'Apagar cliente', 'Delete expense': 'Apagar despesa', 'Delete group': 'Apagar grupo', 'Delete subscription': 'Apagar subscrição',
    // dashboard
    'Paid in': 'Pago em', 'Outstanding': 'Por receber', 'Overdue': 'Em atraso', 'Expenses in': 'Despesas em', 'Subscriptions / month': 'Subscrições / mês', 'Recent invoices': 'Faturas recentes', 'Upcoming & overdue': 'Próximos e em atraso', 'overdue': 'em atraso',
    'Income (net, by payment date)': 'Receitas (líquidas, por data de pagamento)', 'Your month at a glance': 'O teu mês num relance', 'Household bills (your share)': 'Contas da casa (a tua parte)', 'Loan payments': 'Prestações de créditos', 'Other expenses (avg of last 3 months)': 'Outras despesas (média dos últimos 3 meses)', 'Left over': 'Sobra',
    '⚠️ Heads up': '⚠️ Atenção', '💡 Worth a look': '💡 Vale a pena ver', 'Averages from the bills and expenses you registered.': 'Médias a partir das contas e despesas que registaste.',
    'Start in': 'Começa nas', 'No invoices yet.': 'Ainda não há faturas.',
    // invoices
    'Invoice': 'Fatura', 'Number': 'Número', 'Client': 'Cliente', 'Issued': 'Emitida', 'Due': 'Vencimento', 'Status': 'Estado', 'Total': 'Total', 'Issue date': 'Data de emissão', 'Due date': 'Data de vencimento', 'Currency': 'Moeda', 'Repeat': 'Repetir',
    'Does not repeat': 'Não repete', 'Every month': 'Todos os meses', 'Every 3 months': 'A cada 3 meses', 'Every year': 'Todos os anos', 'Line items': 'Linhas', 'Description': 'Descrição', 'Qty': 'Qtd.', 'Unit price': 'Preço unit.', 'VAT': 'IVA', 'VAT %': 'IVA %', 'Amount': 'Valor',
    'Subtotal': 'Subtotal', 'Total due': 'Total a pagar', 'Billed to': 'Faturado a', 'Notes / payment info': 'Notas / dados de pagamento', 'Pay by bank transfer': 'Pagar por transferência', 'New invoice': 'Nova fatura', 'Search number or client…': 'Pesquisar número ou cliente…',
    'draft': 'rascunho', 'sent': 'enviada', 'paid': 'paga', 'all': 'todas', 'Draft': 'Rascunho', 'Sent': 'Enviada', 'Paid': 'Paga', 'Service or product': 'Serviço ou produto', 'Unit': 'Unid.',
    'No invoices yet. Create your first one!': 'Ainda não há faturas. Cria a primeira!', 'Nothing matches.': 'Nada corresponde.', 'Delete invoice?': 'Apagar fatura?', 'This cannot be undone.': 'Isto não pode ser desfeito.',
    // clients / expenses
    'Name': 'Nome', 'Name *': 'Nome *', 'Email': 'Email', 'Tax ID': 'NIF', 'Billed': 'Faturado', 'Address': 'Morada', 'New client': 'Novo cliente', 'Edit client': 'Editar cliente', 'No clients yet.': 'Ainda não há clientes.',
    'Date': 'Data', 'Vendor': 'Fornecedor', 'Vendor *': 'Fornecedor *', 'Category': 'Categoria', 'Note': 'Nota', 'Amount (incl. VAT)': 'Valor (c/ IVA)', 'VAT % in this amount': '% de IVA neste valor', 'New expense': 'Nova despesa', 'Edit expense': 'Editar despesa', 'No expenses yet.': 'Ainda não há despesas.',
    'Groceries': 'Supermercado', 'Food & drinks': 'Restauração', 'Fuel': 'Combustível', 'Health': 'Saúde', 'Home': 'Casa', 'Software': 'Software', 'Equipment': 'Equipamento', 'Travel': 'Viagens', 'Office': 'Escritório', 'Marketing': 'Marketing', 'Taxes & fees': 'Impostos e taxas', 'Services': 'Serviços', 'Other': 'Outros',
    'auto – check': 'auto – confirmar', 'already added': 'já adicionada', 'Monthly budgets': 'Orçamentos mensais', 'Leave empty for no limit.': 'Deixa vazio para não ter limite.', 'This month vs budget': 'Este mês vs orçamento', 'Attachment (photo or PDF)': 'Anexo (foto ou PDF)',
    'Import bank statement': 'Importar extrato bancário', 'Date ': 'Data', 'Import ': 'Importar',
    // utilities
    'Electricity': 'Eletricidade', 'Water': 'Água', 'Gas': 'Gás', 'Internet / TV': 'Internet / TV', 'Mobile': 'Telemóvel', 'Insurance': 'Seguros', 'Rent / condo': 'Renda / condomínio', 'All': 'Todas', 'Add bill': 'Adicionar conta', 'Edit bill': 'Editar conta',
    'Type': 'Tipo', 'Bill date': 'Data da fatura', 'Payment due (optional)': 'Vencimento (opcional)', 'Provider': 'Fornecedor', 'Total amount': 'Valor total', 'Usage (kWh / m³)': 'Consumo (kWh / m³)', 'Paid?': 'Paga?', 'Not paid yet': 'Por pagar',
    'Last bill vs previous': 'Última fatura vs anterior', 'vs a year ago': 'vs há um ano', 'Amount per bill': 'Valor por fatura', 'Change': 'Variação', 'Compare a cheaper offer': 'Comparar uma oferta mais barata', 'You pay now (per year)': 'Pagas agora (por ano)', 'With this offer': 'Com esta oferta',
    'You would save': 'Pouparias', 'You would pay more': 'Pagarias mais', 'Supplier / tariff name': 'Fornecedor / nome do tarifário', 'Fixed fee per month (with VAT)': 'Mensalidade fixa (com IVA)', 'Bill saved': 'Conta guardada', 'Offer saved': 'Oferta guardada', 'Add at least two bills to see a trend.': 'Adiciona pelo menos duas contas para ver a evolução.',
    'Read from your file — please check the values.': 'Lido do teu ficheiro — confirma os valores.', 'Forecast the next': 'Previsão da próxima', 'Days since the period started': 'Dias desde o início do período', 'Days in a billing period': 'Dias num período de faturação',
    'Tip: enter the': 'Dica: indica o', 'total you paid': 'total que pagaste', 'Paid in full': 'Paga',
    // subscriptions
    'Per month': 'Por mês', 'Per year': 'Por ano', 'Active': 'Ativas', 'Saved by cancelling': 'Poupado ao cancelar', 'Where the money goes': 'Para onde vai o dinheiro', 'Cancelled': 'Canceladas', 'Next renewal': 'Próxima renovação', 'Next renewal date': 'Data da próxima renovação', 'Price': 'Preço', 'Cancel': 'Cancelar',
    'Did you forget any of these?': 'Esqueceste-te de alguma destas?', 'Name and price are required': 'Nome e preço são obrigatórios', 'Add subscription': 'Adicionar subscrição', 'Edit subscription': 'Editar subscrição', 'Weekly': 'Semanal', 'Monthly': 'Mensal', 'Yearly': 'Anual', 'Every 3 months ': 'A cada 3 meses',
    'Shared between (people)': 'Partilhada por (pessoas)', 'Free trial?': 'Período de teste?', 'No': 'Não', 'Yes — renews at this price': 'Sim — renova a este preço', 'Note / login email': 'Nota / email de acesso', 'trial': 'teste',
    'Streaming (video)': 'Streaming (vídeo)', 'IPTV / TV': 'IPTV / TV', 'Music / audio': 'Música / áudio', 'Software / apps': 'Software / apps', 'Cloud / storage': 'Cloud / armazenamento', 'Gaming': 'Jogos', 'News / magazines': 'Notícias / revistas', 'Gym / fitness': 'Ginásio / fitness', 'Domains / hosting': 'Domínios / alojamento', 'VPN / security': 'VPN / segurança', 'Donations / Patreon': 'Donativos / Patreon',
    'Domain renewals': 'Renovação de domínios', 'App Store / Google Play subscriptions': 'Subscrições App Store / Google Play', 'Cloud storage (iCloud / Google One)': 'Armazenamento cloud (iCloud / Google One)', 'VPN': 'VPN', 'Password manager': 'Gestor de passwords', 'Gym / sports club': 'Ginásio / clube desportivo', 'Amazon Prime': 'Amazon Prime',
    'AI tools (ChatGPT, Claude…)': 'Ferramentas de IA (ChatGPT, Claude…)', 'Games (Game Pass, PS Plus…)': 'Jogos (Game Pass, PS Plus…)', 'Newspapers / magazines': 'Jornais / revistas', 'Donations / Patreon': 'Donativos / Patreon', 'Car insurance': 'Seguro automóvel', 'Annual car tax (IUC)': 'Imposto de circulação (IUC)', 'Car inspection': 'Inspeção do carro', 'Health / life insurance': 'Seguro de saúde / vida', 'Phone insurance / warranty': 'Seguro / garantia do telemóvel',
    'No subscriptions yet. Add the ones you know, then use the checklist below for the ones you may have forgotten.': 'Ainda não há subscrições. Adiciona as que conheces e usa a lista abaixo para as que te possas ter esquecido.',
    'Tip: check your bank statements and the subscription lists in the App Store / Google Play — that is where forgotten ones hide.': 'Dica: vê os extratos do banco e as listas de subscrições da App Store / Google Play — é onde se escondem as esquecidas.',
    // income / loans
    'Per month (average)': 'Por mês (média)', 'Source': 'Origem', 'Amount (net)': 'Valor (líquido)', 'Next payment': 'Próximo pagamento', 'How often': 'Com que frequência', 'Day of the month it arrives': 'Dia do mês em que entra', 'Add income': 'Adicionar rendimento', 'Edit income': 'Editar rendimento', 'stopped': 'parado', 'Stopped': 'Parado',
    'Monthly ': 'Mensal', 'Yearly (e.g. holiday pay, bonus)': 'Anual (ex.: subsídio de férias, bónus)', 'Total still owed': 'Total ainda em dívida', 'Paid per month': 'Pago por mês', 'Interest still to pay': 'Juros ainda a pagar', 'Still owed (estimate)': 'Ainda em dívida (estimativa)', 'Monthly payment': 'Prestação mensal', 'Ends around': 'Termina por volta de', 'Interest paid / still to pay': 'Juros pagos / a pagar',
    'Add loan': 'Adicionar crédito', 'Edit loan': 'Editar crédito', 'Lender': 'Banco / credor', 'Amount borrowed': 'Montante emprestado', 'Interest rate (% per year)': 'Taxa de juro (% ao ano)', 'Term (months)': 'Prazo (meses)', 'Monthly payment (leave empty to calculate)': 'Prestação mensal (vazio para calcular)', 'Start date': 'Data de início', 'Paid off 🎉': 'Liquidado 🎉',
    // wealth / reminders / split
    'Assets': 'Ativos', 'Debts (loans)': 'Dívidas (créditos)', 'Net worth': 'Património líquido', 'Net worth over time': 'Património líquido ao longo do tempo', 'Accounts': 'Contas', 'Goals': 'Metas', 'Add account': 'Adicionar conta', 'Edit account': 'Editar conta', 'Balance today': 'Saldo hoje', 'Current account': 'Conta à ordem', 'Savings': 'Poupança', 'Investments': 'Investimentos', 'Cash': 'Dinheiro', 'Other asset': 'Outro ativo',
    'Add goal': 'Adicionar meta', 'Edit goal': 'Editar meta', 'Goal *': 'Meta *', 'Target amount': 'Valor alvo', 'Saved so far': 'Poupado até agora', 'Reach it by (optional)': 'Alcançar até (opcional)', 'Reached 🎉': 'Alcançada 🎉', 'Deadlines': 'Prazos', 'Warranties': 'Garantias', 'Add deadline': 'Adicionar prazo', 'Edit deadline': 'Editar prazo', 'What *': 'O quê *', 'Repeats': 'Repete',
    'Once': 'Uma vez', 'every year': 'todos os anos', 'once': 'uma vez', 'Amount (optional)': 'Valor (opcional)', 'soon': 'em breve', 'past': 'passado', 'valid': 'válida', 'expired': 'expirada', 'ends soon': 'a terminar', 'Add warranty': 'Adicionar garantia', 'Edit warranty': 'Editar garantia', 'Item *': 'Artigo *', 'Store': 'Loja', 'Purchase date': 'Data de compra', 'Warranty (months)': 'Garantia (meses)',
    'IRS tax return': 'Declaração de IRS', 'IMI (property tax)': 'IMI', 'Car insurance renewal': 'Renovação do seguro automóvel', 'Home insurance renewal': 'Renovação do seguro da casa', 'Passport / ID card renewal': 'Renovação de passaporte / Cartão de Cidadão', 'Driving licence renewal': 'Renovação da carta de condução',
    'Balances': 'Saldos', 'To settle up': 'Para acertar contas', 'All square 🎉': 'Tudo certo 🎉', 'New group': 'Novo grupo', 'Edit group ': 'Editar grupo', 'Group name *': 'Nome do grupo *', 'People (comma separated, include yourself) *': 'Pessoas (separadas por vírgula, incluindo tu) *', 'What was it? *': 'O que foi? *', 'Amount *': 'Valor *', 'Paid by': 'Pago por', 'Split between': 'Dividido por', 'Expenses ': 'Despesas',
    // VAT
    'Sales (net)': 'Vendas (líquidas)', 'VAT collected': 'IVA liquidado', 'VAT deductible': 'IVA dedutível', 'VAT to pay': 'IVA a pagar', 'Year': 'Ano',
    // settings
    'Your business': 'O teu negócio', 'Business name': 'Nome do negócio', 'IBAN': 'IBAN', 'Invoice defaults': 'Predefinições de fatura', 'Currency (ISO code)': 'Moeda (código ISO)', 'Default VAT %': 'IVA predefinido %', 'People sharing the household bills': 'Pessoas que partilham as contas da casa', 'Number prefix': 'Prefixo de numeração', 'Payment terms (days)': 'Prazo de pagamento (dias)', 'Default invoice footer': 'Rodapé predefinido da fatura',
    'Backup & data': 'Cópia de segurança e dados', 'Security & automatic backup': 'Segurança e cópia automática', 'Notifications & language': 'Notificações e idioma', 'Enter your PIN': 'Introduz o teu PIN', 'Wrong PIN': 'PIN errado', 'Current PIN': 'PIN atual', 'New PIN (4–8 digits)': 'Novo PIN (4–8 dígitos)',
    'Family space (optional)': 'Espaço de família (opcional)', 'Family space': 'Espaço de família', 'Family code': 'Código de família', 'Family code:': 'Código de família:', 'Join a family space': 'Entrar num espaço de família', 'Firebase Realtime Database URL': 'URL da Realtime Database do Firebase', 'Firebase Web API key': 'Chave Web API do Firebase', 'One-time Firebase setup': 'Configuração única do Firebase',
    'Whose? (e.g. Ana)': 'De quem? (ex.: Ana)', 'Visibility': 'Visibilidade', 'Shared with family': 'Partilhado com a família', 'Private (only me)': 'Privado (só eu)', 'private': 'privado', 'What do you share?': 'O que partilham?', 'Share everything (couple)': 'Partilhar tudo (casal)', 'Household only': 'Só a casa',
    'Household only — bills, subscriptions, loans, goals… (salary and business stay private)': 'Só a casa — contas, subscrições, créditos, metas… (salário e negócio ficam privados)', 'Everything — we share it all, salaries included (couples)': 'Tudo — partilhamos tudo, salários incluídos (casais)',
    'Heads up': 'Atenção', 'Not synced yet': 'Ainda não sincronizado',
    // sentences (long)
    'Everything is stored in this browser only. Export a backup regularly, and use it to move to another device.': 'Tudo é guardado só neste browser. Exporta uma cópia regularmente e usa-a para mudar de dispositivo.',
    'Add your salary (net, what lands in your account) and any other income. The dashboard then shows what is left after bills, subscriptions and loans.': 'Adiciona o teu salário (líquido, o que cai na conta) e outros rendimentos. O painel mostra então o que sobra depois de contas, subscrições e créditos.',
    'Add mortgages, car loans, credit cards or personal credit to see how much is left, when it ends and how much interest you will pay.': 'Adiciona crédito habitação, automóvel, cartões ou crédito pessoal para ver quanto falta, quando termina e quantos juros vais pagar.',
    'Add your water, electricity or gas bills (or import a photo/PDF) to see how they change over time and why they went up.': 'Adiciona as contas de água, luz ou gás (ou importa uma foto/PDF) para ver como mudam e porque subiram.',
    'Trips, flatmates, dinners — add a group, log who paid what, and see who owes whom.': 'Viagens, colegas de casa, jantares — cria um grupo, regista quem pagou o quê e vê quem deve a quem.',
    'Emergency fund, holidays, a new car… set a target and see what to save per month.': 'Fundo de emergência, férias, um carro novo… define um valor e vê quanto poupar por mês.',
    'Add appliances and electronics with the purchase date — attach the receipt photo so you have it when something breaks.': 'Adiciona eletrodomésticos e eletrónica com a data de compra — anexa a foto do recibo para o teres quando algo avariar.',
    'Add your current accounts, savings and investments (balances only — nothing is connected to your bank).': 'Adiciona as tuas contas, poupanças e investimentos (só saldos — nada está ligado ao teu banco).',
    'Estimates assume a fixed rate and regular payments from the start date. For a variable-rate loan (e.g. Euribor) update the rate when it changes; your bank statement is the authority.': 'As estimativas assumem taxa fixa e prestações regulares desde a data de início. Num crédito de taxa variável (ex.: Euribor) atualiza a taxa quando mudar; o extrato do banco é que manda.',
    'The payment does not cover the monthly interest — check the rate and payment.': 'A prestação não cobre os juros mensais — verifica a taxa e a prestação.',
    'Reminders appear while the app is open (or installed and running) for things due within 2 days. Real push notifications when the app is closed would need a server, which this app deliberately does not have.': 'Os lembretes aparecem com a app aberta (ou instalada e em execução) para o que vence em 2 dias. Notificações com a app fechada exigiriam um servidor, que esta app propositadamente não tem.',
    'Share it only through a private channel. Anyone with the code can read and edit the shared data.': 'Partilha-o só por um canal privado. Quem tiver o código pode ler e editar os dados partilhados.',
    'Family sync needs this page to be served over https (for example GitHub Pages).': 'A sincronização de família precisa que a página seja servida por https (por exemplo, GitHub Pages).',
    'Invoices count from the issue date, drafts are excluded. Expense VAT is taken from the "VAT %" you set on each expense. Amounts are summed as entered (no currency conversion). A summary to hand to your accountant — not a filing.': 'As faturas contam pela data de emissão e os rascunhos ficam de fora. O IVA das despesas vem do "IVA %" de cada despesa. Os valores somam-se como introduzidos (sem conversão de moeda). Um resumo para o contabilista — não é uma declaração.',
    'Based on': 'Com base em', 'Thank you for your business.': 'Obrigado pela preferência.',
    'This replaces your current data with a fictional sample.': 'Isto substitui os teus dados atuais por um exemplo fictício.', 'Load demo data?': 'Carregar dados de demonstração?', 'Erase everything?': 'Apagar tudo?', 'All invoices, clients, expenses and settings in this browser will be deleted.': 'Todas as faturas, clientes, despesas e definições deste browser serão apagados.', 'Replace current data?': 'Substituir os dados atuais?',
    'Leave the family space?': 'Sair do espaço de família?', 'Your data stays on this device; it just stops syncing. Other members keep theirs.': 'Os teus dados ficam neste dispositivo; apenas deixa de sincronizar. Os outros membros mantêm os deles.',
    // toasts / messages
    'Saved': 'Guardado', 'Added': 'Adicionado', 'Invoice saved': 'Fatura guardada', 'Client saved': 'Cliente guardado', 'Expense saved': 'Despesa guardada', 'Settings saved': 'Definições guardadas', 'PIN saved': 'PIN guardado', 'PIN removed': 'PIN removido', 'Backup imported': 'Cópia importada', 'All data erased': 'Todos os dados apagados', 'Marked as paid': 'Marcada como paga',
    'Name is required': 'O nome é obrigatório', 'Amount is required': 'O valor é obrigatório', 'Price is required': 'O preço é obrigatório', 'Invoice number is required': 'O número da fatura é obrigatório', 'That invoice number already exists': 'Esse número de fatura já existe', 'Add at least one line item': 'Adiciona pelo menos uma linha', 'Add a client first (Clients page)': 'Adiciona primeiro um cliente (página Clientes)',
    'Use 4 to 8 digits': 'Usa 4 a 8 dígitos', 'Code copied': 'Código copiado', 'Could not read it — fill in by hand': 'Não consegui ler — preenche à mão', 'Reading receipt…': 'A ler o recibo…', 'Reading': 'A ler', 'No transactions found': 'Nenhuma transação encontrada', 'Saved — applies on the next sync': 'Guardado — aplica-se na próxima sincronização',
    'Could not find the amounts — fill them in by hand': 'Não encontrei os valores — preenche à mão', 'Add usage to your bills first': 'Adiciona primeiro o consumo às tuas contas', 'Could not read that file. You can add the bill by hand.': 'Não consegui ler esse ficheiro. Podes adicionar a conta à mão.',
    // misc labels
    'Tip': 'Dica', 'from price per': 'do preço por', 'from usage': 'do consumo', 'paid by': 'pago por', 'split equally': 'dividido por igual', 'shared ÷': 'partilhada ÷', 'is owed': 'tem a receber', 'owes': 'deve', 'settled': 'acertado', 'pays': 'paga a', 'Due soon:': 'Vence em breve:', 'Due today:': 'Vence hoje:', 'Overdue:': 'Em atraso:',
    'Per': 'Por', 'Price per': 'Preço por', 'Amount per': 'Valor por', 'Language': 'Idioma', 'English': 'Inglês', 'Português': 'Português', 'Ledgerly — invoices & bills': 'Ledgerly — faturas e contas', 'No clients yet': 'Ainda não há clientes',
    '(deleted client)': '(cliente apagado)', '— add a client first —': '— adiciona primeiro um cliente —', 'Your business ': 'O teu negócio'
  };
  // fragments inside longer dynamic sentences, longest first
  var F = [
    ['Cancel ','Cancelar '], ['Spend ','Gastar '], [' less on ',' menos em '], [' a month',' por mês'], ['Last bill ','Última conta '], [' vs usual ',' vs habitual '], ['You usually spend about ','Costumas gastar cerca de '], [' vs ',' vs '], [' of the month',' do mês'], ['You have ','Tens '], ['Everything we found adds up to ','Tudo o que encontrámos soma '],
    ['Signed in as','Sessão iniciada como'], ['Last sync','Última sincronização'], [' in · ',' entradas · '], ['per day to spend, until month end','por dia para gastar, até ao fim do mês'], [' out · you keep',' saídas · ficas com'], ['Good night,','Boa noite,'], ['Good morning,','Bom dia,'], ['Good afternoon,','Boa tarde,'], ['Good evening,','Boa noite,'],
    ['Monthly', 'Mensal'], ['Yearly', 'Anual'], ['Weekly', 'Semanal'], ['/mo', '/mês'], ['shared ÷', 'partilhada ÷'],
    ['Paid in ', 'Pago em '], ['Expenses in ', 'Despesas em '], ['Income vs expenses', 'Receitas vs despesas'], ['Invoice INV', 'Fatura INV'], ['Last bill per person', 'Última fatura por pessoa'],
    ['You have not backed up yet.', 'Ainda não fizeste nenhuma cópia de segurança.'], ['Your last backup was', 'A tua última cópia foi há'], ['days ago.', 'dias.'],
    [' Your data only lives in this browser — ', ' Os teus dados só existem neste browser — '], ['export a backup', 'exporta uma cópia'],
    ['price per kWh rose', 'o preço por kWh subiu'], ['price per m³ rose', 'o preço por m³ subiu'], ['Usage rose', 'O consumo subiu'], ['Usage fell', 'O consumo desceu'], [' — check for a tariff change.', ' — verifica se houve alteração de tarifário.'],
    ['usage is', 'o consumo está'], ['above your recent average — possible leak or unusual use.', 'acima da tua média recente — possível fuga ou uso invulgar.'], ['the last bill is', 'a última fatura é'], ['higher', 'mais alta'], [' went up ', ' subiu '],
    ['Renewing in the next 7 days:', 'A renovar nos próximos 7 dias:'], ['free trial — renews', 'período de teste — renova a'], ['Cancel before if you do not want it.', 'Cancela antes se não a quiseres.'], ['You pay for', 'Pagas'], ['video services', 'serviços de vídeo'], ['Rotating them month to month is a common way to save.', 'Alternar entre eles de mês a mês é uma forma comum de poupar.'],
    ['You have IPTV and streaming at the same time — check for overlap.', 'Tens IPTV e streaming ao mesmo tempo — verifica se há sobreposição.'], ['Warranty ends:', 'Garantia termina:'], ['(subscription)', '(subscrição)'], ['(to receive)', '(a receber)'],
    ['expenses imported', 'despesas importadas'], ['payments found', 'pagamentos encontrados'], ['incoming rows ignored', 'linhas de entrada ignoradas'], ['Untick what you do not want, fix categories, then import. Rows already in Expenses are unticked.', 'Desmarca o que não queres, corrige as categorias e importa. As linhas já existentes vêm desmarcadas.'],
    ['receipts added — check the ones marked "auto"', 'recibos adicionados — confirma os marcados "auto"'], ['recurring invoice', 'fatura recorrente'], ['created as draft', 'criada(s) como rascunho'], 
    ['Price changed', 'Preço alterado'], ['price changed', 'preço alterado'],  ['Last sync', 'Última sincronização'], ['Synced', 'Sincronizado'], ['Sync problem:', 'Problema de sincronização:'], ['change received', 'alteração recebida'], ['changes received', 'alterações recebidas'],
     ['repaid of', 'pagos de'],  ['Save ', 'Poupa '], ['/month for ', '/mês durante '], [' months to reach it by ', ' meses para chegar lá até '],  ['Total in ', 'Total em '],
    ['Enter your PIN', 'Introduz o teu PIN'], ['Price per', 'Preço por'], ['Last bill per person', 'Última fatura por pessoa'], ['Price now', 'Preço agora'],  ['Found a better tariff in the', 'Encontraste um tarifário melhor no'], ['? Enter its price here to see what you would save per year with your real usage.', '? Escreve aqui o preço para veres quanto poupavas por ano com o teu consumo real.']
  ].sort(function (a, b) { return b[0].length - a[0].length; });

  D['Add your water, electricity or gas bill, or import a photo or PDF, and see how it changes and'] = 'Adiciona uma conta de água, luz ou gás, ou importa uma foto ou PDF, e vê como muda e'; D['No subscriptions yet. Add the ones you know, then use the checklist below for the ones you may have forgotten.'] = 'Adiciona as que conheces e usa a lista abaixo para as que te podem estar a escapar.'; D['Add your salary (net, what lands in your account) and any other income. The dashboard then shows what is left after bills, subscriptions and loans.'] = 'Adiciona o teu salário (líquido, o que cai na conta) e outros rendimentos. O início mostra depois o que sobra depois de contas, subscrições e créditos.'; 
  D['Add the ones you know, then use the checklist below for the ones you may have forgotten.'] = 'Adiciona as que conheces e usa a lista abaixo para as que te podem estar a escapar.'; D['Add mortgages, car loans, credit cards or personal credit to see how much is left, when it ends and how much interest you will pay.'] = 'Adiciona crédito habitação, automóvel, cartões ou crédito pessoal para ver quanto falta, quando termina e quantos juros vais pagar.'; D['Trips, flatmates, dinners — add a group, log who paid what, and see who owes whom.'] = 'Viagens, colegas de casa, jantares — cria um grupo, regista quem pagou o quê e vê quem deve a quem.'; D['why'] = 'porquê'; 
  D['Search'] = 'Pesquisar'; D['Type at least two letters.'] = 'Escreve pelo menos duas letras.'; D['Nothing found.'] = 'Nada encontrado.'; D['Search bills, subscriptions, invoices, clients…'] = 'Pesquisar contas, subscrições, faturas, clientes…'; D['🔍 Search'] = '🔍 Pesquisar'; D['per day to spend, until month end'] = 'por dia para gastar, até ao fim do mês'; D['Warranties'] = 'Garantias'; D['Deadlines'] = 'Prazos'; D['Accounts'] = 'Contas bancárias'; D['Goals'] = 'Objetivos'; 
  D['Spending'] = 'Gastos'; D['Spent in'] = 'Gasto em'; D['By category'] = 'Por categoria'; D['Save more'] = 'Poupar mais'; D['🎯 Save more'] = '🎯 Poupar mais'; D['📊 Save more'] = '📊 Poupar mais'; D['📊 Spending'] = '📊 Gastos'; D['Find savings'] = 'Encontrar poupanças'; D['+ Purchase'] = '+ Compra'; D['🛒 Purchase'] = '🛒 Compra'; D['Add a purchase'] = 'Adicionar compra'; D['Add purchase'] = 'Adicionar compra'; D['Purchase added'] = 'Compra adicionada'; D['Where?'] = 'Onde?'; D['Amount'] = 'Valor'; D['Shopping'] = 'Compras'; D['Entertainment'] = 'Lazer'; D['Gifts'] = 'Presentes'; D['Shopping, food, anything'] = 'Compras, comida, qualquer coisa'; D['See where to cut'] = 'Ver onde cortar'; D['Home bills'] = 'Contas da casa'; D['Purchases'] = 'Compras'; D['Subscriptions'] = 'Subscrições'; D['Details →'] = 'Detalhes →'; D['every month'] = 'todos os meses'; D['Still using it?'] = 'Ainda usas?'; D['Enter the amount'] = 'Indica o valor'; D['Enter an amount to save each month'] = 'Indica quanto queres poupar por mês'; D['How much would you like to save each month? Ledgerly looks at your subscriptions, bills and purchases and shows where to cut.'] = 'Quanto gostarias de poupar por mês? O Ledgerly analisa as tuas subscrições, contas e compras e mostra onde cortar.'; D['Next time you pick the same shop, the category is filled in for you.'] = 'Da próxima vez que escolheres a mesma loja, a categoria é preenchida sozinha.'; D['Nothing recorded for this month yet. Add a purchase, a bill or a subscription.'] = 'Ainda não há nada registado neste mês. Adiciona uma compra, uma conta ou uma subscrição.'; D['free trial about to renew'] = 'período experimental a renovar'; D['price went up'] = 'o preço subiu'; 
  D['of']='de'; D['a month']='por mês'; D['selected.']='selecionado.'; D['— that is']='— são'; D['a year.']='por ano.';
  D['Look & categories'] = 'Aspeto e categorias'; D['Colour theme'] = 'Tema de cor'; D['Caramel'] = 'Caramelo'; D['Forest green'] = 'Verde floresta'; D['Your categories'] = 'As tuas categorias'; D['The built-in categories stay. Add your own for purchases and expenses — they also appear when you add a purchase.'] = 'As categorias de origem ficam. Adiciona as tuas para compras e despesas — aparecem também ao adicionar uma compra.'; D['None yet'] = 'Ainda nenhuma'; D['Add category'] = 'Adicionar categoria'; D['＋ New category…'] = '＋ Nova categoria…'; D['Name of the new category'] = 'Nome da nova categoria'; D['New category, e.g. Pets'] = 'Nova categoria, p. ex. Animais'; D['That category already exists'] = 'Essa categoria já existe'; D['Theme changed'] = 'Tema alterado'; D['Category'] = 'Categoria'; D['Home'] = 'Início'; 
  D['🎨 Colours & themes'] = '🎨 Cores e temas'; D['Colours & themes'] = 'Cores e temas'; D['🎨 Choose your look'] = '🎨 Escolhe o teu estilo'; D['Done'] = 'Concluído'; D['Main colour'] = 'Cor principal'; D['Background'] = 'Fundo'; D['Header colour 1'] = 'Cor do cabeçalho 1'; D['Header colour 2'] = 'Cor do cabeçalho 2'; D['Light or dark'] = 'Claro ou escuro'; D['Follow my device'] = 'Seguir o meu dispositivo'; D['Always light'] = 'Sempre claro'; D['Always dark'] = 'Sempre escuro'; D['Little decorations (snow, petals, friends…)'] = 'Pequenas decorações (neve, pétalas, bonecos…)'; D['On'] = 'Ligadas'; D['Off'] = 'Desligadas'; D['Caramel'] = 'Caramelo'; D['Forest'] = 'Floresta'; D['Christmas'] = 'Natal'; D['Halloween'] = 'Halloween'; D['Ocean'] = 'Oceano'; D['Lavender'] = 'Lavanda'; D['Sakura'] = 'Cerejeira'; D['Cartoon'] = 'Bonecos'; D['Midnight'] = 'Meia-noite'; D['Custom'] = 'Personalizado'; 
  D['Everyday'] = 'Dia a dia'; D['Anime-inspired'] = 'Estilo anime'; D['Seasons & occasions'] = 'Épocas e ocasiões'; D['Fun & night'] = 'Divertidos e noturnos'; D['Your own'] = 'O teu'; D['Neon Tokyo'] = 'Tóquio néon'; D['Kawaii'] = 'Kawaii'; D['Shōnen sunset'] = 'Pôr do sol shōnen'; D['Spirit forest'] = 'Floresta dos espíritos'; D['Ramen night'] = 'Noite de ramen'; D['Sky'] = 'Céu'; D['Retro arcade'] = 'Arcade retro'; D['Azulejo'] = 'Azulejo'; D['Portugal'] = 'Portugal'; D['Valentine'] = 'Dia dos Namorados'; D['Autumn'] = 'Outono'; D['Summer'] = 'Verão'; D['Space'] = 'Espaço'; D['Matcha'] = 'Matcha'; D['Coffee'] = 'Café'; D['New Year'] = 'Ano Novo'; 
  D['✅ This app is hosted on your Firebase project, so it is already connected. Just choose an encryption password.']='✅ Esta app está alojada no teu projeto Firebase, por isso já está ligada. Basta escolheres uma palavra-passe de cifra.';
  D['Home'] = 'Início'; D['No bills yet']='Ainda sem contas'; D['No subscriptions yet']='Ainda sem subscrições'; D['No income yet']='Ainda sem rendimentos'; D['No loans yet']='Ainda sem créditos'; D['Nothing here yet']='Ainda não há nada aqui'; D['No shared groups yet']='Ainda sem grupos partilhados'; D['Nothing to remind you about']='Nada para lembrar'; D['No expenses yet']='Ainda sem despesas'; D['No invoices yet']='Ainda sem faturas'; D['No clients yet']='Ainda sem clientes'; D['✨ Try with demo data']='✨ Experimentar com dados de demonstração'; D['Try with demo data']='Experimentar com dados de demonstração';
  function tr(v) {
    var t = v.trim(); if (!t) return v;
    if (D.hasOwnProperty(t)) return v.replace(t, D[t]);
    var m = t.match(/^([^A-Za-z0-9\u00C0-\u024F]+)(.+)$/); if (m && D.hasOwnProperty(m[2])) return v.replace(t, m[1] + D[m[2]]);
    if (t.indexOf('+ ') === 0 && D.hasOwnProperty(t.slice(2))) return v.replace(t, '+ ' + D[t.slice(2)]);
    var o = v; F.forEach(function (p) { if (o.indexOf(p[0]) > -1) o = o.split(p[0]).join(p[1]); });
    return o;
  }
  function node(n) { var v = n.nodeValue; if (!v || !/[A-Za-z]{2}/.test(v)) return; var o = tr(v); if (o !== v) n.nodeValue = o; }
  function walk(root) {
    if (root.nodeType === 3) return node(root);
    if (root.nodeType !== 1) return; var tag = root.tagName; if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE') return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = []; while ((n = w.nextNode())) { var p = n.parentNode && n.parentNode.tagName; if (p !== 'SCRIPT' && p !== 'STYLE' && p !== 'CODE' && p !== 'PRE') list.push(n); }
    list.forEach(node);
    var els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[title],[aria-label]') : []; Array.prototype.forEach.call(els, attrs); if (root.matches && root.matches('[placeholder],[title],[aria-label]')) attrs(root);
  }
  function attrs(e) { ['placeholder', 'title', 'aria-label'].forEach(function (a) { var v = e.getAttribute(a); if (v) { var o = tr(v); if (o !== v) e.setAttribute(a, o); } }); }
  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return; busy = true;
    list.forEach(function (m) { if (m.type === 'childList') m.addedNodes.forEach(walk); else if (m.type === 'characterData') node(m.target); else if (m.type === 'attributes') attrs(m.target); });
    busy = false;
  });
  function start() { walk(document.body); document.title = tr(document.title); mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label'] }); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
