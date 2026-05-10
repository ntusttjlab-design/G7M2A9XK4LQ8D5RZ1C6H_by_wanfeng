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
    sending: isEnglish ? 'Submitting. Please wait...' : '正在送出，請稍候...',
    verifying: isEnglish ? 'Verifying. Please wait...' : '正在驗證，請稍候...',
    updating: isEnglish ? 'Updating. Please wait...' : '正在更新，請稍候...',
    submitSuccess: isEnglish ? 'Submission received. Please check the confirmation email.' : '投稿已送出，請查收投稿確認信。',
    verifySuccess: isEnglish ? 'Verification successful. Submission data has been loaded.' : '驗證成功，已載入投稿資料。',
    updateSuccess: isEnglish ? 'Submission updated. Please check the update confirmation email.' : '稿件已更新，請查收更新成功通知信。',
    networkError: isEnglish ? 'Unable to connect to the submission service.' : '無法連線到投稿服務。',
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

  function validatePdf(file, required) {
    if (!file) {
      if (required) throw new Error(text.pdfRequired);
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) throw new Error(text.pdfOnly);
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

  async function callApi(payload) {
    if (!API_URL) return callDemoApi(payload);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
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
        }
      }

      options.forEach(function (option) {
        option.addEventListener('click', function () {
          setMode(option.dataset.submissionMode);
        });
      });
      const initialMode = window.location.hash === '#revision' ? 'revise' : (switcher.dataset.mode || 'submit');
      setMode(initialMode);
    });
  }

  function bindSubmitForm() {
    const forms = document.querySelectorAll('[data-hefc-submit-form]');
    if (!forms.length) return;

    forms.forEach(function (form) {
      const status = form.querySelector('[data-submit-status]') || document.querySelector('[data-submit-status]');
      form.addEventListener('submit', async function (event) {
      event.preventDefault();
      setBusy(form, true);
      showStatus(status, text.sending);

      try {
        const file = form.elements.abstract_pdf.files[0];
        validatePdf(file, true);
        const payload = {
          action: 'submit',
          title: getValue(form, 'paper_title'),
          authors: getValue(form, 'authors'),
          affiliation: getValue(form, 'affiliation'),
          email: getValue(form, 'email'),
          corresponding_author: getValue(form, 'corresponding_author'),
          corresponding_email: getValue(form, 'corresponding_email'),
          abstract: getValue(form, 'abstract_text'),
          keywords: getValue(form, 'keywords'),
          presentation_type: getValue(form, 'presentation_type'),
          topic_area: getValue(form, 'track'),
          pdf: await buildPdfPayload(file)
        };
        const result = await callApi(payload);
        const submissionId = result.submission_id ? ' ' + result.submission_id : '';
        showStatus(status, text.submitSuccess + submissionId, 'success');
        form.reset();
      } catch (error) {
        showStatus(status, error.message || text.networkError, 'error');
      } finally {
        setBusy(form, false);
      }
    });
    });
  }

  function bindVerifyForm() {
    const verifyForms = document.querySelectorAll('[data-hefc-verify-form]');
    if (!verifyForms.length) return;

    verifyForms.forEach(function (verifyForm) {
      const panel = verifyForm.closest('[data-submission-panel]') || document;
      const updateForm = panel.querySelector('[data-hefc-update-form]') || document.querySelector('[data-hefc-update-form]');
      const updateSection = panel.querySelector('[data-update-section]') || document.querySelector('[data-update-section]');
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

  bindSubmissionModeSwitches();
  bindSubmitForm();
  bindVerifyForm();
  bindUpdateForm();
})();
