import React, { useState, useEffect, useContext, useRef } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { FiscalYearContext } from "../context/FiscalYearContext";
import { useToast } from "../context/ToastContext";
import MemberModal from "../components/MemberModal";
import PaymentModal from "../components/PaymentModal";
import DeleteModal from "../components/DeleteModal";
import { exportToCSV, formatCurrency } from "../utils/helpers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faPencil,
  faCreditCard,
  faTrash,
  faFileCsv,
  faDownload,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

const MEMBER_CSV_HEADERS = ['studentId','firstName','lastName','email','phoneNumber','course','yearLevel','academicYear','hasPaid','status','remarks'];
const MEMBER_YEAR_LEVELS = ['1st Year','2nd Year','3rd Year','4th Year','5th Year'];

function parseMemberCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

function downloadMemberTemplate() {
  const blob = new Blob([MEMBER_CSV_HEADERS.join(',') + '\n'], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'members_import_template.csv';
  link.click();
}

function validateMemberRow(row) {
  if (!row.studentId || !row.firstName || !row.lastName || !row.email || !row.course || !row.yearLevel || !row.academicYear) return 'Missing required fields';
  if (!MEMBER_YEAR_LEVELS.includes(row.yearLevel)) return `Invalid yearLevel "${row.yearLevel}"`;
  return null;
}

const API_URL = "http://127.0.0.1:8080/api";

const Members = () => {
  const { user } = useContext(AuthContext);
  const { academicYear: globalYear } = useContext(FiscalYearContext);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [filters, setFilters] = useState({
    academicYear: globalYear,
    hasPaid: "",
    status: "",
    search: "",
  });
  const { showToast } = useToast();

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef();

  // Check user permissions
  const canAddMember = ["Admin", "Secretary"].includes(user?.role);
  const canEditMember = ["Admin", "Secretary"].includes(user?.role);
  const canDeleteMember = user?.role === "Admin";
  const canUpdatePayment = ["Admin", "Treasurer", "Secretary"].includes(
    user?.role,
  );

  // Sync global academic year into the local filter
  useEffect(() => {
    setFilters(f => ({ ...f, academicYear: globalYear }));
  }, [globalYear]);

  useEffect(() => {
    fetchMembers();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMembers = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.academicYear)
        params.append("academicYear", filters.academicYear);
      if (filters.hasPaid !== "") params.append("hasPaid", filters.hasPaid);
      if (filters.status) params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);

      const res = await axios.get(`${API_URL}/members?${params}`);
      setMembers(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching members:", error);
      setLoading(false);
    }
  };

  const handleAddMember = async (memberData) => {
    try {
      await axios.post(`${API_URL}/members`, memberData);
      showToast("success", "Member added successfully!");
      fetchMembers();
      setShowMemberModal(false);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Failed to add member");
    }
  };

  const handleEditMember = async (memberData) => {
    try {
      await axios.put(`${API_URL}/members/${selectedMember._id}`, memberData);
      showToast("success", "Member updated successfully!");
      fetchMembers();
      setShowMemberModal(false);
      setSelectedMember(null);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Failed to update member");
    }
  };

  const handleUpdatePayment = async (paymentData) => {
    try {
      await axios.put(
        `${API_URL}/members/${selectedMember._id}/payment`,
        paymentData,
      );
      showToast("success", "Payment updated successfully!");
      fetchMembers();
      setShowPaymentModal(false);
      setSelectedMember(null);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Failed to update payment");
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    try {
      await axios.delete(`${API_URL}/members/${memberToDelete._id}`);
      showToast("success", "Member deleted successfully!");
      fetchMembers();
      setShowDeleteModal(false);
      setMemberToDelete(null);
    } catch (error) {
      showToast("error", error.response?.data?.message || "Failed to delete member");
      setShowDeleteModal(false);
      setMemberToDelete(null);
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportRows(parseMemberCSV(ev.target.result));
      setShowImportModal(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    try {
      const res = await axios.post(`${API_URL}/members/bulk-import`, { members: importRows });
      showToast("success", `Import done: ${res.data.created} added, ${res.data.skipped} skipped.`);
      setShowImportModal(false);
      setImportRows([]);
      fetchMembers();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadList = () => {
    const csvData = members.map((member) => ({
      "Student ID": member.studentId,
      "First Name": member.firstName,
      "Last Name": member.lastName,
      Email: member.email,
      Phone: member.phoneNumber,
      Course: member.course,
      "Year Level": member.yearLevel,
      "Academic Year": member.academicYear,
      Status: member.status,
      "Has Paid": member.hasPaid ? "Yes" : "No",
      "Amount Paid": member.amountPaid || 0,
      "Payment Date": member.paymentDate
        ? new Date(member.paymentDate).toLocaleDateString()
        : "",
      Remarks: member.remarks || "",
    }));

    exportToCSV(
      csvData,
      `members_${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  if (loading) {
    return <div className="loading">Loading members...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <div className="flex-between mb-20">
          <h2>Members Management</h2>
          <div className="flex-center" style={{ gap: "10px", flexWrap: "wrap" }}>
            <button className="btn btn-secondary" onClick={handleDownloadList}>
              <FontAwesomeIcon icon={faDownload} /> Export CSV
            </button>
            {canAddMember && (<>
              <button className="btn btn-secondary" onClick={downloadMemberTemplate}>
                <FontAwesomeIcon icon={faFileCsv} /> Template
              </button>
              <button className="btn btn-secondary" onClick={() => importFileRef.current.click()}>
                <FontAwesomeIcon icon={faFileCsv} /> Import CSV
              </button>
              <input type="file" accept=".csv" ref={importFileRef} style={{ display: "none" }} onChange={handleImportFileChange} />
              <button className="btn btn-primary" onClick={() => setShowMemberModal(true)}>
                Add New Member
              </button>
            </>)}
          </div>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label>Academic Year</label>
            <input
              type="text"
              placeholder="e.g., 2024-2025"
              value={filters.academicYear}
              onChange={(e) =>
                setFilters({ ...filters, academicYear: e.target.value })
              }
            />
          </div>

          <div className="filter-group">
            <label>Payment Status</label>
            <select
              value={filters.hasPaid}
              onChange={(e) =>
                setFilters({ ...filters, hasPaid: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="true">Paid</option>
              <option value="false">Unpaid</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Member Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Official Member">Official Member</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by name, ID, email..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Course</th>
                <th>Year Level</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    style={{ textAlign: "center", padding: "40px" }}
                  >
                    No members found
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member._id}>
                    <td>{member.studentId}</td>
                    <td>
                      {member.firstName} {member.lastName}
                    </td>
                    <td>{member.course}</td>
                    <td>{member.yearLevel}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          member.status === "Official Member"
                            ? "success"
                            : member.status === "Pending"
                              ? "warning"
                              : "danger"
                        }`}
                      >
                        {member.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${member.hasPaid ? "success" : "danger"}`}
                      >
                        {member.hasPaid ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-sm btn-icon btn-secondary"
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDetailsModal(true);
                          }}
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>

                        {canEditMember && (
                          <button
                            className="btn btn-sm btn-icon btn-primary"
                            onClick={() => {
                              setSelectedMember(member);
                              setShowMemberModal(true);
                            }}
                            title="Edit Member"
                          >
                            <FontAwesomeIcon icon={faPencil} />
                          </button>
                        )}

                        {canUpdatePayment && (
                          <button
                            className="btn btn-sm btn-icon btn-success"
                            onClick={() => {
                              setSelectedMember(member);
                              setShowPaymentModal(true);
                            }}
                            title="Update Payment"
                          >
                            <FontAwesomeIcon icon={faCreditCard} />
                          </button>
                        )}

                        {canDeleteMember && (
                          <button
                            className="btn btn-sm btn-icon btn-danger"
                            onClick={() => {
                              setMemberToDelete(member);
                              setShowDeleteModal(true);
                            }}
                            title="Delete Member"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Modal for Add/Edit */}
      {showMemberModal && (
        <MemberModal
          isOpen={showMemberModal}
          member={selectedMember}
          defaultAcademicYear={globalYear}
          onClose={() => {
            setShowMemberModal(false);
            setSelectedMember(null);
          }}
          onSubmit={selectedMember ? handleEditMember : handleAddMember}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedMember && (
        <PaymentModal
          isOpen={showPaymentModal}
          member={selectedMember}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedMember(null);
          }}
          onSubmit={handleUpdatePayment}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedMember && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailsModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Member Details</h2>
              <button
                className="close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="member-details">
              <div className="detail-row">
                <strong>Student ID:</strong>
                <span>{selectedMember.studentId}</span>
              </div>
              <div className="detail-row">
                <strong>Full Name:</strong>
                <span>
                  {selectedMember.firstName} {selectedMember.lastName}
                </span>
              </div>
              <div className="detail-row">
                <strong>Email:</strong>
                <span>{selectedMember.email}</span>
              </div>
              <div className="detail-row">
                <strong>Phone Number:</strong>
                <span>{selectedMember.phoneNumber}</span>
              </div>
              <div className="detail-row">
                <strong>Course:</strong>
                <span>{selectedMember.course}</span>
              </div>
              <div className="detail-row">
                <strong>Year Level:</strong>
                <span>{selectedMember.yearLevel}</span>
              </div>
              <div className="detail-row">
                <strong>Academic Year:</strong>
                <span>{selectedMember.academicYear}</span>
              </div>
              <div className="detail-row">
                <strong>Status:</strong>
                <span
                  className={`badge badge-${
                    selectedMember.status === "Official Member"
                      ? "success"
                      : selectedMember.status === "Pending"
                        ? "warning"
                        : "danger"
                  }`}
                >
                  {selectedMember.status}
                </span>
              </div>
              <div className="detail-row">
                <strong>Payment Status:</strong>
                <span
                  className={`badge badge-${selectedMember.hasPaid ? "success" : "danger"}`}
                >
                  {selectedMember.hasPaid ? "Paid" : "Unpaid"}
                </span>
              </div>
              {selectedMember.hasPaid && (
                <>
                  <div className="detail-row">
                    <strong>Amount Paid:</strong>
                    <span>{formatCurrency(selectedMember.amountPaid)}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Payment Date:</strong>
                    <span>
                      {new Date(
                        selectedMember.paymentDate,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </>
              )}
              {selectedMember.remarks && (
                <div className="detail-row">
                  <strong>Remarks:</strong>
                  <span>{selectedMember.remarks}</span>
                </div>
              )}
              <div className="detail-row">
                <strong>Registration Date:</strong>
                <span>
                  {new Date(selectedMember.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMemberToDelete(null);
        }}
        onConfirm={handleDeleteMember}
        itemName={
          memberToDelete
            ? `${memberToDelete.firstName} ${memberToDelete.lastName}`
            : ""
        }
        itemType="member"
      />

      {/* ── CSV Import Preview Modal ── */}
      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal" style={{ maxWidth: 860, width: "95vw" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Import Preview — {importRows.length} row{importRows.length !== 1 ? "s" : ""}</h2>
              <button className="close-btn" onClick={() => setShowImportModal(false)}>×</button>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#636e72", margin: "0 0 14px" }}>
              Rows highlighted in red are missing required fields or have invalid year levels and will be skipped.
            </p>
            <div style={{ maxHeight: 360, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 10, marginBottom: 16 }}>
              <table className="table" style={{ fontSize: "0.78rem" }}>
                <thead>
                  <tr>{MEMBER_CSV_HEADERS.map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 50).map((row, i) => {
                    const err = validateMemberRow(row);
                    return (
                      <tr key={i} style={err ? { background: "#fff5f5", color: "#dc2626" } : {}}>
                        {MEMBER_CSV_HEADERS.map(h => <td key={h}>{row[h] || "—"}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {importRows.length > 50 && (
                <p style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", padding: 8 }}>
                  Showing first 50 of {importRows.length} rows.
                </p>
              )}
            </div>
            <div className="flex-center" style={{ gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleBulkImport} disabled={importing}>
                {importing ? <><FontAwesomeIcon icon={faSpinner} spin /> Importing…</> : `Import ${importRows.length} Rows`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
