(function () {
  'use strict';

  // ── Lecture des paramètres de l'URL du script ───────────────────

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

  // IDs préfixés pour éviter tout conflit avec le site hôte
  var NS         = 'tradein-widget';
  var OVERLAY_ID = NS + '-overlay';
  var DIALOG_ID  = NS + '-dialog';
  var CLOSE_ID   = NS + '-close';
  var MODAL_ID   = NS + '-modal';
  var STYLES_ID  = NS + '-styles';

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
    loadCSS(BASE_URL + '//assets/exchange/css/op.css', NS + '-op-css');
    loadCSS('https://cdnjs.cloudflare.com/ajax/libs/admin-lte/2.4.3/css/AdminLTE.min.css', NS + '-adminlte-css');

    function withBootstrap(cb) {
      if (window.jQuery && window.jQuery.fn.modal) { cb(); return; }
      loadScript('https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js', NS + '-bootstrap-js', cb);
    }

    if (window.jQuery) {
      withBootstrap(callback);
    } else {
      loadScript('https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js', NS + '-jquery-js', function () {
        withBootstrap(callback);
      });
    }
  }

  // ── Injection de la modale ──────────────────────────────────────

  function injectModal() {
    if (document.getElementById(OVERLAY_ID)) return;

    var style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = [
      // Overlay plein écran
      '#' + OVERLAY_ID + '{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;align-items:center;justify-content:center;}',
      '#' + OVERLAY_ID + '.tradein-widget-open{display:flex;}',
      // Boîte de dialogue
      '#' + DIALOG_ID + '{position:relative;width:92vw;max-width:900px;height:88vh;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 28px 80px rgba(0,0,0,.35);}',
      // Bouton de fermeture
      '#' + CLOSE_ID + '{position:absolute;top:10px;right:12px;z-index:100001;background:rgba(255,255,255,.92);border:none;border-radius:50%;width:34px;height:34px;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.18);transition:background .2s;}',
      '#' + CLOSE_ID + ':hover{background:#f7ff14;}',
      // Conteneur interne du widget
      '#' + MODAL_ID + '{width:100%;height:100%;overflow:hidden;position:relative;}',
      // Overrides Bootstrap — scopés au conteneur, jamais globaux
      '#' + MODAL_ID + ' .modal{position:static!important;display:block!important;opacity:1!important;visibility:visible!important;}',
      '#' + MODAL_ID + ' .modal-backdrop{display:none!important;}',
      '#' + MODAL_ID + ' .modal-dialog{margin:0;width:100%!important;max-width:100%!important;transform:none!important;}',
      '#' + MODAL_ID + ' .modal-content{border:none!important;border-radius:0!important;box-shadow:none!important;min-height:100%;width:100%;visibility:visible!important;opacity:1!important;}',
      '#' + MODAL_ID + ' .modal-body{padding:0!important;}',
      '#' + MODAL_ID + ' #close-estimate{display:none!important;}',
      '#' + MODAL_ID + ' *{visibility:visible!important;}',
      // Empêche #myModal de se positionner en fixed hors de notre dialog
      '#myModal{position:static!important;width:100%!important;height:100%!important;top:auto!important;left:auto!important;}',
      // Neutralise le backdrop que Bootstrap injecte directement dans <body>
      'body > .modal-backdrop{display:none!important;}',
    ].join('');
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = [
      '<div id="' + DIALOG_ID + '">',
        '<button id="' + CLOSE_ID + '" aria-label="Fermer">&#x2715;</button>',
        '<div id="' + MODAL_ID + '">',
          // Bouton fantôme requis par autobizExchange.js — caché, jamais visible
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
    // widgetOption est requis par autobizExchange.js — variable imposée par le widget core
    window.widgetOption = options;

    document.getElementById(OVERLAY_ID).classList.add('tradein-widget-open');
    // Classe CSS plutôt que style inline pour éviter de modifier body directement
    document.body.classList.add('tradein-widget-open');

    // Le trigger sur #widgetView suffit — autobizExchange.js gère lui-même modal('show')
    // Ne pas appeler modal('show') manuellement pour éviter le double rendu
    window.jQuery('#widgetView').trigger('click');
  }

  function closeWidget() {
    window.jQuery('#myModal').modal('hide');
    document.getElementById(OVERLAY_ID).classList.remove('tradein-widget-open');
    document.body.classList.remove('tradein-widget-open');
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

  // ── API publique — namespace TradeInWidget ──────────────────────

  window.TradeInWidget = {
    open:  function (params) { openWidget(params); },
    close: function ()       { closeWidget(); }
  };

  // ── Initialisation ──────────────────────────────────────────────

  function init() {
    injectDeps(function () {
      injectModal();

      // Règle body.tradein-widget-open — dans le style scopé du loader
      var bodyRule = document.getElementById(STYLES_ID);
      if (bodyRule) {
        bodyRule.textContent += 'body.tradein-widget-open{overflow:hidden;}';
      }

      loadScript(BASE_URL + '//assets/exchange/js/autobizExchange.js?time=', NS + '-exchange-js', function () {
        bindButtons();

        document.getElementById(CLOSE_ID).addEventListener('click', closeWidget);

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
