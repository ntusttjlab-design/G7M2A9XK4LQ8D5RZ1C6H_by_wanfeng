(function () {
  const API_URL = window.HEFC_SUBMISSION_API_URL || '';
  const MAX_PDF_BYTES = 10 * 1024 * 1024;
  const isEnglish = document.documentElement.lang === 'en';
  const DEMO_EMAIL = 'demo@hefc2026.test';
  const DEMO_CODE = '12345';

  const text = {
    apiMissing: isEnglish
      ? 'The submission API URL is not configured yet. Please set window.HEFC_SUBMISSION_API_URL after deploying Google Apps Script.'
      : '尚未設定投稿 API URL。請在 Google Apps Script 部署完成後設定 window.HEFC_SUBMISSION_API_URL。',
    pdfRequired: isEnglish ? 'Please upload a PDF file.' : '請上傳 PDF 檔案。',
    pdfOnly: isEnglish ? 'Only PDF files are accepted.' : '僅接受 PDF 檔案。',
    pdfTooLarge: isEnglish ? 'PDF file size must not exceed 10 MB.' : 'PDF 檔案大小不可超過 10 MB。',
    studentIdRequired: isEnglish ? 'Please upload student ID proof.' : '請上傳學生證明。',
    studentIdOnly: isEnglish ? 'Student ID proof must be PDF, PNG, JPG, or JPEG.' : '學生證明僅接受 PDF、PNG、JPG 或 JPEG。',
    sending: isEnglish ? 'Submitting. Please wait...' : '正在送出，請稍候...',
    verifying: isEnglish ? 'Verifying. Please wait...' : '正在驗證，請稍候...',
    updating: isEnglish ? 'Updating. Please wait...' : '正在更新，請稍候...',
    reportingPayment: isEnglish ? 'Submitting payment information. Please wait...' : '正在送出匯款資料，請稍候...',
    submitSuccess: isEnglish ? 'Submission received. Please check the confirmation email. If it does not arrive, please check your spam or junk folder.' : '投稿已送出，請查收投稿確認信；若未收到，請先檢查垃圾郵件匣。',
    verifySuccess: isEnglish ? 'Verification successful. Submission data has been loaded.' : '驗證成功，已載入投稿資料。',
    updateSuccess: isEnglish ? 'Submission updated. Please check the update confirmation email. If it does not arrive, please check your spam or junk folder.' : '稿件已更新，請查收更新成功通知信；若未收到，請先檢查垃圾郵件匣。',
    paymentSuccess: isEnglish ? 'Payment information received. Please check the confirmation email. If it does not arrive, please check your spam or junk folder.' : '匯款資料已送出，請查收確認信；若未收到，請先檢查垃圾郵件匣。',
    networkError: isEnglish ? 'Unable to connect to the submission service.' : '無法連線到投稿服務。',
    proofOnly: isEnglish ? 'Payment proof must be PDF, PNG, JPG, or JPEG.' : '匯款證明僅接受 PDF、PNG、JPG 或 JPEG。',
    oralClosed: isEnglish ? 'Oral abstract submission is closed. Poster submissions remain available.' : '口頭論文摘要投稿已截止，海報投稿仍可送出。',
    badApiResponse: isEnglish
      ? 'The submission service returned an invalid response. Please contact the conference staff.'
      : '投稿服務回傳格式錯誤，請聯絡大會工作人員。',
    demoVerifyFailed: isEnglish
        ? 'Demo mode: use demo@hefc2026.test and verification code 12345.'
        : '展示模式：請使用 demo@hefc2026.test 與驗證碼 12345。'
  };

  function showStatus(target, message, type) {
    if (!target) return;
    target.textContent = message;
    target.className = 'form-status is-visible' + (type ? ' is-' + type : '');
  }

  function setBusy(form, busy) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = busy;
    button.style.opacity = busy ? '0.72' : '';
    button.style.cursor = busy ? 'wait' : '';
  }

  function getValue(form, name) {
    const field = form.elements[name];
    return field ? field.value.trim() : '';
  }

  function isForumOnly(form) {
    return !!(form.elements.forum_only_registration && form.elements.forum_only_registration.checked);
  }

  function setPaperFieldsDisabled(form, disabled) {
    form.querySelectorAll('[data-paper-only-field]').forEach(function (row) {
      row.classList.toggle('is-disabled', disabled);
      row.querySelectorAll('input, select, textarea').forEach(function (field) {
        if (field.dataset.originalRequired === undefined) {
          field.dataset.originalRequired = field.required ? '1' : '0';
        }
        field.disabled = disabled;
        field.required = disabled ? false : field.dataset.originalRequired === '1';
      });
    });
    const forumAddon = form.elements.technical_forum_registration;
    if (forumAddon) {
      forumAddon.checked = disabled ? true : forumAddon.checked;
      forumAddon.disabled = disabled;
    }
  }

  function syncStudentIdField(form) {
    const select = form.querySelector('[data-registrant-identity]');
    const row = form.querySelector('[data-student-id-row]');
    const input = form.querySelector('[data-student-id-input]');
    if (!select || !row || !input) return;
    const isStudent = select.value === '學生';
    row.classList.toggle('is-hidden', !isStudent);
    input.required = isStudent;
    if (!isStudent) input.value = '';
  }

  function syncInvoiceFields(form) {
    const select = form.elements.invoice_tax_id_required;
    const fields = form.querySelector('[data-invoice-fields]');
    const title = form.elements.invoice_title;
    const taxId = form.elements.invoice_tax_id;
    if (!select || !fields || !title || !taxId) return;
    const required = String(select.value || '') === '是';
    fields.classList.toggle('is-hidden', !required);
    title.required = required;
    taxId.required = required;
    if (!required) {
      title.value = '';
      taxId.value = '';
    }
  }

  function bindForumOnlyToggle(form) {
    const toggle = form.querySelector('[data-forum-only-toggle]');
    if (!toggle) return;
    const update = function () {
      setPaperFieldsDisabled(form, toggle.checked);
    };
    toggle.addEventListener('change', update);
    update();
  }

  function normalizePresentationType(value) {
    const textValue = String(value || '').trim();
    const lower = textValue.toLowerCase();
    if (textValue === '學生論文競賽 (Oral Competition)' || lower.includes('student oral') || lower.includes('oral competition') || textValue.includes('學生論文競賽')) {
      return '學生論文競賽 (Oral Competition)';
    }
    if (textValue === '海報發表 (Poster)' || lower.includes('poster') || textValue.includes('海報')) {
      return '海報發表 (Poster)';
    }
    if (textValue === '一般論文發表 (Oral)' || lower.includes('oral') || textValue.includes('一般論文')) {
      return '一般論文發表 (Oral)';
    }
    return textValue;
  }

  function normalizeTopicArea(value) {
    const textValue = String(value || '').trim();
    const lower = textValue.toLowerCase();
    if (/^1[.．]/.test(textValue) || textValue.includes('氫能') || lower.includes('hydrogen production') || lower.includes('storage')) {
      return '1. 氫能生產與儲存';
    }
    if (/^2[.．]/.test(textValue) || textValue.includes('燃料電池') || lower.includes('fuel cell')) {
      return '2. 燃料電池材料與系統';
    }
    if (/^3[.．]/.test(textValue) || textValue.includes('能源政策') || lower.includes('policy') || lower.includes('industry')) {
      return '3. 能源政策與產業展望';
    }
    if (/^4[.．]/.test(textValue) || textValue.includes('其他') || lower.includes('other')) {
      return '4. 其他相關能源技術';
    }
    return textValue;
  }

  function oralSubmissionClosed(presentationType) {
    if (normalizePresentationType(presentationType) === '海報發表 (Poster)') return false;
    const now = new Date();
    const compact = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return compact >= 20260808;
  }

  function validatePdf(file, required) {
    if (!file) {
      if (required) throw new Error(text.pdfRequired);
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) throw new Error(text.pdfOnly);
    if (file.size > MAX_PDF_BYTES) throw new Error(text.pdfTooLarge);
  }

  function validatePaymentProof(file) {
    if (!file) return;
    const allowed = file.type === 'application/pdf' || file.type === 'image/png' || file.type === 'image/jpeg' || /\.(pdf|png|jpe?g)$/i.test(file.name);
    if (!allowed) throw new Error(text.proofOnly);
    if (file.size > MAX_PDF_BYTES) throw new Error(text.pdfTooLarge);
  }

  function validateStudentId(file, required) {
    if (!file) {
      if (required) throw new Error(text.studentIdRequired);
      return;
    }
    const allowed = file.type === 'application/pdf' || file.type === 'image/png' || file.type === 'image/jpeg' || /\.(pdf|png|jpe?g)$/i.test(file.name);
    if (!allowed) throw new Error(text.studentIdOnly);
    if (file.size > MAX_PDF_BYTES) throw new Error(text.pdfTooLarge);
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',').pop() : result);
      };
      reader.onerror = function () {
        reject(reader.error || new Error('File read failed'));
      };
      reader.readAsDataURL(file);
    });
  }

  async function buildPdfPayload(file) {
    if (!file) return null;
    return {
      fileName: file.name,
      mimeType: file.type || 'application/pdf',
      size: file.size,
      base64: await readFileAsBase64(file)
    };
  }

  async function buildFilePayload(file) {
    if (!file) return null;
    return {
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      base64: await readFileAsBase64(file)
    };
  }

  async function callApi(payload) {
    if (!API_URL) return callDemoApi(payload);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(text.badApiResponse);
    }
    if (!data.ok) {
      throw new Error((data.error && data.error.message) || text.networkError);
    }
    return data;
  }

  async function callDemoApi(payload) {
    if (payload.action === 'verify') {
      const email = String(payload.email || '').trim().toLowerCase();
      const code = String(payload.verification_code || '').trim();
      if (email !== DEMO_EMAIL || code !== DEMO_CODE) {
        throw new Error(text.demoVerifyFailed);
      }
      return {
        ok: true,
        submission: {
          submission_id: 'HEFC2026-DEMO',
          title: '質子交換膜燃料電池中低鉑觸媒層之水管理與性能分析',
          authors: '王小明、陳怡君、林志豪',
          affiliation: '國立臺灣科技大學 材料科學與工程系',
          email: DEMO_EMAIL,
          corresponding_author: '陳教授',
          corresponding_email: 'advisor@mail.ntust.edu.tw',
          abstract: '本研究針對質子交換膜燃料電池於中低濕度操作條件下之水管理行為進行分析，並探討低鉑觸媒層結構對電池性能之影響。此筆資料為前端展示測試用。',
          keywords: '燃料電池、低鉑觸媒、水管理、質子交換膜',
          pdf_url: '',
          version_number: 1
        }
      };
    }
    if (payload.action === 'update') {
      return {
        ok: true,
        submission_id: payload.submission_id || 'HEFC2026-DEMO',
        version_number: 2
      };
    }
    throw new Error(text.apiMissing);
  }

  function bindSubmissionModeSwitches() {
    document.querySelectorAll('[data-submission-switch]').forEach(function (switcher) {
      const options = switcher.querySelectorAll('[data-submission-mode]');
      const section = switcher.closest('.body-section') || document;
      const panels = section.querySelectorAll('[data-submission-panel]');

      function setMode(mode) {
        switcher.dataset.mode = mode;
        options.forEach(function (option) {
          const active = option.dataset.submissionMode === mode;
          option.classList.toggle('is-active', active);
          option.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        panels.forEach(function (panel) {
          panel.classList.toggle('is-hidden', panel.dataset.submissionPanel !== mode);
        });
        if (mode === 'revise' && window.history && window.history.replaceState) {
          window.history.replaceState(null, '', '#revision');
        } else if (mode === 'submit' && window.history && window.history.replaceState && window.location.hash === '#revision') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } else if (mode === 'submit' && window.history && window.history.replaceState && window.location.hash === '#payment') {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }

      options.forEach(function (option) {
        option.addEventListener('click', function () {
          setMode(option.dataset.submissionMode);
        });
      });
      const initialMode = (window.location.hash === '#revision' || window.location.hash === '#payment') ? 'revise' : (switcher.dataset.mode || 'submit');
      setMode(initialMode);
    });
  }

  function bindSubmitForm() {
    const forms = document.querySelectorAll('[data-hefc-submit-form]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      bindForumOnlyToggle(form);
      const status = form.querySelector('[data-submit-status]') || document.querySelector('[data-submit-status]');
      form.addEventListener('submit', async function (event) {
      event.preventDefault();
      setBusy(form, true);
      showStatus(status, text.sending);

      try {
        const forumOnly = isForumOnly(form);
        const file = form.elements.abstract_pdf && form.elements.abstract_pdf.files ? form.elements.abstract_pdf.files[0] : null;
        validatePdf(file, !forumOnly);
        const presentationType = forumOnly ? '技術論壇報名' : normalizePresentationType(getValue(form, 'presentation_type'));
        const registrantIdentity = getValue(form, 'registrant_identity');
        const technicalForumRegistration = forumOnly || (form.elements.technical_forum_registration && form.elements.technical_forum_registration.checked) ? '是' : '否';
        const studentIdInput = form.elements.student_id_file;
        const studentIdFile = studentIdInput && studentIdInput.files ? studentIdInput.files[0] : null;
        validateStudentId(studentIdFile, registrantIdentity === '學生');
        if (!forumOnly && oralSubmissionClosed(presentationType)) {
          throw new Error(text.oralClosed);
        }
        const payload = {
          action: 'submit',
          registration_mode: forumOnly ? '只報名技術論壇' : '論文投稿',
          title: forumOnly ? '只報名技術論壇' : getValue(form, 'paper_title'),
          authors: getValue(form, 'authors'),
          affiliation: getValue(form, 'affiliation'),
          email: getValue(form, 'email'),
          corresponding_author: forumOnly ? '' : getValue(form, 'corresponding_author'),
          corresponding_email: forumOnly ? '' : getValue(form, 'corresponding_email'),
          abstract: forumOnly ? '只報名技術論壇' : getValue(form, 'abstract_text'),
          keywords: forumOnly ? '技術論壇' : getValue(form, 'keywords'),
          presentation_type: presentationType,
          registrant_identity: registrantIdentity,
          technical_forum_registration: technicalForumRegistration,
          topic_area: forumOnly ? '技術論壇' : normalizeTopicArea(getValue(form, 'track')),
          pdf: await buildPdfPayload(file),
          student_id: await buildFilePayload(studentIdFile)
        };
        const result = await callApi(payload);
        const submissionId = result.submission_id ? ' ' + result.submission_id : '';
        showStatus(status, text.submitSuccess + submissionId, 'success');
        form.reset();
        setPaperFieldsDisabled(form, false);
        syncStudentIdField(form);
      } catch (error) {
        showStatus(status, error.message || text.networkError, 'error');
      } finally {
        setBusy(form, false);
      }
    });
    });
  }

  function bindRegistrantIdentityFields() {
    document.querySelectorAll('[data-hefc-submit-form]').forEach(function (form) {
      const select = form.querySelector('[data-registrant-identity]');
      if (!select) return;

      select.addEventListener('change', function () {
        syncStudentIdField(form);
      });
      syncStudentIdField(form);
    });
  }

  function bindVerifyForm() {
    const verifyForms = document.querySelectorAll('[data-hefc-verify-form]');
    if (!verifyForms.length) return;

    verifyForms.forEach(function (verifyForm) {
      const panel = verifyForm.closest('[data-submission-panel]') || document;
      const section = verifyForm.closest('.body-section') || document;
      const updateForm = panel.querySelector('[data-hefc-update-form]') || document.querySelector('[data-hefc-update-form]');
      const paymentForm = panel.querySelector('[data-hefc-payment-form]') || document.querySelector('[data-hefc-payment-form]');
      const updateSection = panel.querySelector('[data-update-section]') || document.querySelector('[data-update-section]');
      const paymentPanel = section.querySelector('[data-submission-panel="payment"]');
      if (!updateForm || !updateSection) return;
      const verifyStatus = verifyForm.querySelector('[data-verify-status]') || panel.querySelector('[data-verify-status]') || document.querySelector('[data-verify-status]');

      verifyForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      setBusy(verifyForm, true);
      showStatus(verifyStatus, text.verifying);

      try {
        const payload = {
          action: 'verify',
          email: getValue(verifyForm, 'email'),
          verification_code: getValue(verifyForm, 'verification_code')
        };
        const result = await callApi(payload);
        const item = result.submission;

        updateForm.elements.submission_id.value = item.submission_id || '';
        updateForm.elements.email.value = payload.email;
        updateForm.elements.verification_code.value = payload.verification_code;
        if (paymentForm) {
          paymentForm.elements.email.value = payload.email;
          paymentForm.elements.verification_code.value = payload.verification_code;
        }
        updateForm.elements.title.value = item.title || '';
        updateForm.elements.authors.value = item.authors || '';
        if (updateForm.elements.corresponding_author) {
          updateForm.elements.corresponding_author.value = item.corresponding_author || '';
        }
        if (updateForm.elements.corresponding_email) {
          updateForm.elements.corresponding_email.value = item.corresponding_email || '';
        }
        updateForm.elements.abstract.value = item.abstract || '';
        updateForm.elements.keywords.value = item.keywords || '';

        updateSection.classList.remove('is-hidden');
        if (paymentPanel) {
          paymentPanel.classList.remove('is-hidden');
        }
        showStatus(verifyStatus, text.verifySuccess, 'success');
        updateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        showStatus(verifyStatus, error.message || text.networkError, 'error');
      } finally {
        setBusy(verifyForm, false);
      }
    });
    });
  }

  function bindUpdateForm() {
    const forms = document.querySelectorAll('[data-hefc-update-form]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      const status = form.querySelector('[data-update-status]') || document.querySelector('[data-update-status]');
      form.addEventListener('submit', async function (event) {
      event.preventDefault();
      setBusy(form, true);
      showStatus(status, text.updating);

      try {
        const file = form.elements.abstract_pdf.files[0];
        validatePdf(file, false);
        const payload = {
          action: 'update',
          submission_id: getValue(form, 'submission_id'),
          email: getValue(form, 'email'),
          verification_code: getValue(form, 'verification_code'),
          title: getValue(form, 'title'),
          authors: getValue(form, 'authors'),
          corresponding_author: getValue(form, 'corresponding_author'),
          corresponding_email: getValue(form, 'corresponding_email'),
          abstract: getValue(form, 'abstract'),
          keywords: getValue(form, 'keywords'),
          pdf: await buildPdfPayload(file)
        };
        const result = await callApi(payload);
        const versionText = result.version_number ? ' v' + result.version_number : '';
        showStatus(status, text.updateSuccess + versionText, 'success');
        form.elements.abstract_pdf.value = '';
      } catch (error) {
        showStatus(status, error.message || text.networkError, 'error');
      } finally {
        setBusy(form, false);
      }
    });
    });
  }

  function bindPaymentForm() {
    const forms = document.querySelectorAll('[data-hefc-payment-form]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      const status = form.querySelector('[data-payment-status]') || document.querySelector('[data-payment-status]');
      const invoiceSelect = form.elements.invoice_tax_id_required;
      if (invoiceSelect) {
        invoiceSelect.addEventListener('change', function () { syncInvoiceFields(form); });
        syncInvoiceFields(form);
      }
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        setBusy(form, true);
        showStatus(status, text.reportingPayment);

        try {
          const file = form.elements.payment_proof.files[0];
          validatePaymentProof(file);
          const payload = {
            action: 'submitPaymentReport',
            email: getValue(form, 'email'),
            verification_code: getValue(form, 'verification_code'),
            transfer_last5: getValue(form, 'transfer_last5'),
            payment_date: getValue(form, 'payment_date'),
            payment_note: getValue(form, 'payment_note'),
            invoice_tax_id_required: getValue(form, 'invoice_tax_id_required'),
            invoice_title: getValue(form, 'invoice_title'),
            invoice_tax_id: getValue(form, 'invoice_tax_id'),
            payment_proof: await buildFilePayload(file)
          };
          const result = await callApi(payload);
          const submissionId = result.submission_id ? ' ' + result.submission_id : '';
          showStatus(status, text.paymentSuccess + submissionId, 'success');
          form.reset();
          syncInvoiceFields(form);
        } catch (error) {
          showStatus(status, error.message || text.networkError, 'error');
        } finally {
          setBusy(form, false);
        }
      });
    });
  }

  bindSubmissionModeSwitches();
  bindRegistrantIdentityFields();
  bindSubmitForm();
  bindVerifyForm();
  bindUpdateForm();
  bindPaymentForm();
})();
