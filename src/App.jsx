import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, PlusCircle, Gavel, ThumbsDown, Trophy, 
  DollarSign, FileText, LogOut, Menu, X, Calendar, 
  Upload, Save, Download, Trash2, Loader2
} from 'lucide-react';

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled }) => {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-700 text-white hover:bg-blue-800",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
    success: "bg-green-100 text-green-700 hover:bg-green-200",
    outline: "border border-blue-700 text-blue-700 hover:bg-blue-50"
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" {...props} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" {...props}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

// --- COMPONENTES DE PÁGINA ---

const LoginScreen = ({ onLogin }) => {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (user === "administrador" && pass === "grapaz2026") onLogin();
    else setError("Credenciais inválidas");
  };

  return (
    <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-800">Painel Grapaz</h1>
          <p className="text-gray-500 mt-2">Sistema de Licitações</p>
        </div>
        <form onSubmit={handleLogin}>
          <Input label="Usuário" value={user} onChange={e => setUser(e.target.value)} placeholder="administrador"/>
          <Input label="Senha" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"/>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <Button type="submit" className="w-full justify-center">Entrar</Button>
        </form>
      </Card>
    </div>
  );
};

const Dashboard = ({ bids }) => {
  const stats = {
    total: bids.length,
    pending: bids.filter(b => b.status === 'pending').length,
    won: bids.filter(b => ['won', 'partial', 'delivered', 'paid'].includes(b.status)).length,
    lost: bids.filter(b => b.status === 'lost').length,
    receivable: bids.filter(b => ['won', 'partial', 'delivered'].includes(b.status)).reduce((acc, curr) => acc + (parseFloat(curr.value || 0)), 0)
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard Painel</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-blue-500"><p className="text-gray-500 text-sm">Total de Pregões</p><p className="text-3xl font-bold text-blue-800">{stats.total}</p></Card>
        <Card className="border-l-4 border-green-500"><p className="text-gray-500 text-sm">Vencidos</p><p className="text-3xl font-bold text-green-700">{stats.won}</p></Card>
        <Card className="border-l-4 border-red-500"><p className="text-gray-500 text-sm">Perdidos</p><p className="text-3xl font-bold text-red-700">{stats.lost}</p></Card>
        <Card className="border-l-4 border-yellow-500"><p className="text-gray-500 text-sm">A Receber (R$)</p><p className="text-3xl font-bold text-yellow-700">{stats.receivable.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <h3 className="font-bold text-lg mb-4 text-blue-900">Próximos Pregões</h3>
          {bids.filter(b => b.status === 'pending').slice(0, 5).map(bid => (
            <div key={bid.id} className="flex justify-between items-center py-3 border-b last:border-0">
              <div>
                <p className="font-medium text-gray-800">{bid.orgao}</p>
                <p className="text-sm text-gray-500">{new Date(bid.data).toLocaleDateString()} - {bid.horario}</p>
              </div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">{bid.modalidade}</span>
            </div>
          ))}
          {bids.filter(b => b.status === 'pending').length === 0 && <p className="text-gray-500">Nenhum pregão agendado.</p>}
        </Card>
      </div>
    </div>
  );
};

const InsertBid = ({ onAdd }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ orgao: '', cidade: '', plataforma: '', numeroPregao: '', processo: '', data: '', horario: '', modalidade: 'Pregão Eletrônico' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdd({
        ...formData,
        id: Date.now().toString(),
        status: 'pending',
        value: 0,
        items: '',
        deadlines: { docs: '', sign: '', delivery: '' },
        paymentDeadline: '',
        isPaid: false
      });
      setFormData({ orgao: '', cidade: '', plataforma: '', numeroPregao: '', processo: '', data: '', horario: '', modalidade: 'Pregão Eletrônico' });
      alert("Sucesso: Pregão salvo no Painel!");
    } catch (error) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-blue-900 mb-6">Inserir Novo Pregão</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Órgão" required value={formData.orgao} onChange={e => setFormData({...formData, orgao: e.target.value})} />
        <Input label="Cidade" required value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
        <Input label="Plataforma" required value={formData.plataforma} onChange={e => setFormData({...formData, plataforma: e.target.value})} placeholder="Ex: Comprasnet" />
        <Input label="Número do Pregão" required value={formData.numeroPregao} onChange={e => setFormData({...formData, numeroPregao: e.target.value})} />
        <Input label="Número do Processo" required value={formData.processo} onChange={e => setFormData({...formData, processo: e.target.value})} />
        <Input label="Data" type="date" required value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} />
        <Input label="Horário" type="time" required value={formData.horario} onChange={e => setFormData({...formData, horario: e.target.value})} />
        <Select label="Modalidade" options={['Pregão Eletrônico', 'Pregão Presencial', 'Dispensa Eletrônica', 'Chamamento Público', 'Concorrência']} value={formData.modalidade} onChange={e => setFormData({...formData, modalidade: e.target.value})} />
        <div className="md:col-span-2 mt-4">
          <Button type="submit" disabled={loading} className="w-full justify-center">{loading ? <Loader2 className="animate-spin"/> : 'Salvar Pregão'}</Button>
        </div>
      </form>
    </Card>
  );
};

