import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWallet, faPlus, faEdit, faTrash, faArrowUp, faArrowDown,
  faChartPie, faReceipt, faXmark, faFilter
} from '@fortawesome/free-solid-svg-icons';
import { AuthContext } from '../context/AuthContext';
import './Finances.css';

const API_URL = 'http://127.0.0.1:8080/api';

const CATEGORIES = ['Membership Fee', 'Sponsorship', 'Event Expense', 'Equipment', 'Utilities', 'Miscellaneous'];

const emptyBudget = { title: '', academicYear: '', totalAmount: '', notes: '' };
const emptyTx = { type: 'Income', category: 'Membership Fee', amount: '', description: '', date: '', reference: '', budgetId: '' };

const fmt = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const Finances = () => {
  const { user } = useContext(AuthContext);
  const canWrite = user?.role === 'Admin' || user?.role === 'Treasurer';

  const [summary, setSummary]           = useState({ totalBudget: 0, totalIncome: 0, totalExpense: 0, balance: 0 });
  const [budgets, setBudgets]           = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [txFilter, setTxFilter]         = useState('All');
  const [message, setMessage]           = useState({ type: '', text: '' });

  // Modal state
  const [budgetModal, setBudgetModal]     = useState(false);
  const [txModal, setTxModal]             = useState(false);
  const [deleteModal, setDeleteModal]     = useState(false);
  const [deleteTarget, setDeleteTarget]   = useState(null); // { kind: 'budget'|'tx', item }
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedTx, setSelectedTx]       = useState(null);
  const [budgetForm, setBudgetForm]       = useState(emptyBudget);
  const [txForm, setTxForm]               = useState(emptyTx);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [s, b, t] = await Promise.all([
        axios.get(`${API_URL}/finances/summary`),
        axios.get(`${API_URL}/finances/budgets`),
        axios.get(`${API_URL}/finances/transactions`),
      ]);
      setSummary(s.data);
      setBudgets(b.data);
      setTransactions(t.data);
    } catch (err) {
      showMsg('error', 'Failed to load financial data.');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3500);
  };

  // ── Budget CRUD ──
  const openAddBudget = () => { setSelectedBudget(null); setBudgetForm(emptyBudget); setBudgetModal(true); };
  const openEditBudget = (b) => {
    setSelectedBudget(b);
    setBudgetForm({ title: b.title, academicYear: b.academicYear, totalAmount: b.totalAmount, notes: b.notes || '' });
    setBudgetModal(true);
  };
  const submitBudget = async (e) => {
    e.preventDefault();
    try {
      if (selectedBudget) {
        await axios.put(`${API_URL}/finances/budgets/${selectedBudget._id}`, budgetForm);
        showMsg('success', 'Budget updated.');
      } else {
        await axios.post(`${API_URL}/finances/budgets`, budgetForm);
        showMsg('success', 'Budget created.');
      }
      setBudgetModal(false);
      fetchAll();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Operation failed.');
    }
  };

  // ── Transaction CRUD ──
  const openAddTx = () => { setSelectedTx(null); setTxForm(emptyTx); setTxModal(true); };
  const openEditTx = (t) => {
    setSelectedTx(t);
    setTxForm({
      type: t.type, category: t.category, amount: t.amount,
      description: t.description, date: t.date.slice(0, 10),
      reference: t.reference || '', budgetId: t.budgetId?._id || '',
    });
    setTxModal(true);
  };
  const submitTx = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...txForm, budgetId: txForm.budgetId || null };
      if (selectedTx) {
        await axios.put(`${API_URL}/finances/transactions/${selectedTx._id}`, payload);
        showMsg('success', 'Transaction updated.');
      } else {
        await axios.post(`${API_URL}/finances/transactions`, payload);
        showMsg('success', 'Transaction recorded.');
      }
      setTxModal(false);
      fetchAll();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Operation failed.');
    }
  };

  // ── Delete ──
  const confirmDelete = (kind, item) => { setDeleteTarget({ kind, item }); setDeleteModal(true); };
  const handleDelete = async () => {
    const { kind, item } = deleteTarget;
    try {
      if (kind === 'budget') {
        await axios.delete(`${API_URL}/finances/budgets/${item._id}`);
        showMsg('success', 'Budget deleted.');
      } else {
        await axios.delete(`${API_URL}/finances/transactions/${item._id}`);
        showMsg('success', 'Transaction deleted.');
      }
      setDeleteModal(false);
      fetchAll();
    } catch {
      showMsg('error', 'Failed to delete.');
    }
  };

  const displayedTx = txFilter === 'All' ? transactions : transactions.filter(t => t.type === txFilter);

  if (loading) {
    return (
      <div className="fin-loading">
        <FontAwesomeIcon icon={faWallet} className="fin-loading-icon" />
        <p>Loading financial data...</p>
      </div>
    );
  }

  return (
    <div className="fin-page">

      {/* ── Header ── */}
      <div className="fin-page-header">
        <div>
          <h1 className="fin-page-title">Financial Tracking</h1>
          <p className="fin-page-sub">Manage budgets and record income &amp; expenses</p>
        </div>
        {canWrite && (
          <button className="fin-add-tx-btn" onClick={openAddTx}>
            <FontAwesomeIcon icon={faPlus} /> Add Transaction
          </button>
        )}
      </div>

      {/* ── Toast ── */}
      {message.text && (
        <div className={`fin-toast fin-toast-${message.type}`}>{message.text}</div>
      )}

      {/* ── Summary Cards ── */}
      <div className="fin-summary-row">
        <div className="fin-summary-card fin-card-budget">
          <div className="fin-summary-icon"><FontAwesomeIcon icon={faChartPie} /></div>
          <div>
            <div className="fin-summary-label">Total Budget</div>
            <div className="fin-summary-value">{fmt(summary.totalBudget)}</div>
          </div>
        </div>
        <div className="fin-summary-card fin-card-income">
          <div className="fin-summary-icon"><FontAwesomeIcon icon={faArrowDown} /></div>
          <div>
            <div className="fin-summary-label">Total Income</div>
            <div className="fin-summary-value">{fmt(summary.totalIncome)}</div>
          </div>
        </div>
        <div className="fin-summary-card fin-card-expense">
          <div className="fin-summary-icon"><FontAwesomeIcon icon={faArrowUp} /></div>
          <div>
            <div className="fin-summary-label">Total Expenses</div>
            <div className="fin-summary-value">{fmt(summary.totalExpense)}</div>
          </div>
        </div>
        <div className={`fin-summary-card ${summary.balance >= 0 ? 'fin-card-balance-pos' : 'fin-card-balance-neg'}`}>
          <div className="fin-summary-icon"><FontAwesomeIcon icon={faWallet} /></div>
          <div>
            <div className="fin-summary-label">Net Balance</div>
            <div className="fin-summary-value">{fmt(summary.balance)}</div>
          </div>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="fin-layout">

        {/* ── Budget Panel ── */}
        <div className="fin-budget-panel">
          <div className="fin-panel-header">
            <h2 className="fin-panel-title">Budgets</h2>
            {canWrite && (
              <button className="fin-add-budget-btn" onClick={openAddBudget}>
                <FontAwesomeIcon icon={faPlus} />
              </button>
            )}
          </div>
          {budgets.length === 0 ? (
            <div className="fin-empty-small">
              <p>No budgets set yet.</p>
              {canWrite && <button className="fin-add-budget-btn-text" onClick={openAddBudget}>+ Add Budget</button>}
            </div>
          ) : (
            <div className="fin-budget-list">
              {budgets.map(b => (
                <div key={b._id} className="fin-budget-item">
                  <div className="fin-budget-info">
                    <div className="fin-budget-title">{b.title}</div>
                    <div className="fin-budget-year">{b.academicYear}</div>
                    {b.notes && <div className="fin-budget-notes">{b.notes}</div>}
                  </div>
                  <div className="fin-budget-right">
                    <div className="fin-budget-amount">{fmt(b.totalAmount)}</div>
                    {canWrite && (
                      <div className="fin-budget-actions">
                        <button className="fin-action-btn fin-action-edit" onClick={() => openEditBudget(b)} title="Edit">
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button className="fin-action-btn fin-action-delete" onClick={() => confirmDelete('budget', b)} title="Delete">
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Transactions Panel ── */}
        <div className="fin-tx-panel">
          <div className="fin-panel-header">
            <h2 className="fin-panel-title">Transactions</h2>
            <div className="fin-tx-toolbar">
              <div className="fin-filter-pills">
                <FontAwesomeIcon icon={faFilter} className="fin-filter-icon" />
                {['All', 'Income', 'Expense'].map(f => (
                  <button
                    key={f}
                    className={`fin-pill ${txFilter === f ? 'fin-pill-active' : ''} ${txFilter === f && f === 'Income' ? 'fin-pill-income' : ''} ${txFilter === f && f === 'Expense' ? 'fin-pill-expense' : ''}`}
                    onClick={() => setTxFilter(f)}
                  >{f}</button>
                ))}
              </div>
            </div>
          </div>

          {displayedTx.length === 0 ? (
            <div className="fin-empty-tx">
              <FontAwesomeIcon icon={faReceipt} className="fin-empty-icon" />
              <h3>No transactions yet</h3>
              <p>{txFilter !== 'All' ? `No ${txFilter.toLowerCase()} transactions recorded.` : 'Start by recording your first transaction.'}</p>
              {canWrite && txFilter === 'All' && (
                <button className="fin-add-tx-btn fin-add-tx-btn-sm" onClick={openAddTx}>
                  <FontAwesomeIcon icon={faPlus} /> Add Transaction
                </button>
              )}
            </div>
          ) : (
            <div className="fin-tx-list">
              {displayedTx.map(t => (
                <div key={t._id} className="fin-tx-item">
                  <div className={`fin-tx-type-bar ${t.type === 'Income' ? 'fin-type-income' : 'fin-type-expense'}`} />
                  <div className="fin-tx-date">
                    <span className="fin-tx-day">{new Date(t.date).getDate()}</span>
                    <span className="fin-tx-mon">{new Date(t.date).toLocaleString('en', { month: 'short' }).toUpperCase()}</span>
                    <span className="fin-tx-yr">{new Date(t.date).getFullYear()}</span>
                  </div>
                  <div className="fin-tx-body">
                    <div className="fin-tx-desc">{t.description}</div>
                    <div className="fin-tx-meta">
                      <span className={`fin-type-badge ${t.type === 'Income' ? 'fin-badge-income' : 'fin-badge-expense'}`}>
                        <FontAwesomeIcon icon={t.type === 'Income' ? faArrowDown : faArrowUp} />
                        {t.type}
                      </span>
                      <span className="fin-tx-cat">{t.category}</span>
                      {t.budgetId && <span className="fin-tx-budget">{t.budgetId.title}</span>}
                      {t.reference && <span className="fin-tx-ref">Ref: {t.reference}</span>}
                    </div>
                  </div>
                  <div className={`fin-tx-amount ${t.type === 'Income' ? 'fin-amount-income' : 'fin-amount-expense'}`}>
                    {t.type === 'Income' ? '+' : '-'}{fmt(t.amount)}
                  </div>
                  {canWrite && (
                    <div className="fin-tx-actions">
                      <button className="fin-action-btn fin-action-edit" onClick={() => openEditTx(t)} title="Edit">
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="fin-action-btn fin-action-delete" onClick={() => confirmDelete('tx', t)} title="Delete">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Budget Modal ── */}
      {budgetModal && (
        <div className="fin-overlay" onClick={() => setBudgetModal(false)}>
          <div className="fin-modal" onClick={e => e.stopPropagation()}>
            <div className="fin-modal-top">
              <div className="fin-modal-title-group">
                <div className="fin-modal-icon"><FontAwesomeIcon icon={faChartPie} /></div>
                <div>
                  <h2>{selectedBudget ? 'Edit Budget' : 'New Budget'}</h2>
                  <p>{selectedBudget ? 'Update budget details.' : 'Set an approved budget for an academic year.'}</p>
                </div>
              </div>
              <button className="fin-modal-close" onClick={() => setBudgetModal(false)}><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={submitBudget} className="fin-form">
              <div className="fin-form-group">
                <label>Budget Title <span className="fin-req">*</span></label>
                <input type="text" value={budgetForm.title} required placeholder="e.g. AY 2025–2026 Budget"
                  onChange={e => setBudgetForm({ ...budgetForm, title: e.target.value })} />
              </div>
              <div className="fin-form-row">
                <div className="fin-form-group">
                  <label>Academic Year <span className="fin-req">*</span></label>
                  <input type="text" value={budgetForm.academicYear} required placeholder="e.g. 2025-2026"
                    onChange={e => setBudgetForm({ ...budgetForm, academicYear: e.target.value })} />
                </div>
                <div className="fin-form-group">
                  <label>Total Amount (₱) <span className="fin-req">*</span></label>
                  <input type="number" value={budgetForm.totalAmount} required min="0" step="0.01" placeholder="0.00"
                    onChange={e => setBudgetForm({ ...budgetForm, totalAmount: e.target.value })} />
                </div>
              </div>
              <div className="fin-form-group">
                <label>Notes</label>
                <textarea rows={2} value={budgetForm.notes} placeholder="Optional remarks..."
                  onChange={e => setBudgetForm({ ...budgetForm, notes: e.target.value })} />
              </div>
              <div className="fin-form-actions">
                <button type="submit" className="fin-submit-btn">{selectedBudget ? 'Save Changes' : 'Create Budget'}</button>
                <button type="button" className="fin-cancel-btn" onClick={() => setBudgetModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Transaction Modal ── */}
      {txModal && (
        <div className="fin-overlay" onClick={() => setTxModal(false)}>
          <div className="fin-modal" onClick={e => e.stopPropagation()}>
            <div className="fin-modal-top">
              <div className="fin-modal-title-group">
                <div className="fin-modal-icon"><FontAwesomeIcon icon={faReceipt} /></div>
                <div>
                  <h2>{selectedTx ? 'Edit Transaction' : 'New Transaction'}</h2>
                  <p>{selectedTx ? 'Update transaction details.' : 'Record an income or expense.'}</p>
                </div>
              </div>
              <button className="fin-modal-close" onClick={() => setTxModal(false)}><FontAwesomeIcon icon={faXmark} /></button>
            </div>
            <form onSubmit={submitTx} className="fin-form">
              <div className="fin-form-row">
                <div className="fin-form-group">
                  <label>Type <span className="fin-req">*</span></label>
                  <select value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                  </select>
                </div>
                <div className="fin-form-group">
                  <label>Category <span className="fin-req">*</span></label>
                  <select value={txForm.category} onChange={e => setTxForm({ ...txForm, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="fin-form-row">
                <div className="fin-form-group">
                  <label>Amount (₱) <span className="fin-req">*</span></label>
                  <input type="number" value={txForm.amount} required min="0.01" step="0.01" placeholder="0.00"
                    onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
                </div>
                <div className="fin-form-group">
                  <label>Date <span className="fin-req">*</span></label>
                  <input type="date" value={txForm.date} required
                    onChange={e => setTxForm({ ...txForm, date: e.target.value })} />
                </div>
              </div>
              <div className="fin-form-group">
                <label>Description <span className="fin-req">*</span></label>
                <input type="text" value={txForm.description} required placeholder="Brief description of transaction"
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
              </div>
              <div className="fin-form-row">
                <div className="fin-form-group">
                  <label>Reference No. <span className="fin-opt">(optional)</span></label>
                  <input type="text" value={txForm.reference} placeholder="Receipt / check number"
                    onChange={e => setTxForm({ ...txForm, reference: e.target.value })} />
                </div>
                <div className="fin-form-group">
                  <label>Link to Budget <span className="fin-opt">(optional)</span></label>
                  <select value={txForm.budgetId} onChange={e => setTxForm({ ...txForm, budgetId: e.target.value })}>
                    <option value="">— None —</option>
                    {budgets.map(b => <option key={b._id} value={b._id}>{b.title} ({b.academicYear})</option>)}
                  </select>
                </div>
              </div>
              <div className="fin-form-actions">
                <button type="submit" className="fin-submit-btn">{selectedTx ? 'Save Changes' : 'Record Transaction'}</button>
                <button type="button" className="fin-cancel-btn" onClick={() => setTxModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteModal && (
        <div className="fin-overlay" onClick={() => setDeleteModal(false)}>
          <div className="fin-modal fin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="fin-delete-icon"><FontAwesomeIcon icon={faTrash} /></div>
            <h2 className="fin-delete-title">Confirm Delete</h2>
            <p className="fin-delete-msg">
              <strong>
                {deleteTarget?.kind === 'budget' ? deleteTarget.item.title : deleteTarget?.item.description}
              </strong>{' '}
              will be permanently removed.
            </p>
            <div className="fin-form-actions fin-form-actions-center">
              <button className="fin-danger-btn" onClick={handleDelete}>Yes, Delete</button>
              <button className="fin-cancel-btn" onClick={() => setDeleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Finances;