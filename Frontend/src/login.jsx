import { useEffect, useRef, useState } from "react";
import { submitCredential, fetchRequestOptions } from "./api/credentials";
import { useNavigate } from "react-router-dom";
import "./login.css";



const initialForm = {
  firstName: "", middleName: "", lastName: "", otherPurpose: "", deliveryMethod: "", receivingSchool: "", identityDocuments: [],
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

function Login({ audience = "public" }) {
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
  const [options, setOptions] = useState({grade_sections: {}, purposes: []});
  useEffect(() => { fetchRequestOptions().then(setOptions).catch(() => setErrors({submit: "Request options could not be loaded. Please refresh and try again."})); }, []);

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
      case "TEACHER":
        navigate("/teacher-login");
        break;
      case "PRINCIPAL":
        navigate("/principal-login");
        break;

      case "ADMIN":
        navigate("/admin-login");
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
      [name]: name === "lrn" ? value.replace(/[^0-9]/g, "").slice(0, 12) : name === "phone" ? value.replace(/[^0-9]/g, "").slice(0, 10) : value,
      ...(name === "gradeLevel" ? {section: ""} : {}),
      ...(name === "purpose" && value !== "Other Documents" ? {otherPurpose: ""} : {}),
      ...(name === "deliveryMethod" && value !== "SCHOOL_TO_SCHOOL" ? {receivingSchool: ""} : {}),
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
    const next = {};
    const required = ["firstName", "middleName", "lastName", "lrn", "credential", "purpose", "phone", "deliveryMethod", ...(requesterType === "Student" ? ["gradeLevel", "section"] : ["graduationYear"])];
    required.forEach(key => { if (!formData[key]?.trim()) next[key] = "This is a required question"; });
    if (formData.lrn && !/^[0-9]{12}$/.test(formData.lrn)) next.lrn = "Enter exactly 12 digits.";
    if (formData.phone && !/^9[0-9]{9}$/.test(formData.phone)) next.phone = "Enter 10 digits starting with 9 after +63.";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) next.email = "Enter a valid email address.";
    if (requesterType === "Alumni" && formData.graduationYear && !/^[0-9]{4}$/.test(formData.graduationYear)) next.graduationYear = "Enter a four-digit year.";
    if (formData.purpose === "Other Documents" && !formData.otherPurpose.trim()) next.otherPurpose = "This is a required question";
    if (formData.deliveryMethod === "SCHOOL_TO_SCHOOL" && !formData.receivingSchool.trim()) next.receivingSchool = "This is a required question";
    if (formData.identityDocuments.length < 1 || formData.identityDocuments.length > 3) next.identityDocuments = "Upload 1–3 supporting documents.";
    if (formData.identityDocuments.some(file=>file.size===0 || file.size>20*1024*1024)) next.identityDocuments = "Each file must be non-empty and no larger than 20 MB.";
    return next;
  };

  /* =========================================================
     GENERATE REQUEST ID
     ========================================================= */


  useEffect(() => {
    if (errors.submit) document.querySelector('.form-submit-error')?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }, [errors]);

  const handleSubmitRequest = async (event) => {
    event.preventDefault();
    if (submitLock.current) return;
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length) {
      setErrors({...validationErrors, submit: "Please complete the highlighted questions below."});
      document.getElementById(Object.keys(validationErrors)[0])?.focus();
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    try {
      submissionKey.current ||= crypto.randomUUID();
      const result = await submitCredential({
        submission_key: submissionKey.current,
        requester_type: requesterType,
        first_name: formData.firstName.trim(), middle_name: formData.middleName.trim(), last_name: formData.lastName.trim(),
        other_purpose: formData.otherPurpose.trim(), delivery_method: formData.deliveryMethod, receiving_school: formData.receivingSchool.trim(), identity_documents: formData.identityDocuments,
        lrn: formData.lrn.trim(),
        grade_level: requesterType === "Student" ? formData.gradeLevel : "",
        section: requesterType === "Student" ? formData.section.trim() : "",
        graduation_year: requesterType === "Alumni" ? formData.graduationYear.trim() : "",
        credential: formData.credential,
        purpose: formData.purpose.trim(),
        phone: "+63" + formData.phone.trim(),
        email: formData.email.trim(),
        additional_details: formData.additionalDetails.trim(),
      });
      setRequestId(result.reference);
      setSmsEnabled(result.sms_enabled === true);
      setSubmitted(true);
      setErrors({});
    } catch (error) {
      const names = {first_name: "firstName", last_name: "lastName", middle_name: "middleName", grade_level: "gradeLevel", graduation_year: "graduationYear", other_purpose: "otherPurpose", delivery_method: "deliveryMethod", receiving_school: "receivingSchool", identity_documents: "identityDocuments", verification_document: "identityDocuments", psa_document: "identityDocuments", id_document: "identityDocuments"};
      const fields = Object.fromEntries(Object.entries(error.fields || {}).filter(([key]) => key in initialForm || names[key]).map(([key, value]) => [names[key] || key, Array.isArray(value) ? value.join(" ") : String(value)]));
      setErrors({...fields, submit: error.message || "Please check the highlighted questions."});
      document.querySelector(".request-modal-body")?.scrollTo({top: 0, behavior: "smooth"});
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className={`landing-page role-selection-page ${audience === "school" ? "school-role-selection" : "public-role-selection"}`}>

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

        {audience === "school" && <section className="system-header">

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

        </section>}

        {/* =================================================
            ROLE MENU
            ================================================= */}

        <button className="role-selection-back" type="button" onClick={() => navigate("/")}>← Back to role selection</button>
        <p className="role-selection-caption">{audience === "school" ? "Choose your workspace" : "Need a school document? Choose below to get started."}</p>
        <section className="role-menu" aria-label={audience === "school" ? "School staff roles" : "Credential requester type"}>
          {audience === "school" ? <>
            <button type="button" className="school-access-card" onClick={()=>handleRole("ADMIN")}>
              <span className="school-access-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5"/></svg></span>
              <span className="school-access-label">OPERATIONS</span><strong>Administration</strong>
              <span className="school-access-description">Verify requests, manage records, and release credentials.</span>
              <span className="school-access-continue">Continue to login <span aria-hidden="true">→</span></span>
            </button>
            <button type="button" className="school-access-card" onClick={()=>handleRole("PRINCIPAL")}>
              <span className="school-access-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 9l9-6 9 6 M4 10h16 M6 10v10 M12 10v10 M18 10v10 M3 21h18"/></svg></span>
              <span className="school-access-label">MONITORING & MANAGEMENT</span><strong>Principal</strong>
              <span className="school-access-description">Monitor school activity, view reports, and manage personnel.</span>
              <span className="school-access-continue">Continue to login <span aria-hidden="true">→</span></span>
            </button>
<button type="button" className="school-access-card" onClick={()=>handleRole("TEACHER")}><span className="school-access-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 4h18v13H3z M7 21h10 M12 17v4 M7 8h10 M7 12h6"/></svg></span><span className="school-access-label">GRADE ENTRY</span><strong>Teacher</strong><span className="school-access-description">Enter SF9 grades for your assigned class and subject.</span><span className="school-access-action">Continue <span aria-hidden="true">→</span></span></button>
          </> : <>
          <button type="button" className="public-access-card" onClick={()=>openRequestModal("Student")}>
           <span className="public-access-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M2 8l10-5 10 5-10 5-10-5 M6 10v7c4 4 8 4 12 0v-7 M22 8v8"/></svg></span>
           <strong>Student</strong><span className="public-access-description">I am currently studying at PMRMIS-SOUTH.</span>
           <span className="public-access-action">Request a document <span aria-hidden="true">→</span></span>
          </button>
          <button type="button" className="public-access-card" onClick={()=>openRequestModal("Alumni")}>
           <span className="public-access-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8 M2 21v-3c0-7 14-7 14 0v3 M18 5a3 3 0 0 1 0 6 M19 14c3 0 3 4 3 7"/></svg></span>
           <strong>Alumni</strong><span className="public-access-description">I graduated or studied at PMRMIS-SOUTH before.</span>
           <span className="public-access-action">Request a document <span aria-hidden="true">→</span></span>
          </button>
         </>}
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

        {audience === "public" && <p className="public-access-help">Fill out the form and upload your supporting documents. We will text you when your document is ready.</p>}
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

                <p>We will text you when your document is ready.</p>
                <div className="request-success-note">

                  <i className="fas fa-mobile-screen-button"></i>

                  <span>
                    {smsEnabled
                      ? "An SMS will be queued after Administration approval and the Administrator’s final confirmation that your credentials are ready for collection."
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
                className="request-form" noValidate
                onBlur={event => {
                  const key = event.target.name;
                  if (!key) return;
                  const issue = validateForm()[key];
                  setErrors(previous => ({...previous, [key]: issue || ''}));
                }}
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

                  {[['firstName', 'First Name'], ['middleName', 'Middle Name'], ['lastName', 'Last Name']].map(([name, label]) => <div className="form-field" key={name}>
                    <label htmlFor={name}>{label}<span>*</span></label>
                    <div className="input-wrapper"><input id={name} name={name} maxLength={80} value={formData[name]} onChange={handleInputChange} onBlur={event => { if (!event.target.value.trim()) setErrors(previous => ({...previous, [name]: "This is a required question"})); }} aria-invalid={Boolean(errors[name])} /></div>
                    {errors[name] && <small className="field-error" role="alert">{errors[name]}</small>}
                  </div>)}

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
                        name="lrn" aria-invalid={Boolean(errors.lrn)}
                        type="text"
                        value={formData.lrn}
                        onChange={handleInputChange}
                        placeholder="12-digit LRN" maxLength={12} inputMode="numeric"
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
                          name="gradeLevel" aria-invalid={Boolean(errors.gradeLevel)}
                          value={formData.gradeLevel}
                          onChange={handleInputChange}
                        >

                          <option value="">
                            Select grade level
                          </option>

                          {Array.from({length: 10}, (_, i) => `Grade ${i + 1}`).map(grade => <option key={grade}>{grade}</option>)}

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

                        <select id="section" name="section" value={formData.section} onChange={handleInputChange} disabled={!formData.gradeLevel} aria-invalid={Boolean(errors.section)}>
                          <option value="">Select section</option>
                          {(options.grade_sections[formData.gradeLevel] || []).map(section => <option key={section}>{section}</option>)}
                        </select>
                        {formData.gradeLevel && !options.grade_sections[formData.gradeLevel]?.length && <small>No sections configured for this grade. Please contact the school.</small>}

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
                          name="graduationYear" aria-invalid={Boolean(errors.graduationYear)}
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
                      Mobile Number (+63)
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="fas fa-mobile-screen-button"></i>

                      <input
                        id="phone"
                        name="phone" aria-invalid={Boolean(errors.phone)}
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="9XXXXXXXXX" maxLength={10} inputMode="numeric"
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

                    {errors.email && <small className="field-error">{errors.email}</small>}
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
                        name="email" aria-invalid={Boolean(errors.email)}
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
                        name="credential" aria-invalid={Boolean(errors.credential)}
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

                      <select id="purpose" name="purpose" value={formData.purpose} onChange={handleInputChange} aria-invalid={Boolean(errors.purpose)}>
                        <option value="">Select purpose</option>{options.purposes.map(purpose => <option key={purpose}>{purpose}</option>)}
                      </select>

                    </div>

                    {errors.purpose && (
                      <small className="field-error">
                        {errors.purpose}
                      </small>
                    )}

                  </div>

                  <div className="form-field full-width">
                    <label htmlFor="otherPurpose">Other Reason/Purpose</label>
                    <div className="input-wrapper"><input id="otherPurpose" name="otherPurpose" disabled={formData.purpose !== "Other Documents"} maxLength={2000} value={formData.otherPurpose} onChange={handleInputChange} aria-invalid={Boolean(errors.otherPurpose)} /></div>
                    {errors.otherPurpose && <small className="field-error">{errors.otherPurpose}</small>}
                  </div>
                  <div className="form-field full-width">
                    <label htmlFor="identityDocuments">Identity Verification Documents <span>*</span></label>
                    <p>Upload 1–3 supporting documents for identity verification. At least one document is required. Only authorized school personnel can view these files.</p>
                    <p>You may upload: PSA Birth Certificate, Parent/Guardian Valid ID, Student Valid ID, Request Form of Credentials, or other valid supporting identity documents. Choose the applicable documents; every listed document is not required.</p>
                    <div className="identity-upload-card"><input id="identityDocuments" type="file" multiple disabled={submitting} onChange={event=>{const files=Array.from(event.target.files);event.target.value='';if(formData.identityDocuments.length+files.length>3){setErrors(previous=>({...previous,identityDocuments:'Maximum 3 files. Remove a file before adding another.'}));return;}setFormData(previous=>({...previous,identityDocuments:[...previous.identityDocuments,...files]}));setErrors(previous=>({...previous,identityDocuments:''}));}}/>
                    <p>Maximum 20 MB per file.</p>
                    {formData.identityDocuments.map((file,index)=><div className="identity-file-summary" key={index}><strong>{file.name}</strong> · {(file.size/1024/1024).toFixed(2)} MB · {file.size===0 || file.size>20*1024*1024?'Invalid file size':submitting?'Uploading…':'Ready to upload'} <button type="button" disabled={submitting} onClick={()=>setFormData(previous=>({...previous,identityDocuments:previous.identityDocuments.filter((_,i)=>i!==index)}))}>Remove</button></div>)}
                    {errors.identityDocuments&&<p className="field-error" role="alert">{errors.identityDocuments}</p>}
                    </div>
                  </div>
                  <div className="form-field full-width">
                    <label htmlFor="deliveryMethod">Delivery/Claim Method <span>*</span></label>
                    <div className="input-wrapper"><select id="deliveryMethod" name="deliveryMethod" value={formData.deliveryMethod} onChange={handleInputChange} aria-invalid={Boolean(errors.deliveryMethod)}>
                      <option value="">Select method</option><option value="ON_SITE">Claimed On Site</option><option value="SCHOOL_TO_SCHOOL">School-to-School</option>
                    </select></div>
                    {errors.deliveryMethod && <small className="field-error">{errors.deliveryMethod}</small>}
                    {formData.deliveryMethod === 'ON_SITE' && <p>You will personally claim the physical credential at the school. Please bring your valid ID and PSA for verification.</p>}
                    {formData.deliveryMethod === 'SCHOOL_TO_SCHOOL' && <><p>The school will directly send/forward the requested credential to the school you intend to enroll in, subject to the school's verification and release procedures.</p>
                      <label htmlFor="receivingSchool">Receiving School Name <span>*</span></label><div className="input-wrapper"><input id="receivingSchool" name="receivingSchool" maxLength={200} value={formData.receivingSchool} onChange={handleInputChange} aria-invalid={Boolean(errors.receivingSchool)} /></div>
                      {errors.receivingSchool && <small className="field-error">{errors.receivingSchool}</small>}</>}
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
