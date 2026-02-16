import React, { useState } from 'react';
import axios from 'axios';
import './PublicRegistration.css';

const API_URL = 'http://127.0.0.1:8080/api';

const PublicRegistration = ({ onClose }) => {
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    course: '',
    yearLevel: '1st Year',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/members`, formData);
      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="public-registration-modal-wrapper" onClick={onClose}>
        <div className="registration-modal success-modal" onClick={(e) => e.stopPropagation()}>
          <div className="success-icon">✓</div>
          <h2>Application Submitted!</h2>
          <p>Thank you for your interest in joining Arise Esports!</p>
          <p className="success-message">
            Your application is now <strong>pending review</strong>. Our officers will review your 
            application and contact you via email soon.
          </p>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-registration-modal-wrapper" onClick={onClose}>
      <div className="registration-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Join Arise Esports</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Student ID *</label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="e.g., 2022-10940"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                name="firstName"
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
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@ccc.edu.ph"
                required
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="09XX XXX XXXX"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Course *</label>
              <input
                type="text"
                name="course"
                value={formData.course}
                onChange={handleChange}
                placeholder="e.g., BSIT, BSCS"
                required
              />
            </div>
            <div className="form-group">
              <label>Year Level *</label>
              <select
                name="yearLevel"
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
          </div>

          <div className="form-row">
            <div className="form-group full-width">
              <label>Why do you want to join Arise Esports? (Optional)</label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows="4"
                placeholder="Tell us about your gaming experience, favorite games, or why you want to join..."
              ></textarea>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>

          <p className="form-note">
            * Required fields. Your application will be reviewed by our officers.
          </p>
        </form>
      </div>
    </div>
  );
};

export default PublicRegistration;