import React, { useState, useEffect } from 'react';

const MemberModal = ({ isOpen, onClose, onSubmit, member, defaultAcademicYear }) => {
  const fallbackYear = defaultAcademicYear || '2024-2025';

  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    course: '',
    yearLevel: '1st Year',
    academicYear: fallbackYear,
    remarks: ''
  });

  useEffect(() => {
    if (member) {
      setFormData({
        studentId: member.studentId || '',
        firstName: member.firstName || '',
        lastName: member.lastName || '',
        email: member.email || '',
        phoneNumber: member.phoneNumber || '',
        course: member.course || '',
        yearLevel: member.yearLevel || '1st Year',
        academicYear: member.academicYear || fallbackYear,
        remarks: member.remarks || ''
      });
    } else {
      setFormData({
        studentId: '',
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        course: '',
        yearLevel: '1st Year',
        academicYear: fallbackYear,
        remarks: ''
      });
    }
  }, [member, defaultAcademicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{member ? 'Edit Member' : 'Add New Member'}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Student ID *</label>
            <input
              type="text"
              name="studentId"
              className="form-control"
              value={formData.studentId}
              onChange={handleChange}
              required
              disabled={member ? true : false}
            />
          </div>

          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              className="form-control"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              name="lastName"
              className="form-control"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              name="phoneNumber"
              className="form-control"
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Course *</label>
            <input
              type="text"
              name="course"
              className="form-control"
              value={formData.course}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Year Level *</label>
            <select
              name="yearLevel"
              className="form-control"
              value={formData.yearLevel}
              onChange={handleChange}
              required
            >
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
              <option value="5th Year">5th Year</option>
            </select>
          </div>

          <div className="form-group">
            <label>Academic Year *</label>
            <input
              type="text"
              name="academicYear"
              className="form-control"
              placeholder="e.g., 2024-2025"
              value={formData.academicYear}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Remarks</label>
            <textarea
              name="remarks"
              className="form-control"
              rows="3"
              value={formData.remarks}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="flex-between mt-20">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {member ? 'Update' : 'Add'} Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberModal;