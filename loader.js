(function () {
  'use strict';

  var scriptTag = document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var scriptParams = {};
  try {
    var qs = (scriptTag.src.split('?')[1] || '');
    qs.split('&').forEach(function (pair) {
      var kv = pair.split('=');
      if (kv[0]) scriptParams[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
  } catch (e) {}

  var WIDGET_KEY = scriptParams.key      || '';
  var LANGUAGE   = scriptParams.lang     || 'fr';
  var TEMPLATE   = scriptParams.template || 'Opel';
  var BASE_URL   = 'https://admin.tradein.stellantis.com/api';

  var OPTIONAL_KEYS = [
    'siteGeo', 'codeMarketing', 'interestAnnouncementLink', 'mopId', 'lcdv',
    'carType', 'co2', 'energy', 'interestMake', 'interestModel',
    'interestVersion', 'ncPrice', 'source_acquisition',
    'utm_campaign', 'utm_content', 'utm_term'
  ];


  var OVERLAY_ID = 'autobiz-overlay';
  var MODAL_ID   = 'autobiz-modal';

  // ── Chargement des dépendances ──────────────────────────────────

  function loadCSS(href, id) {
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href; link.id = id;
    document.head.appendChild(link);
  }

  function loadScript(src, id, callback) {
    if (document.getElementById(id)) { if (callback) callback(); return; }
    var s = document.createElement('script');
    s.src = src; s.type = 'text/javascript'; s.id = id;
    s.onload = callback || null;
    document.head.appendChild(s);
  }

  function injectDeps(callback) {
    loadCSS(BASE_URL + '//assets/exchange/css/op.css', 'autobiz-op-css');
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/admin-lte/2.4.3/css/AdminLTE.min.css', 'autobiz-adminlte-css');

    function withBootstrap(cb) {
      if (window.jQuery && window.jQuery.fn.modal) { cb(); return; }
      loadScript('https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js', 'autobiz-bootstrap-js', cb);
    }

    if (window.jQuery) {
      withBootstrap(callback);
    } else {
      loadScript('https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js', 'autobiz-jquery-js', function () {
        withBootstrap(callback);
      });
    }
  }

  // ── Injection de la modale ──────────────────────────────────────

  function injectModal() {
    if (document.getElementById(OVERLAY_ID)) return;

    var style = document.createElement('style');
    style.id = 'autobiz-styles';
    style.textContent = [
      '#' + OVERLAY_ID + '{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;align-items:center;justify-content:center;}',
      '#' + OVERLAY_ID + '.autobiz-open{display:flex;}',
      '#autobiz-dialog{position:relative;width:92vw;max-width:900px;height:88vh;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.35);}',
      '#autobiz-close{position:absolute;top:10px;right:12px;z-index:10;background:rgba(255,255,255,.92);border:none;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:background .2s;}',
      '#autobiz-close:hover{background:#f7ff14;}',
      '#' + MODAL_ID + '{width:100%;height:100%;overflow-y:auto;}',
      '#' + MODAL_ID + ' .modal{position:static!important;display:block!important;}',
      '#' + MODAL_ID + ' .modal-backdrop{display:none!important;}',
      '#' + MODAL_ID + ' .modal-dialog{margin:0;width:100%;max-width:100%;}',
      '#' + MODAL_ID + ' .modal-content{border:none;border-radius:0;box-shadow:none;min-height:100%;}',
      '#' + MODAL_ID + ' .modal-body{padding:0;}',
      '#' + MODAL_ID + ' #close-estimate{display:none;}',
    ].join('');
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = [
      '<div id="autobiz-dialog">',
        '<button id="autobiz-close" aria-label="Fermer">&#x2715;</button>',
        '<div id="' + MODAL_ID + '">',
          '<button id="widgetView" class="universaleHrefExchangeWidget"',
            ' data-toggle="modal" data-target="#myModal"',
            ' data-action="init" data-method="GET"',
            ' data-reveal-id="myModal" style="display:none"></button>',
          '<div class="partExchange">',
            '<div id="myModal" class="modal fade reveal-modal"',
              ' data-reveal="" data-options="closeOnBackgroundClick:false"',
              ' role="dialog" data-reset-on-close="true" tabindex="-1">',
              '<div class="modal-dialog" role="document">',
                '<div class="modal-content">',
                  '<button type="button" class="close" id="close-estimate" data-dismiss="modal" aria-label="Close"></button>',
                  '<div class="modal-body">',
                    '<div class="modal-content" id="modal-content" style="min-height:500px"></div>',
                  '</div>',
                '</div>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);
  }

  // ── Ouverture / fermeture ───────────────────────────────────────

  function openWidget(extraParams) {
    var options = {
      domaine: BASE_URL, apiVersion: 'v1', blocContainer: 'modal-content',
      widgetKey: WIDGET_KEY, language: LANGUAGE, templateID: TEMPLATE, useCase: 'estimate'
    };
    OPTIONAL_KEYS.forEach(function (k) {
      options[k] = (extraParams && extraParams[k]) || scriptParams[k] || '';
    });
    window.widgetOption = options;

    document.getElementById(OVERLAY_ID).classList.add('autobiz-open');
    document.body.style.overflow = 'hidden';
    var $ = window.jQuery;
    $('#widgetView').trigger('click');
    $('#myModal').modal('show');
  }

  function closeWidget() {
    window.jQuery('#myModal').modal('hide');
    document.getElementById(OVERLAY_ID).classList.remove('autobiz-open');
    document.body.style.overflow = '';
  }

  // ── Branchement des boutons [data-autobiz-widget] ───────────────

  function bindButtons() {
    document.querySelectorAll('[data-autobiz-widget]').forEach(function (btn) {
      if (btn._autobizBound) return;
      btn._autobizBound = true;
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var extra = {};
        OPTIONAL_KEYS.forEach(function (k) {
          var val = btn.getAttribute('data-' + k);
          if (val) extra[k] = val;
        });
        openWidget(extra);
      });
    });
  }

  // ── API publique ────────────────────────────────────────────────

  window.AutobizWidget = {
    open:  function (params) { openWidget(params); },
    close: function ()       { closeWidget(); }
  };

  // ── Initialisation ──────────────────────────────────────────────

  function init() {
    injectDeps(function () {
      injectModal();
      loadScript(BASE_URL + '//assets/exchange/js/autobizExchange.js?time=', 'autobiz-exchange-js', function () {
        bindButtons();

        document.getElementById('autobiz-close').addEventListener('click', closeWidget);

        document.getElementById(OVERLAY_ID).addEventListener('click', function (e) {
          if (e.target.id === OVERLAY_ID) closeWidget();
        });

        document.addEventListener('keydown', function (e) {
          if (e.key === 'Escape') closeWidget();
        });

        window.jQuery('#myModal').on('hidden.bs.modal', closeWidget);

        if (window.MutationObserver) {
          new MutationObserver(bindButtons).observe(document.body, { childList: true, subtree: true });
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
