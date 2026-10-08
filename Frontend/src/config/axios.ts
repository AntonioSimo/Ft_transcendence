import axios from 'axios';

// Intercetta XMLHttpRequest per silenziare i log HTTP nella console
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function (method: string, url: string | URL, ...rest: any[]) {
	this._url = url.toString();
	this._method = method;
	return originalOpen.apply(this, [method, url, ...rest] as any);
};

XMLHttpRequest.prototype.send = function (...args: any[]) {
	// Disabilita il logging automatico del browser per le richieste HTTP
	const originalOnError = this.onerror;
	const originalOnLoad = this.onload;

	this.addEventListener(
		'error',
		function () {
			// Previeni il log dell'errore
		},
		{ once: true }
	);

	this.addEventListener(
		'loadend',
		function () {
			// Previeni il log degli errori HTTP (4xx, 5xx)
		},
		{ once: true }
	);

	return originalSend.apply(this, args);
};

// Interceptor axios per gestire errori silenziosamente
axios.interceptors.response.use(
	(response) => response,
	(error) => {
		// Gestisci l'errore silenziosamente
		return Promise.reject(error);
	}
);

export default axios;
