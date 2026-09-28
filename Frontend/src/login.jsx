import { useEffect, useRef, useState } from "react";
import { submitCredential } from "./api/credentials";
import { useNavigate } from "react-router-dom";
import "./login.css";

const initialForm = {
  fullName: "",
  lrn: "",
  gradeLevel: "",
  section: "",
  graduationYear: "",
  credential: "",
  purpose: "",
  phone: "",
  email: "",
  additionalDetails: "",
};

function Login() {
  const navigate = useNavigate();
  const submissionKey = useRef(null);
  const submitLock = useRef(false);

  const [requesterType, setRequesterType] = useState("");
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  const [formData, setFormData] = useState(initialForm);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [errors, setErrors] = useState({});

  /* =========================================================
     PREVENT BACKGROUND SCROLL
     ========================================================= */

  useEffect(() => {
    if (requestModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [requestModalOpen]);

  /* =========================================================
     HANDLE STAFF ROLES ONLY
     STUDENT / ALUMNI ARE NOT NAVIGATED
     ========================================================= */

  const handleRole = (role) => {
    switch (role) {
      case "PRINCIPAL":
        navigate("/principal-login");
        break;

      case "ADMIN":
        navigate("/admin-login");
        break;

      case "ICT":
        navigate("/ict-login");
        break;

      default:
        break;
    }
  };

  /* =========================================================
     OPEN REQUEST MODAL
     ========================================================= */

  const openRequestModal = (type) => {
    submissionKey.current = crypto.randomUUID();
    setRequesterType(type);

    setFormData({
      ...initialForm,
    });

    setErrors({});
    setSubmitted(false);
    setSubmitting(false);
    setRequestId("");

    setRequestModalOpen(true);
  };

  /* =========================================================
     CLOSE REQUEST MODAL
     ========================================================= */

  const closeRequestModal = () => {
    if (submitting) {
      return;
    }

    setRequestModalOpen(false);

    setRequesterType("");

    setFormData({
      ...initialForm,
    });

    setErrors({});
    setSubmitted(false);
    setSubmitting(false);
    setRequestId("");
  };

  /* =========================================================
     HANDLE INPUT
     ========================================================= */

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((previous) => ({
        ...previous,
        [name]: "",
      }));
    }
  };

  /* =========================================================
     VALIDATION
     ========================================================= */

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName =
        "Please enter your full name.";
    }

    if (!formData.lrn.trim()) {
      newErrors.lrn =
        "Please enter your LRN.";
    }

    if (requesterType === "Student") {
      if (!formData.gradeLevel) {
        newErrors.gradeLevel =
          "Please select your grade level.";
      }

      if (!formData.section.trim()) {
        newErrors.section =
          "Please enter your section.";
      }
    }

    if (requesterType === "Alumni") {
      if (!formData.graduationYear.trim()) {
        newErrors.graduationYear =
          "Please enter your year graduated.";
      }
    }

    if (!formData.credential) {
      newErrors.credential =
        "Please select the credential you are requesting.";
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose =
        "Please enter the purpose of your request.";
    }

    if (!formData.phone.trim()) {
      newErrors.phone =
        "Please enter your active mobile number.";
    }

    return newErrors;
  };

  /* =========================================================
     GENERATE REQUEST ID
     ========================================================= */


  const handleSubmitRequest = async (event) => {
    event.preventDefault();
    if (submitLock.current) return;
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      submissionKey.current ||= crypto.randomUUID();
      const result = await submitCredential({
        submission_key: submissionKey.current,
        requester_type: requesterType,
        full_name: formData.fullName.trim(),
        lrn: formData.lrn.trim(),
        grade_level: requesterType === "Student" ? formData.gradeLevel : "",
        section: requesterType === "Student" ? formData.section.trim() : "",
        graduation_year: requesterType === "Alumni" ? formData.graduationYear.trim() : "",
        credential: formData.credential,
        purpose: formData.purpose.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        additional_details: formData.additionalDetails.trim(),
      });
      setRequestId(result.id);
      setSmsEnabled(result.sms_enabled === true);
      setSubmitted(true);
      setErrors({});
    } catch (error) {
      setErrors({ submit: error.message || "The request could not be submitted. Please try again." });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page">

      {/* ===================================================
          BACKGROUND
          =================================================== */}

      <div className="corner corner-top-left"></div>

      <div className="corner corner-bottom-right"></div>

      <img
        src="/logo.png"
        alt=""
        className="background-seal"
      />

      <div className="school-background"></div>

      {/* ===================================================
          MAIN CONTENT
          =================================================== */}

      <main className="landing-content">

        {/* =================================================
            HEADER
            ================================================= */}

        <section className="system-header">

          <img
            src="/logo.png"
            alt="PMRMIS South Logo"
            className="school-logo"
          />

          <h1>
            PMRMIS - SOUTH
          </h1>

          <h2>
            SCHOOL RECORDS MANAGEMENT SYSTEM
          </h2>

          <div className="tagline">

            <span></span>

            <em>
              Access
            </em>

            <b>
              •
            </b>

            <em>
              Manage
            </em>

            <b>
              •
            </b>

            <em>
              Serve
            </em>

            <span></span>

          </div>

        </section>

        {/* =================================================
            ROLE MENU
            ================================================= */}

        <section className="role-menu">

          {/* =================================================
              PRINCIPAL
              ================================================= */}

          <button
            type="button"
            className="role-button"
            onClick={() =>
              handleRole("PRINCIPAL")
            }
          >

            <span className="role-icon principal-icon">

              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3L4 7v2h16V7l-8-4zm-6 8v8H4v2h16v-2h-2v-8h-2v8h-2v-8h-2v8H6v-8z"
                />
              </svg>

            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Principal
            </span>

            <span className="role-arrow">
              ›
            </span>

          </button>

          {/* =================================================
              ADMINISTRATION
              ================================================= */}

          <button
            type="button"
            className="role-button"
            onClick={() =>
              handleRole("ADMIN")
            }
          >

            <span className="role-icon">

              <svg viewBox="0 0 24 24">
                <path
                  d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65-2-3.46-2.49 1c-.52-.4-1.08-.73-1.69-.98L15 3h-4l-.37 2.53c-.61.25-1.17.59-1.69.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.08.65-.08.98s.03.66.08.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.08.73 1.69.98L11 21h4l.37-2.53c.61-.25 1.17-.58 1.69-.98l2.49 1 2-3.46-2.12-1.65zM13 16h-2v-4h2v4zm0-6h-2V8h2v2z"
                />
              </svg>

            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Administration
            </span>

            <span className="role-arrow">
              ›
            </span>

          </button>

          {/* =================================================
              ICT
              ================================================= */}

          <button
            type="button"
            className="role-button"
            onClick={() =>
              handleRole("ICT")
            }
          >

            <span className="role-icon">

              <svg viewBox="0 0 24 24">
                <path
                  d="M4 5h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-5v2h3v2H6v-2h3v-2H4c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2zm0 2v10h16V7H4z"
                />
              </svg>

            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              ICT Personnel
            </span>

            <span className="role-arrow">
              ›
            </span>

          </button>

          {/* =================================================
              STUDENT
              DIRECT MODAL — NO NAVIGATION
              ================================================= */}

          <button
            type="button"
            className="role-button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              openRequestModal("Student");
            }}
          >

            <span className="role-icon">

              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3L1 9l4 2.18v6.1c0 .72.39 1.39 1.01 1.75C7.72 20.01 9.78 21 12 21s4.28-.99 5.99-1.97A2 2 0 0019 17.28v-6.1L21 10v6h2V9L12 3zm5 14.28C15.6 18.06 13.82 19 12 19s-3.6-.94-5-1.72v-5.04l5 2.76 5-2.76v5.04z"
                />
              </svg>

            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Students
            </span>

            <span className="role-arrow">
              ›
            </span>

          </button>

          {/* =================================================
              ALUMNI
              DIRECT MODAL — NO NAVIGATION
              ================================================= */}

          <button
            type="button"
            className="role-button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              openRequestModal("Alumni");
            }}
          >

            <span className="role-icon">

              <svg viewBox="0 0 24 24">
                <path
                  d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm8 2c-2 0-6 1-6 3v3h12v-3c0-2-4-3-6-3zM8 13c-2.33 0-7 1.17-7 3.5V19h7v-3c0-1.17.53-2.23 1.43-3.04C9.74 13.36 8.86 13 8 13z"
                />
              </svg>

            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Alumni
            </span>

            <span className="role-arrow">
              ›
            </span>

          </button>

        </section>

        {/* =================================================
            BOTTOM MESSAGE
            ================================================= */}

        <div className="bottom-message">

          <p>
            Education Builds
          </p>

          <p>
            a Brighter Future
          </p>

          <span></span>

        </div>

      </main>

      {/* ===================================================
          REQUEST MODAL
          =================================================== */}

      {requestModalOpen && (
        <div
          className="request-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !submitting
            ) {
              closeRequestModal();
            }
          }}
        >

          <div
            className="request-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="requestModalTitle"
          >

            {/* =================================================
                MODAL HEADER
                ================================================= */}

            <div className="request-modal-header">

              <div className="request-modal-brand">

                <img
                  src="/logo.png"
                  alt="PMRMIS South Logo"
                />

                <div>

                  <span>
                    PMRMIS - SOUTH
                  </span>

                  <h2 id="requestModalTitle">
                    Credential Request
                  </h2>

                </div>

              </div>

              <button
                type="button"
                className="request-modal-close"
                onClick={closeRequestModal}
                disabled={submitting}
                aria-label="Close request form"
              >
                <i className="fas fa-xmark"></i>
              </button>

            </div>

            {/* =================================================
                REQUESTER TYPE
                ================================================= */}

            <div className="request-modal-intro">

              <div className="request-type-badge">

                <i
                  className={
                    requesterType === "Student"
                      ? "fas fa-user-graduate"
                      : "fas fa-user-group"
                  }
                ></i>

                {requesterType} Requester

              </div>

              <p>
                Complete the form below to request an
                official school credential. No login is
                required.
              </p>

            </div>

            {/* =================================================
                SUCCESS
                ================================================= */}

            {submitted ? (

              <div className="request-success">

                <div className="request-success-icon">
                  <i className="fas fa-check"></i>
                </div>

                <h3>
                  Request Submitted Successfully
                </h3>

                <p>
                  Your credential request has been sent
                  for review by the school.
                </p>

                <div className="request-success-id">

                  <span>
                    Request Reference
                  </span>

                  <strong>
                    {requestId}
                  </strong>

                </div>

                <div className="request-success-note">

                  <i className="fas fa-mobile-screen-button"></i>

                  <span>
                    {smsEnabled
                      ? "An SMS will be queued after Principal approval and the Administrator’s final confirmation that your credentials are ready for collection."
                      : "Your request is saved. SMS service is awaiting activation; please keep your request ID and contact the school records office for updates."}
                  </span>

                </div>

                <button
                  type="button"
                  className="request-success-button"
                  onClick={closeRequestModal}
                >
                  Done
                </button>

              </div>

            ) : (

              /* =================================================
                 REQUEST FORM
                 ================================================= */

              <form
                className="request-form"
                onSubmit={handleSubmitRequest}
              >

                {errors.submit && (
                  <div className="form-submit-error">

                    <i className="fas fa-circle-exclamation"></i>

                    <span>
                      {errors.submit}
                    </span>

                  </div>
                )}

                {/* =================================================
                    SECTION 01
                    ================================================= */}

                <div className="form-section-title">

                  <span>
                    01
                  </span>

                  <div>

                    <strong>
                      Personal Information
                    </strong>

                    <small>
                      Enter the information needed to
                      identify your school record.
                    </small>

                  </div>

                </div>

                <div className="form-grid">

                  {/* FULL NAME */}

                  <div className="form-field full-width">

                    <label htmlFor="fullName">
                      Full Name
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="fas fa-user"></i>

                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter your complete name"
                      />

                    </div>

                    {errors.fullName && (
                      <small className="field-error">
                        {errors.fullName}
                      </small>
                    )}

                  </div>

                  {/* LRN */}

                  <div className="form-field">

                    <label htmlFor="lrn">
                      Learner Reference Number (LRN)
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="fas fa-id-card"></i>

                      <input
                        id="lrn"
                        name="lrn"
                        type="text"
                        value={formData.lrn}
                        onChange={handleInputChange}
                        placeholder="Enter your LRN"
                      />

                    </div>

                    {errors.lrn && (
                      <small className="field-error">
                        {errors.lrn}
                      </small>
                    )}

                  </div>

                  {/* =================================================
                      STUDENT ONLY — GRADE
                      ================================================= */}

                  {requesterType === "Student" && (
                    <div className="form-field">

                      <label htmlFor="gradeLevel">
                        Grade Level
                        <span>*</span>
                      </label>

                      <div className="input-wrapper">

                        <i className="fas fa-layer-group"></i>

                        <select
                          id="gradeLevel"
                          name="gradeLevel"
                          value={formData.gradeLevel}
                          onChange={handleInputChange}
                        >

                          <option value="">
                            Select grade level
                          </option>

                          <option value="Grade 7">
                            Grade 7
                          </option>

                          <option value="Grade 8">
                            Grade 8
                          </option>

                          <option value="Grade 9">
                            Grade 9
                          </option>

                          <option value="Grade 10">
                            Grade 10
                          </option>

                          <option value="Grade 11">
                            Grade 11
                          </option>

                          <option value="Grade 12">
                            Grade 12
                          </option>

                        </select>

                      </div>

                      {errors.gradeLevel && (
                        <small className="field-error">
                          {errors.gradeLevel}
                        </small>
                      )}

                    </div>
                  )}

                  {/* =================================================
                      STUDENT ONLY — SECTION
                      ================================================= */}

                  {requesterType === "Student" && (
                    <div className="form-field">

                      <label htmlFor="section">
                        Section
                        <span>*</span>
                      </label>

                      <div className="input-wrapper">

                        <i className="fas fa-users"></i>

                        <input
                          id="section"
                          name="section"
                          type="text"
                          value={formData.section}
                          onChange={handleInputChange}
                          placeholder="Example: Rizal"
                        />

                      </div>

                      {errors.section && (
                        <small className="field-error">
                          {errors.section}
                        </small>
                      )}

                    </div>
                  )}

                  {/* =================================================
                      ALUMNI ONLY — YEAR GRADUATED
                      ================================================= */}

                  {requesterType === "Alumni" && (
                    <div className="form-field">

                      <label htmlFor="graduationYear">
                        Year Graduated
                        <span>*</span>
                      </label>

                      <div className="input-wrapper">

                        <i className="fas fa-calendar"></i>

                        <input
                          id="graduationYear"
                          name="graduationYear"
                          type="text"
                          value={formData.graduationYear}
                          onChange={handleInputChange}
                          placeholder="Example: 2022"
                        />

                      </div>

                      {errors.graduationYear && (
                        <small className="field-error">
                          {errors.graduationYear}
                        </small>
                      )}

                    </div>
                  )}

                  {/* PHONE */}

                  <div className="form-field">

                    <label htmlFor="phone">
                      Mobile Number
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="fas fa-mobile-screen-button"></i>

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="09XXXXXXXXX"
                      />

                    </div>

                    <small className="field-help">
                      Used for SMS notification.
                    </small>

                    {errors.phone && (
                      <small className="field-error">
                        {errors.phone}
                      </small>
                    )}

                  </div>

                  {/* EMAIL */}

                  <div className="form-field">

                    <label htmlFor="email">
                      Email Address
                      <span className="optional">
                        Optional
                      </span>
                    </label>

                    <div className="input-wrapper">

                      <i className="fas fa-envelope"></i>

                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="you@example.com"
                      />

                    </div>

                  </div>

                </div>

                {/* =================================================
                    SECTION 02
                    ================================================= */}

                <div className="form-section-title">

                  <span>
                    02
                  </span>

                  <div>

                    <strong>
                      Credential Request
                    </strong>

                    <small>
                      Select the document you need.
                    </small>

                  </div>

                </div>

                <div className="form-grid">

                  {/* CREDENTIAL */}

                  <div className="form-field full-width">

                    <label htmlFor="credential">
                      Requested Credential
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="fas fa-file-lines"></i>

                      <select
                        id="credential"
                        name="credential"
                        value={formData.credential}
                        onChange={handleInputChange}
                      >

                        <option value="">
                          Select a credential
                        </option>

                        <option value="SF9 Report Card">
                          SF9 Report Card
                        </option>

                        <option value="SF10 Permanent Record">
                          SF10 Permanent Record
                        </option>

                        <option value="Good Moral Certificate">
                          Good Moral Certificate
                        </option>

                        <option value="Certificate of Enrollment">
                          Certificate of Enrollment
                        </option>

                        <option value="Certificate of Appearance">
                          Certificate of Appearance
                        </option>

                        <option value="Diploma">
                          Diploma
                        </option>

                        <option value="Transcript of Records">
                          Transcript of Records
                        </option>

                        <option value="Other School Document">
                          Other School Document
                        </option>

                      </select>

                    </div>

                    {errors.credential && (
                      <small className="field-error">
                        {errors.credential}
                      </small>
                    )}

                  </div>

                  {/* PURPOSE */}

                  <div className="form-field full-width">

                    <label htmlFor="purpose">
                      Purpose of Request
                      <span>*</span>
                    </label>

                    <div className="input-wrapper textarea-wrapper">

                      <i className="fas fa-clipboard-list"></i>

                      <textarea
                        id="purpose"
                        name="purpose"
                        value={formData.purpose}
                        onChange={handleInputChange}
                        placeholder="Example: Employment, college admission, scholarship, transfer, personal record..."
                        rows="3"
                      />

                    </div>

                    {errors.purpose && (
                      <small className="field-error">
                        {errors.purpose}
                      </small>
                    )}

                  </div>

                  {/* ADDITIONAL DETAILS */}

                  <div className="form-field full-width">

                    <label htmlFor="additionalDetails">

                      Additional Details

                      <span className="optional">
                        Optional
                      </span>

                    </label>

                    <div className="input-wrapper textarea-wrapper">

                      <i className="fas fa-note-sticky"></i>

                      <textarea
                        id="additionalDetails"
                        name="additionalDetails"
                        value={formData.additionalDetails}
                        onChange={handleInputChange}
                        placeholder="Add any additional information the school should know."
                        rows="3"
                      />

                    </div>

                  </div>

                </div>

                {/* =================================================
                    SMS NOTICE
                    ================================================= */}

                <div className="sms-notice">

                  <div className="sms-notice-icon">

                    <i className="fas fa-message"></i>

                  </div>

                  <div>

                    <strong>
                      SMS Notification
                    </strong>

                    <p>
                      Please make sure your mobile number
                      is active. Once SMS service is activated,
                      CredTrack will use it to notify you after
                      your approved credentials are confirmed
                      ready for collection by the Administrator.
                    </p>

                  </div>

                </div>

                {/* =================================================
                    ACTIONS
                    ================================================= */}

                <div className="request-form-actions">

                  <button
                    type="button"
                    className="request-cancel-button"
                    onClick={closeRequestModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="request-submit-button"
                    disabled={submitting}
                  >

                    {submitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        Submit Request
                      </>
                    )}

                  </button>

                </div>

              </form>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default Login;
