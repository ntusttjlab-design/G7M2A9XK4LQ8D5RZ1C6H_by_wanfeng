(function () {
  "use strict";

  var API = "";

  function parseError(res, bodyText) {
    try {
      var j = JSON.parse(bodyText);
      if (j.detail) {
        if (Array.isArray(j.detail)) {
          return j.detail
            .map(function (d) {
              return d.msg || JSON.stringify(d);
            })
            .join("；");
        }
        if (typeof j.detail === "string") return j.detail;
      }
    } catch (e) {}
    return bodyText || res.statusText || "請稍後再試";
  }

  function showMsg(el, type, text) {
    if (!el) return;
    el.textContent = text;
    el.className =
      "form-msg is-visible form-msg--" + (type === "ok" ? "ok" : "err");
  }

  function bindRegistrationForm() {
    var form = document.getElementById("form-registration");
    var msg = document.getElementById("form-registration-msg");
    if (!form || !msg) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "form-msg";
      msg.textContent = "";

      var data = {
        name_zh: form.name_zh.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        organization: form.organization.value.trim(),
        participant_type: form.participant_type.value,
        dietary: form.dietary.value.trim(),
        invoice_need: form.invoice_need.value.trim(),
        remarks: form.remarks.value.trim(),
      };

      fetch(API + "/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (res) {
          return res.text().then(function (t) {
            return { res: res, t: t };
          });
        })
        .then(function (_ref) {
          var res = _ref.res;
          var t = _ref.t;
          if (!res.ok) throw new Error(parseError(res, t));
          var j = JSON.parse(t);
          showMsg(
            msg,
            "ok",
            j.message + "（編號 #" + j.id + "）"
          );
          form.reset();
        })
        .catch(function (err) {
          showMsg(msg, "err", err.message || "送出失敗");
        });
    });
  }

  function bindSubmissionForm() {
    var form = document.getElementById("form-submission");
    var msg = document.getElementById("form-submission-msg");
    if (!form || !msg) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      msg.className = "form-msg";
      msg.textContent = "";

      var fd = new FormData(form);

      fetch(API + "/api/submissions", {
        method: "POST",
        body: fd,
      })
        .then(function (res) {
          return res.text().then(function (t) {
            return { res: res, t: t };
          });
        })
        .then(function (_ref) {
          var res = _ref.res;
          var t = _ref.t;
          if (!res.ok) throw new Error(parseError(res, t));
          var j = JSON.parse(t);
          showMsg(
            msg,
            "ok",
            j.message +
              " 查詢代碼：" +
              j.receipt_token
          );
          form.reset();
        })
        .catch(function (err) {
          showMsg(msg, "err", err.message || "送出失敗");
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindRegistrationForm();
    bindSubmissionForm();
  });
})();