const ProcessTracking = ({ bids, onUpdateStatus }) => {
  const [viewPast, setViewPast] = useState(false);
  const filteredBids = bids.filter(b => b.status === 'pending').sort((a, b) => {
    const dateA = new Date(a.data + 'T' + a.horario);
    const dateB = new Date(b.data + 'T' + b.horario);
    return viewPast ? dateB - dateA : dateA - dateB;
  });
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-blue-900">Acompanhamento</h2>
        <div className="bg-gray-200 p-1 rounded-lg flex">
          <button onClick={() => setViewPast(false)} className={`px-4 py-2 rounded-md text-sm font-medium ${!viewPast ? 'bg-white shadow text-blue-800' : 'text-gray-600'}`}>Próximos</button>
          <button onClick={() => setViewPast(true)} className={`px-4 py-2 rounded-md text-sm font-medium ${viewPast ? 'bg-white shadow text-blue-800' : 'text-gray-600'}`}>Passados</button>
        </div>
      </div>
      <div className="grid gap-4">
        {filteredBids.map(bid => {
          const bidDate = new Date(bid.data + 'T' + bid.horario);
          if (!viewPast && bidDate < now) return null;
          return (
            <Card key={bid.id} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-lg text-gray-800">{bid.orgao}</span>
                  <span className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-600">{bid.numeroPregao}</span>
                </div>
                <p className="text-gray-600">{bid.cidade} - {bid.modalidade}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(bid.data).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1">🕒 {bid.horario}</span>
                  {bid.plataforma && <span className="flex items-center gap-1">💻 {bid.plataforma}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="success" onClick={() => onUpdateStatus(bid, 'won')} className="text-sm">Vencido</Button>
                <Button variant="outline" onClick={() => onUpdateStatus(bid, 'partial')} className="text-sm">Parcial</Button>
                <Button variant="danger" onClick={() => onUpdateStatus(bid, 'lost')} className="text-sm">Perdido</Button>
              </div>
            </Card>
          );
        })}
        {filteredBids.length === 0 && <p className="text-center text-gray-500 py-8">Nenhum processo.</p>}
      </div>
    </div>
  );
};

