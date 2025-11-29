// ==================== App.js ====================
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './App.css';

// 🔧 CONFIGURA TUS CREDENCIALES AQUÍ
const SUPABASE_URL = 'https://yivoacbyaqrczzcvfzft.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FnzYQ9QyapWcbLUg3jVxNQ_b7whJ-Jz';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const RifaApp = () => {
  const [view, setView] = useState('loading');
  const [vendedores, setVendedores] = useState([]);
  const [numerosVendidos, setNumerosVendidos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Detectar vista según URL
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');

    if (path === '/admin') {
      setView('admin');
    } else if (path === '/vendedor' && codigo) {
      setView('vendedor-panel');
    } else if (codigo) {
      setView('publico');
    } else {
      setView('home');
    }

    loadData();
  }, []);

  useEffect(() => {
  const channel = supabase
    .channel('rifa-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'numeros_vendidos'
      },
      (payload) => {
        console.log('Cambio detectado en tiempo real:', payload);
        loadData(); // refresca la UI automáticamente
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  // Cargar datos
  const loadData = async () => {
    try {
      const [vendedoresRes, vendidosRes] = await Promise.all([
        supabase.from('vendedores').select('*'),
        supabase.from('numeros_vendidos').select('*')
      ]);

      setVendedores(vendedoresRes.data || []);
      setNumerosVendidos(vendidosRes.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🎫</div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Renderizar vista según el tipo
  if (view === 'admin') {
    return <AdminPanel vendedores={vendedores} onUpdate={loadData} />;
  } else if (view === 'vendedor-panel') {
    return <VendedorPanel vendedores={vendedores} numerosVendidos={numerosVendidos} onUpdate={loadData} />;
  } else if (view === 'publico') {
    return <VistaPublica vendedores={vendedores} numerosVendidos={numerosVendidos} />;
  } else {
    return <HomePage />;
  }
};

// 🏠 HOME PAGE (Landing)
const HomePage = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>🎫 Sistema de Rifas</h1>
        <p>Bienvenido al sistema de gestión de rifas</p>
        <div className="home-links">
          <a href="/admin" className="btn-primary">Panel Admin</a>
        </div>
      </div>
    </div>
  );
};

// 🔧 PANEL ADMIN
const AdminPanel = ({ vendedores, onUpdate }) => {
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [numerosInicio, setNumerosInicio] = useState('');
  const [numerosFin, setNumerosFin] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const inicio = parseInt(numerosInicio);
    const fin = parseInt(numerosFin);

    if (inicio > fin || inicio < 1) {
      setMessage('❌ Rango inválido (el número inicial debe ser menor o igual al final)');
      setSaving(false);
      return;
    }

    const numerosArray = [];
    for (let i = inicio; i <= fin; i++) {
      numerosArray.push(i);
    }

    try {
      const { error } = await supabase
        .from('vendedores')
        .insert({
          nombre,
          codigo: codigo.toUpperCase(),
          numeros_asignados: numerosArray
        });

      if (error) throw error;

      setMessage('✅ Vendedor creado exitosamente');
      setNombre('');
      setCodigo('');
      setNumerosInicio('');
      setNumerosFin('');
      onUpdate();
    } catch (error) {
      setMessage('❌ Error: ' + error.message);
    }

    setSaving(false);
  };

  const deleteVendedor = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este vendedor?')) return;

    try {
      await supabase.from('vendedores').delete().eq('id', id);
      setMessage('✅ Vendedor eliminado');
      onUpdate();
    } catch (error) {
      setMessage('❌ Error eliminando vendedor');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Enlace copiado al portapapeles');
  };

  const baseUrl = window.location.origin;

  return (
    <div className="admin-container">
      <div className="admin-wrapper">
        <div className="admin-header">
          <h1>🔧 Panel de Administración</h1>
          <a href="/" className="btn-secondary">Inicio</a>
        </div>

        <div className="admin-card">
          <h2>➕ Crear Nuevo Vendedor</h2>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-row">
              <div className="form-group">
                <label>Nombre del Vendedor</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div className="form-group">
                <label>Código Único</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: JUAN123"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Número Inicial</label>
                <input
                  type="number"
                  value={numerosInicio}
                  onChange={(e) => setNumerosInicio(e.target.value)}
                  placeholder="Ej: 1"
                  min="1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Número Final</label>
                <input
                  type="number"
                  value={numerosFin}
                  onChange={(e) => setNumerosFin(e.target.value)}
                  placeholder="Ej: 40"
                  min="1"
                  required
                />
              </div>
            </div>

            {message && <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>{message}</div>}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : 'Crear Vendedor'}
            </button>
          </form>
        </div>

        <div className="admin-card">
          <h2>👥 Vendedores Creados ({vendedores.length})</h2>
          {vendedores.length === 0 ? (
            <p className="empty-state">No hay vendedores creados aún</p>
          ) : (
            <div className="vendedores-list">
              {vendedores.map((v) => (
                <div key={v.id} className="vendedor-item">
                  <div className="vendedor-info">
                    <h3>{v.nombre}</h3>
                    <p className="vendedor-codigo">Código: <strong>{v.codigo}</strong></p>
                    <p className="vendedor-numeros">
                      Números: {Math.min(...v.numeros_asignados)} - {Math.max(...v.numeros_asignados)} 
                      ({v.numeros_asignados.length} números)
                    </p>
                    
                    <div className="enlaces-vendedor">
                      <div className="enlace-item">
                        <strong>🔒 Panel Vendedor (Privado):</strong>
                        <div className="enlace-box">
                          <code>{baseUrl}/vendedor?codigo={v.codigo}</code>
                          <button 
                            onClick={() => copyToClipboard(`${baseUrl}/vendedor?codigo=${v.codigo}`)}
                            className="btn-copy"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                      
                      <div className="enlace-item">
                        <strong>🌍 Vista Pública (Clientes):</strong>
                        <div className="enlace-box">
                          <code>{baseUrl}/?codigo={v.codigo}</code>
                          <button 
                            onClick={() => copyToClipboard(`${baseUrl}/?codigo=${v.codigo}`)}
                            className="btn-copy"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteVendedor(v.id)} 
                    className="btn-delete"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 👤 PANEL VENDEDOR (PRIVADO - Para marcar ventas)
const VendedorPanel = ({ vendedores, numerosVendidos, onUpdate }) => {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get('codigo');
  const vendedor = vendedores.find(v => v.codigo === codigo);

  const [nombreCliente, setNombreCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [numeroSeleccionado, setNumeroSeleccionado] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!vendedor) {
    return (
      <div className="error-container">
        <h1>❌ Código inválido</h1>
        <p>El código "{codigo}" no existe.</p>
        <a href="/admin" className="btn-primary">Ir al Admin</a>
      </div>
    );
  }

  const handleVender = async () => {
    if (!numeroSeleccionado || !nombreCliente.trim()) {
      alert('Por favor completa el nombre del cliente');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('numeros_vendidos')
        .insert({
          numero: numeroSeleccionado,
          nombre_cliente: nombreCliente,
          telefono: telefono || null,
          vendedor_id: vendedor.id
        });

      if (error) throw error;

      alert('✅ Número vendido exitosamente');
      setNumeroSeleccionado(null);
      setNombreCliente('');
      setTelefono('');
      onUpdate();
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
    setSaving(false);
  };

  const eliminarVenta = async (ventaId) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta venta?')) return;
    
    try {
      await supabase.from('numeros_vendidos').delete().eq('id', ventaId);
      alert('✅ Venta eliminada');
      onUpdate();
    } catch (error) {
      alert('❌ Error eliminando venta');
    }
  };

  const vendidosSet = new Set(numerosVendidos.map(n => n.numero));
  const misNumeros = vendedor.numeros_asignados.filter(n => !vendidosSet.has(n));
  const misVendidos = numerosVendidos.filter(n => 
    vendedor.numeros_asignados.includes(n.numero)
  );

  const baseUrl = window.location.origin;
  const enlacePublico = `${baseUrl}/?codigo=${vendedor.codigo}`;

  return (
    <div className="vendor-container">
      <div className="vendor-wrapper">
        <div className="vendor-header">
          <div>
            <h1>👋 Hola, {vendedor.nombre}</h1>
            <p>Panel de Ventas - Números: {Math.min(...vendedor.numeros_asignados)} - {Math.max(...vendedor.numeros_asignados)}</p>
          </div>
          <a href="/admin" className="btn-secondary">Admin</a>
        </div>

        <div className="enlace-publico-card">
          <h3>🔗 Comparte este enlace con tus clientes:</h3>
          <div className="enlace-box-grande">
            <code>{enlacePublico}</code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(enlacePublico);
                alert('✅ Enlace copiado');
              }}
              className="btn-copy-grande"
            >
              📋 Copiar
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{misNumeros.length}</div>
            <div className="stat-label">Disponibles</div>
          </div>
          <div className="stat-card stat-success">
            <div className="stat-number">{misVendidos.length}</div>
            <div className="stat-label">Vendidos</div>
          </div>
        </div>

        <div className="vendor-card">
          <h2>🎫 Marcar Número como Vendido</h2>
          
          <div className="numeros-disponibles">
            {misNumeros.map(num => (
              <button
                key={num}
                className={`numero-btn ${numeroSeleccionado === num ? 'selected' : ''}`}
                onClick={() => setNumeroSeleccionado(num)}
              >
                {num}
              </button>
            ))}
          </div>

          {misNumeros.length === 0 && (
            <p className="empty-state">🎉 ¡Todos tus números están vendidos!</p>
          )}

          {numeroSeleccionado && (
            <div className="venta-form">
              <h3>Vendiendo número: {numeroSeleccionado}</h3>
              <div className="form-group">
                <label>Nombre del Cliente *</label>
                <input
                  type="text"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="form-group">
                <label>Teléfono (opcional)</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="999 888 777"
                />
              </div>
              <div className="form-actions">
                <button onClick={handleVender} className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Confirmar Venta'}
                </button>
                <button onClick={() => setNumeroSeleccionado(null)} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {misVendidos.length > 0 && (
          <div className="vendor-card">
            <h2>✅ Mis Ventas ({misVendidos.length})</h2>
            <div className="ventas-list">
              {misVendidos.map(v => (
                <div key={v.id} className="venta-item">
                  <div className="venta-numero">#{v.numero}</div>
                  <div className="venta-info">
                    <strong>{v.nombre_cliente}</strong>
                    {v.telefono && <span>{v.telefono}</span>}
                  </div>
                  <button 
                    onClick={() => eliminarVenta(v.id)} 
                    className="btn-delete-small"
                    title="Eliminar venta"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 🌍 VISTA PÚBLICA (Para clientes)
const VistaPublica = ({ vendedores, numerosVendidos }) => {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get('codigo');
  const vendedor = vendedores.find(v => v.codigo === codigo);

  if (!vendedor) {
    return (
      <div className="error-container">
        <h1>❌ Código inválido</h1>
        <p>El código "{codigo}" no existe.</p>
      </div>
    );
  }

  const premios = [
    { num: 1, premio: "Yape de S/25.00" },
    { num: 2, premio: "Sorpresa" },
    { num: 3, premio: "Jarra Hervidora" },
    { num: 4, premio: "Desayuno" },
    { num: 5, premio: "Yape de S/25.00" },
    { num: 6, premio: "Broaster" },
    { num: 7, premio: "Perfume" },
    { num: 8, premio: "Desayuno" },
    { num: 9, premio: "Yape de S/25.00" },
    { num: 10, premio: "Broaster" },
    { num: 11, premio: "Kit de Maquillaje" },
    { num: 12, premio: "Yape de S/25.00" }
  ];

  const vendidosSet = new Set(numerosVendidos.map(n => n.numero));
  const numerosVendedor = vendedor.numeros_asignados;
  const totalDisponibles = numerosVendedor.filter(n => !vendidosSet.has(n)).length;

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <div className="header-card">
          <div className="header-content">
            <div className="badge">📅 Sorteo: Viernes 05 de Diciembre, 2025</div>
            <h1 className="title">Gran Rifa Pro Ayuda Social</h1>
            <p className="subtitle">¡Participa y gana increíbles premios! 🎁</p>
            <div className="info-row">
              <div className="info-badge info-badge-purple">
                <span className="info-label">Precio:</span> S/5.00
              </div>
              <div className="info-badge info-badge-green">
                <span className="info-label">Disponibles:</span> {totalDisponibles}/{numerosVendedor.length}
              </div>
            </div>
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <span className="section-icon">🏆</span>
            <h2 className="section-title">Premios</h2>
          </div>
          <div className="premios-grid">
            {premios.map((p) => (
              <div key={p.num} className="premio-card">
                <div className="premio-content">
                  <div className="premio-number">{p.num}</div>
                  <p className="premio-text">{p.premio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <span className="section-icon">🎫</span>
            <h2 className="section-title">Números Disponibles</h2>
          </div>
          
          <div className="legend">
            <div className="legend-item">
              <div className="legend-box legend-available"></div>
              <span>Disponible</span>
            </div>
            <div className="legend-item">
              <div className="legend-box legend-sold"></div>
              <span>Vendido</span>
            </div>
          </div>

          <div className="numeros-grid">
            {numerosVendedor.map((num) => {
              const isVendido = vendidosSet.has(num);
              return (
                <div
                  key={num}
                  className={`numero-box ${isVendido ? 'vendido' : 'disponible'}`}
                  title={isVendido ? 'Vendido' : 'Disponible'}
                >
                  {num}
                  {isVendido && (
                    <div className="sold-overlay">
                      <div className="cross-line line-1"></div>
                      <div className="cross-line line-2"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RifaApp;