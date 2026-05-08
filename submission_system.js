(function () {
  "use strict";

  var CONFIG = {
    mode: "offline",
    conferenceEdition: 21,
    conferenceName: "第21屆全國氫能與燃料電池學術研討會",
    apiEndpoint: "/api/abstract-submissions",
    driveRootFolderId: "1zoU4aU_kbCq_LmV4B9sCr27dYdewZ-zb",
    driveFolders: {
      "一般論文": "1M3CxwVQbadzzKpssVk4qg4DxnoZyoY27",
      "海報": "1UdzAzx58TVW6_dXhLilEu5f1UTMA8vV5",
      "學生競賽": "1cTELKeXNAh8o_bPuBnHCfrbdfiwdc6gO",
    },
  };

  var form = document.getElementById("abstract-submission-form");
  if (!form) return;

  var category = document.getElementById("submission-category");
  var target = document.getElementById("submission-target");
  var abstractText = document.getElementById("abstract-text");
  var abstractCount = document.getElementById("abstract-count");
  var authorCount = document.getElementById("author-count");
  var authorFields = document.getElementById("author-fields");
  var sameAsCorresponding = document.getElementById("presenter-same-as-corresponding");
  var presenterName = document.getElementById("presenter-name");
  var presenterEmail = document.getElementById("presenter-email");
  var correspondingFields = document.getElementById("corresponding-fields");
  var correspondingAuthor = document.getElementById("corresponding-author");
  var correspondingEmail = document.getElementById("corresponding-email");
  var message = document.getElementById("submission-message");
  var preview = document.getElementById("submission-preview");
  var previewContent = document.getElementById("submission-preview-content");

  function updateTarget() {
    var value = category.value;
    if (!value) {
      target.textContent = "請先選擇投稿類別，系統會顯示預計歸檔資料夾。";
      return;
    }
    target.textContent =
      "預計歸檔：" +
      value +
      " / Google Drive folder ID: " +
      CONFIG.driveFolders[value];
  }

  function updateCount() {
    abstractCount.textContent = String((abstractText.value || "").trim().length);
  }

  function setMessage(text, type) {
    message.textContent = text;
    message.className = "form-message" + (type ? " is-" + type : "");
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function field(name) {
    return String(new FormData(form).get(name) || "").trim();
  }

  function populateAuthorCount() {
    if (!authorCount || authorCount.options.length > 1) return;
    for (var i = 1; i <= 20; i += 1) {
      var option = document.createElement("option");
      option.value = String(i);
      option.textContent = i + " 位作者";
      authorCount.appendChild(option);
    }
  }

  function renderAuthorFields() {
    if (!authorCount || !authorFields) return;
    var count = Number(authorCount.value || 0);
    authorFields.innerHTML = "";
    if (!count) {
      var empty = document.createElement("p");
      empty.className = "field-hint";
      empty.textContent = "尚未選擇作者人數。";
      authorFields.appendChild(empty);
      return;
    }

    for (var i = 1; i <= count; i += 1) {
      var affiliationRequired = i <= 4;
      var row = document.createElement("div");
      row.className = "author-row";
      row.innerHTML =
        '<div class="form-row">' +
        '<label for="author-name-' + i + '">作者 ' + i + ' 姓名 <span>必填</span></label>' +
        '<input type="text" id="author-name-' + i + '" name="author_name_' + i + '" required placeholder="例：王小明">' +
        "</div>" +
        '<div class="form-row">' +
        '<label for="author-affiliation-' + i + '">作者 ' + i + ' 單位標註' + (affiliationRequired ? " <span>必填</span>" : "") + "</label>" +
        '<input type="text" id="author-affiliation-' + i + '" name="author_affiliation_' + i + '"' + (affiliationRequired ? " required" : "") + ' placeholder="例：1 國立臺灣科技大學 材料科學與工程系">' +
        "</div>";
      authorFields.appendChild(row);
    }
  }

  function buildAuthors() {
    var count = Number(field("author_count") || 0);
    var authors = [];
    for (var i = 1; i <= count; i += 1) {
      var name = field("author_name_" + i);
      var affiliation = field("author_affiliation_" + i);
      authors.push({
        order: i,
        name: name,
        affiliation_label: affiliation,
      });
    }
    return authors;
  }

  function syncCorrespondingFromPresenter() {
    if (!sameAsCorresponding || !sameAsCorresponding.checked) return;
    correspondingAuthor.value = presenterName.value;
    correspondingEmail.value = presenterEmail.value;
  }

  function updateCorrespondingMode() {
    if (!sameAsCorresponding) return;
    syncCorrespondingFromPresenter();
    if (correspondingFields) {
      correspondingFields.hidden = sameAsCorresponding.checked;
    }
    correspondingAuthor.required = !sameAsCorresponding.checked;
    correspondingEmail.required = !sameAsCorresponding.checked;
    correspondingAuthor.readOnly = sameAsCorresponding.checked;
    correspondingEmail.readOnly = sameAsCorresponding.checked;
    correspondingAuthor.classList.toggle("is-readonly", sameAsCorresponding.checked);
    correspondingEmail.classList.toggle("is-readonly", sameAsCorresponding.checked);
  }

  function buildPayload() {
    var selectedCategory = field("category");
    var authorItems = buildAuthors();
    var authorsText = authorItems
      .map(function (item) {
        return "作者" + item.order + "：" + item.name + "；單位標註：" + item.affiliation_label;
      })
      .join("\n");
    var safeTitle = field("title").replace(/[\\/:*?"<>|#%{}~&]/g, "_");
    var expectedRecordName =
      "HEFC2026_" +
      selectedCategory +
      "_" +
      safeTitle.slice(0, 60) +
      "_" + field("corresponding_email");

    return {
      conference_edition: CONFIG.conferenceEdition,
      conference_name: CONFIG.conferenceName,
      title: field("title"),
      presenter_name: field("presenter_name"),
      presenter_email: field("presenter_email"),
      corresponding_author: field("corresponding_author"),
      corresponding_email: field("corresponding_email"),
      affiliation_school: field("affiliation_school"),
      affiliation_department: field("affiliation_department"),
      author_count: Number(field("author_count") || 0),
      author_items: authorItems,
      authors: authorsText,
      category: selectedCategory,
      topic: field("topic"),
      project_number: field("project_number"),
      keywords: field("keywords"),
      abstract_text: field("abstract_text"),
      expected_record_name: expectedRecordName,
      target_drive_root_folder_id: CONFIG.driveRootFolderId,
      target_drive_folder_name: selectedCategory,
      target_drive_folder_id: CONFIG.driveFolders[selectedCategory],
      submitted_at_preview: new Date().toISOString(),
    };
  }

  function validate(payload) {
    var missing = [];
    [
      ["論文發表形式與競賽", payload.category],
      ["投稿領域", payload.topic],
      ["論文題目", payload.title],
      ["通訊作者", payload.corresponding_author],
      ["通訊作者 Email", payload.corresponding_email],
      ["發表人", payload.presenter_name],
      ["發表人 Email", payload.presenter_email],
      ["單位 / 學校", payload.affiliation_school],
      ["系所 / 部門", payload.affiliation_department],
      ["作者人數", payload.author_count],
      ["作者群與單位標註", payload.authors],
      ["關鍵字", payload.keywords],
      ["摘要簡述", payload.abstract_text],
    ].forEach(function (item) {
      if (!item[1]) missing.push(item[0]);
    });

    if (missing.length) return "請補齊必填欄位：" + missing.join("、") + "。";
    if (!isEmail(payload.presenter_email)) return "發表人 Email 格式不正確。";
    if (!isEmail(payload.corresponding_email)) return "通訊作者 Email 格式不正確。";
    if (payload.abstract_text.length < 300 || payload.abstract_text.length > 500) {
      return "摘要簡述需為 300-500 字。";
    }
    for (var i = 0; i < payload.author_items.length; i += 1) {
      var author = payload.author_items[i];
      if (!author.name) {
        return "請填寫作者 " + author.order + " 的姓名。";
      }
      if (author.order <= 4 && !author.affiliation_label) {
        return "請填寫作者 " + author.order + " 的單位標註。";
      }
    }
    return "";
  }

  function submitOffline(payload) {
    preview.hidden = false;
    previewContent.textContent = JSON.stringify(payload, null, 2);
    setMessage(
      "已建立投稿資訊預覽。正式上線時會將資料寫入後端、寄出確認信，並在雲端整理投稿資訊。",
      "ok"
    );
  }

  function submitToBackend(payload) {
    var body = new FormData();
    body.append("metadata", JSON.stringify(payload));
    return fetch(CONFIG.apiEndpoint, {
      method: "POST",
      body: body,
    }).then(function (res) {
      if (!res.ok) throw new Error("投稿送出失敗，請稍後再試。");
      return res.json();
    });
  }

  populateAuthorCount();
  renderAuthorFields();

  category.addEventListener("change", updateTarget);
  abstractText.addEventListener("input", updateCount);
  authorCount.addEventListener("change", renderAuthorFields);
  sameAsCorresponding.addEventListener("change", updateCorrespondingMode);
  presenterName.addEventListener("input", syncCorrespondingFromPresenter);
  presenterEmail.addEventListener("input", syncCorrespondingFromPresenter);

  form.addEventListener("reset", function () {
    window.setTimeout(function () {
      updateTarget();
      updateCount();
      renderAuthorFields();
      updateCorrespondingMode();
      preview.hidden = true;
      previewContent.textContent = "";
      setMessage("", "");
    }, 0);
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    syncCorrespondingFromPresenter();
    var payload = buildPayload();
    var error = validate(payload);
    if (error) {
      setMessage(error, "error");
      return;
    }

    if (CONFIG.mode === "offline") {
      submitOffline(payload);
      return;
    }

    setMessage("投稿送出中，請稍候。", "");
    submitToBackend(payload)
      .then(function (result) {
        preview.hidden = false;
        previewContent.textContent = JSON.stringify(result, null, 2);
        setMessage("投稿已送出。", "ok");
      })
      .catch(function (err) {
        setMessage(err.message || "投稿送出失敗。", "error");
      });
  });

  updateTarget();
  updateCount();
  updateCorrespondingMode();
})();