const LostBids = ({ bids }) => {
  const lostBids = bids.filter(b => b.status === 'lost');
  const grouped = lostBids.reduce((acc, bid) => { (acc[bid.cidade] = acc[bid.cidade] || []).push(bid); return acc; }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900">Processos Perdidos</h2>
      {Object.keys(grouped).length === 0 && <p className="text-gray-500">Nenhum registro.</p>}
      {Object.keys(grouped).map(city => (
        <div key={city} className="space-y-3">
          <h3 className="font-bold text-lg text-gray-700 border-b border-gray-200 pb-2">{city}</h3>
          {grouped[city].map(bid => (
            <Card key={bid.id} className="bg-red-50 border border-red-100">
              <div className="flex justify-between">
                <div>
                  <p className="font-bold text-red-900">{bid.orgao}</p>
                  <p className="text-sm text-red-700">Pregão: {bid.numeroPregao}</p>
                  <p className="text-xs text-red-600 mt-1">{new Date(bid.data).toLocaleDateString()}</p>
                </div>
                <ThumbsDown className="text-red-300" />
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
};

const WonBidCard = ({ bid, onSave }) => {
  const [localBid, setLocalBid] = useState(bid);
  const [isDelivered, setIsDelivered] = useState(false);
  useEffect(() => { setLocalBid(bid); }, [bid]);

  return (
    <Card className="border border-blue-100">
      <div className="flex justify-between items-start mb-4">
        <div><h4 className="font-bold text-lg">{localBid.orgao}</h4><p className="text-sm text-gray-600">Pregão: {localBid.numeroPregao} | Processo: {localBid.processo}</p></div>
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase">{localBid.status === 'won' ? 'Total' : 'Parcial'}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Itens Vencidos</label><textarea className="w-full text-sm p-2 border rounded" rows="3" value={localBid.items || ''} onChange={(e) => setLocalBid({ ...localBid, items: e.target.value })} /></div>
        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">Valor Total (R$)</label><input type="number" className="w-full p-2 border rounded font-mono" value={localBid.value || ''} onChange={(e) => setLocalBid({ ...localBid, value: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <Input label="Prazo Documentos" type="date" value={localBid.deadlines?.docs || ''} onChange={(e) => setLocalBid({ ...localBid, deadlines: {...localBid.deadlines, docs: e.target.value}})} />
        <Input label="Assinatura Ata" type="date" value={localBid.deadlines?.sign || ''} onChange={(e) => setLocalBid({ ...localBid, deadlines: {...localBid.deadlines, sign: e.target.value}})} />
        <Input label="Prazo Entrega" type="date" value={localBid.deadlines?.delivery || ''} onChange={(e) => setLocalBid({ ...localBid, deadlines: {...localBid.deadlines, delivery: e.target.value}})} />
      </div>
      <div className="flex justify-end items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded hover:bg-gray-100"><input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500" checked={isDelivered} onChange={(e) => setIsDelivered(e.target.checked)} /><span className="text-sm font-medium text-gray-700">Marcar como Entregue</span></label>
        <Button onClick={() => onSave(localBid, isDelivered)} className="flex items-center gap-2"><Save size={18} /> Salvar</Button>
      </div>
    </Card>
  );
};

const WonBids = ({ bids, onSaveBid }) => {
  const wonBids = bids.filter(b => ['won', 'partial'].includes(b.status));
  const grouped = wonBids.reduce((acc, bid) => { (acc[bid.cidade] = acc[bid.cidade] || []).push(bid); return acc; }, {});

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-blue-900">Processos Vencidos (Em Andamento)</h2>
      {Object.keys(grouped).length === 0 && <p className="text-gray-500">Nenhum processo vencido.</p>}
      {Object.keys(grouped).map(city => (
        <div key={city} className="space-y-4">
          <h3 className="font-bold text-xl text-blue-800 bg-blue-50 p-2 rounded">{city}</h3>
          {grouped[city].map(bid => <WonBidCard key={bid.id} bid={bid} onSave={onSaveBid} />)}
        </div>
      ))}
    </div>
  );
};

const Payments = ({ bids, onUpdateBid }) => {
  const delivered = bids.filter(b => ['delivered', 'paid'].includes(b.status));
  const total = delivered.filter(b => b.status === 'delivered').reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b pb-4"><h2 className="text-2xl font-bold text-blue-900">Pagamentos e Recebíveis</h2><div className="text-right"><p className="text-sm text-gray-500">Total a Receber</p><p className="text-2xl font-bold text-blue-600">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div></div>
      {delivered.length === 0 && <p className="text-gray-500">Nenhum item aguardando pagamento.</p>}
      {delivered.map(bid => (
        <Card key={bid.id} className={`transition-all ${bid.status === 'paid' ? 'opacity-60 bg-gray-50' : 'border-l-4 border-yellow-400'}`}>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex-1"><div className="flex items-center gap-2"><h4 className="font-bold text-lg text-gray-800">{bid.orgao}</h4>{bid.status === 'paid' && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">PAGO</span>}</div><p className="text-gray-600 text-sm">Cidade: {bid.cidade} | Pregão: {bid.numeroPregao}</p><p className="mt-2 font-mono font-medium text-blue-900">Valor: {parseFloat(bid.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
            <div className="flex items-end gap-4">
              <div className="w-48"><label className="text-xs text-gray-500 block mb-1">Previsão Pagamento</label><input type="date" className="w-full text-sm border rounded p-1" value={bid.paymentDeadline || ''} onChange={(e) => onUpdateBid(bid, { paymentDeadline: e.target.value })} disabled={bid.status === 'paid'} /></div>
              <div className="flex items-center h-10"><label className="flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" className="w-5 h-5 text-green-600 rounded focus:ring-green-500" checked={bid.status === 'paid'} onChange={(e) => onUpdateBid(bid, { status: e.target.checked ? 'paid' : 'delivered' })} /><span className="font-bold text-gray-700">Recebido</span></label></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

const Invoices = () => {
  const [tab, setTab] = useState('entry');
  const [files, setFiles] = useState({ entry: [], exit: [] });
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      setFiles({
        entry: data.filter(f => f.type === 'entry'),
        exit: data.filter(f => f.type === 'exit')
      });
    } catch (error) { console.error("Erro ao carregar arquivos:", error); }
  };
  useEffect(() => { fetchFiles(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', tab);

    setLoading(true);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) { alert("Sucesso: Documento salvo no Painel!"); fetchFiles(); }
      else alert("Erro ao enviar arquivo.");
    } catch (error) { alert("Erro de conexão com servidor."); } finally { setLoading(false); }
  };

  const currentFiles = files[tab];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900">Gestão de Notas Fiscais</h2>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*" />
      <div className="flex border-b border-gray-200">
        <button className={`px-6 py-3 font-medium ${tab === 'entry' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setTab('entry')}>Entrada</button>
        <button className={`px-6 py-3 font-medium ${tab === 'exit' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`} onClick={() => setTab('exit')}>Saída</button>
      </div>
      <Card className="min-h-[300px]">
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">Arquivos no Painel</p>
          <Button onClick={() => fileInputRef.current.click()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />} Anexar
          </Button>
        </div>
        <div className="space-y-2">
          {currentFiles.length === 0 && <p className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">Vazio.</p>}
          {currentFiles.map(file => (
            <div key={file.id} className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
              <div className="flex items-center gap-3">
                <FileText className="text-red-500" size={20} />
                <div><span className="font-medium text-gray-700 block">{file.originalName}</span><span className="text-xs text-gray-400">{new Date(file.createdAt).toLocaleDateString()}</span></div>
              </div>
              <button onClick={() => window.open(`/api/download/${file.filename}`, '_blank')} className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"><Download size={16}/> Baixar</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [bids, setBids] = useState([]);

  // Fetch Centralizado
  const loadData = async () => {
    try {
      const res = await fetch('/api/bids');
      if (res.ok) {
        const data = await res.json();
        setBids(data);
      }
    } catch (e) { console.error("Erro de conexão", e); }
  };

  useEffect(() => { if (isAuthenticated) loadData(); }, [isAuthenticated, currentPage]);

  const handleLogout = () => { setIsAuthenticated(false); setCurrentPage('dashboard'); };
  
  const addBid = async (newBid) => {
    const res = await fetch('/api/bids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBid) });
    if (res.ok) { await loadData(); return true; }
    throw new Error("Falha na API");
  };

  const updateBidStatus = async (bid, newStatus) => {
    const updated = { ...bid, status: newStatus };
    const res = await fetch(`/api/bids/${bid.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) await loadData();
  };

  const updateBidData = async (bid, updates) => {
    const updated = { ...bid, ...updates };
    const res = await fetch(`/api/bids/${bid.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) await loadData();
  };

  const handleSaveBid = async (updatedBid, shouldDeliver) => {
    if (shouldDeliver) {
      updatedBid.status = 'delivered';
      alert("Salvo! Movido para Pagamentos.");
      setCurrentPage('payments');
    } else {
      alert("Salvo com sucesso!");
    }
    await updateBidData(updatedBid, {});
  };

  if (!isAuthenticated) return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;

  const NavItem = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setCurrentPage(id); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${currentPage === id ? 'bg-blue-800 text-white border-r-4 border-blue-400' : 'text-blue-100 hover:bg-blue-800'}`}>
      <Icon size={20} /><span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans">
      <aside className="hidden md:flex w-64 bg-blue-900 flex-col shadow-xl z-20">
        <div className="p-6 border-b border-blue-800"><h1 className="text-2xl font-bold text-white tracking-wider">GRAPAZ</h1><p className="text-blue-300 text-xs">Gestão de Licitações (Painel)</p></div>
        <nav className="flex-1 py-4 space-y-1">
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="insert" icon={PlusCircle} label="Inserir Pregão" />
          <NavItem id="tracking" icon={Gavel} label="Acompanhamento" />
          <NavItem id="won" icon={Trophy} label="Vencidos" />
          <NavItem id="lost" icon={ThumbsDown} label="Perdidos" />
          <NavItem id="payments" icon={DollarSign} label="Pagamentos" />
          <NavItem id="invoices" icon={FileText} label="Notas Fiscais" />
        </nav>
        <div className="p-4 border-t border-blue-800"><button onClick={handleLogout} className="flex items-center gap-2 text-blue-200 hover:text-white transition w-full"><LogOut size={18} /> Sair</button></div>
      </aside>
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden z-10"><span className="font-bold text-blue-900">Painel Grapaz</span><button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{isMobileMenuOpen ? <X /> : <Menu />}</button></header>
        {isMobileMenuOpen && (
          <div className="absolute inset-0 bg-blue-900 z-50 flex flex-col md:hidden"><div className="flex justify-end p-4"><button onClick={() => setIsMobileMenuOpen(false)} className="text-white"><X size={28}/></button></div><nav className="flex-1"><NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" /><NavItem id="insert" icon={PlusCircle} label="Inserir Pregão" /><NavItem id="tracking" icon={Gavel} label="Acompanhamento" /><NavItem id="won" icon={Trophy} label="Vencidos" /><NavItem id="lost" icon={ThumbsDown} label="Perdidos" /><NavItem id="payments" icon={DollarSign} label="Pagamentos" /><NavItem id="invoices" icon={FileText} label="Notas Fiscais" /></nav></div>
        )}
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {currentPage === 'dashboard' && <Dashboard bids={bids} />}
          {currentPage === 'insert' && <InsertBid onAdd={addBid} />}
          {currentPage === 'tracking' && <ProcessTracking bids={bids} onUpdateStatus={updateBidStatus} />}
          {currentPage === 'won' && <WonBids bids={bids} onSaveBid={handleSaveBid} />}
          {currentPage === 'lost' && <LostBids bids={bids} />}
          {currentPage === 'payments' && <Payments bids={bids} onUpdateBid={updateBidData} />}
          {currentPage === 'invoices' && <Invoices />}
        </main>
      </div>
    </div>
  );
}
