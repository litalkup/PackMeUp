/*
 * PackMeUp - keeping two devices in step through Google Drive.
 *
 * The lists live in the app's own private folder in your Drive (the appdata
 * space), which no other app and no other file of yours can see. There is no
 * server in the middle: each device signs in to your Google account, reads
 * that one file, merges it with what it has, and writes the result back.
 *
 * Merging is what makes it safe to sync in any order - see mergeState in
 * store.js. Whoever edited an item last wins, and a deletion is remembered so
 * it does not come back from the other device.
 */
(function (global) {
  'use strict';

  var store = global.PMU.store;
  var i18n = global.PMU.i18n;

  var SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  var FILE_NAME = 'packmeup-sync.json';
  var GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
  var FILES = 'https://www.googleapis.com/drive/v3/files';
  var UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

  var token = null;            /* { value, expiresAt } */
  var tokenClient = null;
  var scriptLoading = null;
  var syncing = false;

  function clientId() { return store.getSetting('driveClientId') || ''; }

  function configured() { return !!clientId(); }

  function connected() { return !!store.getSetting('driveConnected'); }

  function lastSync() { return store.getSetting('driveLastSync') || null; }

  /* ------------------------------------------------------------ transport */

  /*
   * Everything that touches the network sits here, so the sync logic above it
   * can be exercised against a stand-in Drive in the tests.
   */
  var net = {
    loadScript: function () {
      if (global.google && global.google.accounts) return Promise.resolve();
      if (scriptLoading) return scriptLoading;
      scriptLoading = new Promise(function (resolve, reject) {
        var script = global.document.createElement('script');
        script.src = GIS_SCRIPT;
        script.async = true;
        script.onload = resolve;
        script.onerror = function () { reject(new Error(i18n.t('drive.noScript'))); };
        global.document.head.appendChild(script);
      });
      return scriptLoading;
    },

    /*
     * interactive: true opens Google's consent window. false asks for a token
     * quietly, which works while the Google session is still alive.
     */
    requestToken: function (interactive) {
      return net.loadScript().then(function () {
        return new Promise(function (resolve, reject) {
          var oauth = global.google.accounts.oauth2;
          if (!tokenClient) {
            tokenClient = oauth.initTokenClient({
              client_id: clientId(),
              scope: SCOPE,
              callback: function () { /* replaced per request */ }
            });
          }
          tokenClient.callback = function (response) {
            if (response && response.access_token) {
              resolve({
                value: response.access_token,
                expiresAt: Date.now() + (Number(response.expires_in || 3000) - 60) * 1000
              });
            } else {
              reject(new Error(i18n.t('drive.noToken')));
            }
          };
          tokenClient.error_callback = function () {
            reject(new Error(i18n.t('drive.noToken')));
          };
          tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
        });
      });
    },

    request: function (url, options) {
      options = options || {};
      var headers = options.headers || {};
      headers.Authorization = 'Bearer ' + token.value;
      return global.fetch(url, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body
      }).then(function (response) {
        if (response.status === 401 || response.status === 403) {
          token = null;
          throw new Error(i18n.t('drive.denied'));
        }
        if (!response.ok) throw new Error(i18n.t('drive.failed'));
        return options.raw ? response.text() : response.json();
      });
    },

    find: function () {
      var query = encodeURIComponent("name='" + FILE_NAME + "' and trashed=false");
      return net.request(FILES + '?spaces=appDataFolder&fields=files(id,modifiedTime)&q=' + query)
        .then(function (data) {
          return (data.files && data.files[0]) || null;
        });
    },

    read: function (fileId) {
      return net.request(FILES + '/' + fileId + '?alt=media', { raw: true });
    },

    write: function (fileId, content) {
      if (fileId) {
        return net.request(UPLOAD + '/' + fileId + '?uploadType=media', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: content
        });
      }
      /* First write: create the file inside the app's private folder. */
      var boundary = 'packmeup' + Date.now();
      var metadata = { name: FILE_NAME, parents: ['appDataFolder'], mimeType: 'application/json' };
      var body = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) + '\r\n--' + boundary +
        '\r\nContent-Type: application/json\r\n\r\n' + content + '\r\n--' + boundary + '--';
      return net.request(UPLOAD + '?uploadType=multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + boundary },
        body: body
      });
    }
  };

  /* ----------------------------------------------------------------- sync */

  function ensureToken(interactive) {
    if (token && token.expiresAt > Date.now()) return Promise.resolve(token);
    if (!configured()) return Promise.reject(new Error(i18n.t('drive.noClientId')));
    return net.requestToken(interactive).then(function (fresh) {
      token = fresh;
      return token;
    });
  }

  /*
   * One round: take what the other device left, fold it in, and put the result
   * back. Returns what happened, for the message shown afterwards.
   */
  function sync(options) {
    options = options || {};
    if (syncing) return Promise.reject(new Error(i18n.t('drive.busy')));
    syncing = true;

    return ensureToken(!!options.interactive)
      .then(net.find)
      .then(function (file) {
        var fileId = file && file.id;
        var pull = fileId ? net.read(fileId) : Promise.resolve(null);
        return pull.then(function (remote) {
          var summary = { lists: 0, merged: 0, added: 0 };
          if (remote) {
            try {
              summary = store.importJSON(remote);
            } catch (err) {
              /* An unreadable file should not cost the local lists. */
              if (!options.force) throw new Error(i18n.t('drive.badFile'));
            }
          }
          return net.write(fileId, store.exportAll()).then(function () {
            store.setSetting('driveConnected', true);
            store.setSetting('driveLastSync', new Date().toISOString());
            return { pulled: !!remote, summary: summary };
          });
        });
      })
      .then(function (result) {
        syncing = false;
        return result;
      })
      .catch(function (err) {
        syncing = false;
        throw err;
      });
  }

  function connect() {
    return sync({ interactive: true });
  }

  function disconnect() {
    token = null;
    tokenClient = null;
    store.setSetting('driveConnected', false);
    store.setSetting('driveLastSync', null);
  }

  function setClientId(value) {
    var trimmed = String(value || '').trim();
    store.setSetting('driveClientId', trimmed);
    token = null;
    tokenClient = null;
    return trimmed;
  }

  global.PMU = global.PMU || {};
  global.PMU.drive = {
    sync: sync,
    connect: connect,
    disconnect: disconnect,
    setClientId: setClientId,
    clientId: clientId,
    configured: configured,
    connected: connected,
    lastSync: lastSync,
    scope: SCOPE,
    fileName: FILE_NAME,
    net: net                       /* swapped out in the tests */
  };
})(window);
