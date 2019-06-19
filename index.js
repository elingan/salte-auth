require('url-polyfill');
require('@babel/polyfill');
require('@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js');
require('@webcomponents/webcomponentsjs');
const moment = require('moment');
const { LitElement, html: litHtml } = require('lit-element');
const { PolymerElement, html: polymerHtml } = require('@polymer/polymer');
const { SalteAuth } = require('./src/salte-auth.js');

const elements = {
  provider: document.getElementById('provider'),
  loginType: document.getElementById('login-type'),
  responseType: document.getElementById('response-type'),
  redirectUrl: document.getElementById('redirect-url'),
  storageType: document.getElementById('storage-type'),
  secured: document.getElementById('secured'),
  footer: document.getElementById('footer'),
  userInfo: document.getElementById('user-info'),
  expiration: document.getElementById('expiration'),
  login: document.getElementById('login'),
  logout: document.getElementById('logout'),
  navigate: document.getElementById('navigate')
};

const configs = {
  wso2: {
    providerUrl: 'https://sandbox.catenon.com:9444',
    clientId: 'J7sz2joPJm7Hpo48PVnj0jOxFAoa'
  },

  auth0: {
    providerUrl: 'https://salte-os.auth0.com',
    clientId: '9JTBXBREtckkFHTxTNBceewrnn7NeDd0'
  },

  azure: {
    providerUrl: 'https://login.microsoftonline.com/3f6df7ce-5830-4280-ae97-8e4016d1c6d0',
    clientId: 'c679f65f-8070-4719-8798-31c6fc256736',

    queryParams: {
      resource: 'https://graph.windows.net/'
    }
  },

  cognito: {
    providerUrl: 'https://salte-auth-demo.auth.us-east-1.amazoncognito.com',
    clientId: '51jmkg1t5h3ob58a1birdke2hm'
  },

  okta: {
    providerUrl: 'https://dev-960892.oktapreview.com',
    clientId: '0oajg1bj8hxM1z7pa0h7'
  }
};

const url = new URL(location.href);

const queryParams = Object.assign({
  'provider': localStorage.getItem('salte.demo.provider') || 'wso2',
  'login-type': 'iframe',
  'response-type': localStorage.getItem('salte.demo.response-type') || 'token',
  'redirect-url': 'single',
  'storage-type': localStorage.getItem('salte.demo.storage-type') || 'local',
  'secured': localStorage.getItem('salte.demo.secured') || 'not-secured'
}, Array.from(url.searchParams.keys()).reduce((output, key) => {
  const value = url.searchParams.get(key);
  if (value === 'false') {
    output[key] = false;
  } else if (value === 'true') {
    output[key] = true;
  } else {
    output[key] = value;
  }

  return output;
}, {}));

elements.provider.value = queryParams.provider;
elements.loginType.value = queryParams['login-type'];
elements.responseType.value = queryParams['response-type'];
elements.redirectUrl.value = queryParams['redirect-url'];
elements.storageType.value = queryParams['storage-type'];
elements.secured.value = queryParams.secured;

function updateParamsOnChange() {
  const url = new URL(location.href);
  const value = this.type === 'checkbox' ? this.checked : this.value;
  if ([undefined, null].includes(value)) {
    url.searchParams.delete(this.name);
  } else {
    url.searchParams.set(this.name, value);
  }
  location = url.toString();
}

function refreshUserInfo(error) {
  console.log('refreshUserInfo...');
  if (error) {
    console.error(error);
  }

  const userInfo = auth.profile.userInfo;
  if (userInfo) {
    elements.footer.style.display = '';
    elements.userInfo.innerText = JSON.stringify(userInfo, null, 2);

    if (window.expirationRefresh) {
      clearInterval(window.expirationRefresh);
    }

    window.expirationRefresh = setInterval(window.requestAnimationFrame(() => {
      elements.expiration.innerText = 'Expiration Time: ' + moment.duration(salte.auth.profile.userInfo.exp * 1000 - Date.now()).humanize();
    }), 1000);
  } else {
    elements.footer.style.display = 'none';
  }
}

elements.provider.addEventListener('change', updateParamsOnChange);
elements.loginType.addEventListener('change', updateParamsOnChange);
elements.responseType.addEventListener('change', updateParamsOnChange);
elements.redirectUrl.addEventListener('change', updateParamsOnChange);
elements.storageType.addEventListener('change', updateParamsOnChange);
elements.secured.addEventListener('change', updateParamsOnChange);

let config = Object.assign(configs[queryParams.provider], {
  redirectUrl: queryParams['redirect-url'] === 'single' ? location.protocol + '//' + location.host : {
    loginUrl: location.protocol + '//' + location.host,
    logoutUrl: location.protocol + '//' + location.host
  },

  scope: 'SANDBOX',

  provider: queryParams.provider,

  responseType: queryParams['response-type'],

  loginType: 'iframe',

  storageType: queryParams['storage-type'],

  validation: {
    nonce: false,
    aud: false,
    azp: false,
    state: false
  },

  autoRefresh: false
});

if (['all', 'all-routes'].includes(queryParams.secured)) {
  config = Object.assign(config, {
    routes: true
  });
}

if (['all', 'all-endpoints'].includes(queryParams.secured)) {
  config = Object.assign(config, {
    endpoints: ['https://jsonplaceholder.typicode.com']
  });
}

if (queryParams.provider !== localStorage.getItem('salte.demo.provider')) {
  localStorage.clear();
  localStorage.setItem('salte.demo.provider', queryParams.provider);
}

if (queryParams['response-type'] !== localStorage.getItem('salte.demo.response-type')) {
  localStorage.setItem('salte.demo.response-type', queryParams['response-type']);
}

if (queryParams['storage-type'] !== localStorage.getItem('salte.demo.storage-type')) {
  localStorage.setItem('salte.demo.storage-type', queryParams['storage-type']);
}

if (queryParams['secured'] !== localStorage.getItem('salte.demo.secured')) {
  localStorage.setItem('salte.demo.secured', queryParams['secured']);
}

const auth = new SalteAuth(config);

//if (!auth.profile.idTokenExpired) refreshUserInfo();
if (!auth.profile.accessTokenExpired) {
  refreshUserInfo();
}
auth.on('login', _ => {
  console.log('login event');
  refreshUserInfo();
});

auth.on('refresh', _ => {
  console.log('refresh event');
  refreshUserInfo();
});

auth.on('logout', _ => {
  console.log('logout event');
  refreshUserInfo();
});


auth.on('expired', _ => {
  console.log('expired event');
  refreshUserInfo();
});

auth.retrieveAccessToken()
  .then(results => {
    console.log('retrieve token', results);
  })
  .catch(error => {
    console.log('retrieve token error', error);
  });

console.log(auth.profile.$accessToken);
console.log(auth.profile.$expiration);
console.log(auth.profile.$state);
console.log(auth.profile.accessTokenExpired);
console.log(auth.profile.userInfo);




elements.login.addEventListener('click', () => {
  switch (queryParams['login-type']) {
    case 'redirect':
      return auth.loginWithRedirect();
    case 'popup':
      return auth.loginWithPopup();
    case 'tab':
      return auth.loginWithNewTab();
    case 'iframe':
      return auth.loginWithIframe();
  }
});

elements.logout.addEventListener('click', () => {
  switch (queryParams['login-type']) {
    case 'redirect':
      return auth.logoutWithRedirect();
    case 'popup':
      return auth.logoutWithPopup();
    case 'tab':
      return auth.logoutWithNewTab();
    case 'iframe':
      return auth.logoutWithIframe();
  }
});

elements.navigate.addEventListener('click', () => {
  const url = new URL(location.href);
  if (location.pathname === '/') {
    url.pathname = '/account';
  } else {
    url.pathname = '/';
  }
  history.pushState({}, '', url.toString());
});

// /api-user-service/v2/me


// fetch('https://jsonplaceholder.typicode.com/posts/1').then((response) => {
//   return response.json();
// }).then((data) => {
//   console.log(data);
// }).catch((error) => {
//   console.error(error);
// });

// const request = new XMLHttpRequest();
// request.addEventListener('error', (event) => {
//   console.error(event.detail);
// });
// request.addEventListener('load', function (event) {
//   console.log(JSON.parse(this.responseText));
// });
// request.open('GET', 'https://jsonplaceholder.typicode.com/posts/2');
// request.send();

class NativeElement extends auth.mixin(HTMLElement) {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
      </style>
      <h1>Native</h1>
      <div>User: ${this.user && this.user.sub}</div>
      <div>Authenticated: ${this.authenticated}</div>
    `;
  }
}

customElements.define('native-element', NativeElement);

class MyLitElement extends auth.mixin(LitElement) {
  render() {
    return litHtml`
      <style>
        :host {
          display: block;
        }
      </style>
      <h1>Lit</h1>
      <div>User: ${this.user && this.user.sub}</div>
      <div>Authenticated: ${this.authenticated}</div>
    `;
  }
}

customElements.define('my-lit-element', MyLitElement);

class MyPolymerElement extends auth.mixin(PolymerElement) {
  static get template() {
    return polymerHtml`
      <style>
        :host {
          display: block;
        }
      </style>
      <h1>Polymer</h1>
      <div>User: [[user.sub]]</div>
      <div>Authenticated: [[authenticated]]</div>
    `;
  }
}

customElements.define('my-polymer-element', MyPolymerElement);
