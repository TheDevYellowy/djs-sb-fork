'use strict';

/**
 * Represents an error from the Discord API.
 * @extends Error
 */
class DiscordAPIError extends Error {
  constructor(error, status, request) {
    super();
    const flattened = this.constructor.flattenErrors(error.errors ?? error).join('\n');
    this.name = 'DiscordAPIError';
    this.message = error.message && flattened ? `${error.message}\n${flattened}` : error.message ?? flattened;

    /**
     * The HTTP method used for the request
     * @type {string}
     */
    this.method = request.method;

    /**
     * The path of the request relative to the HTTP endpoint
     * @type {string}
     */
    this.path = request.path;

    /**
     * HTTP error code returned by Discord
     * @type {number}
     */
    this.code = error.code;

    /**
     * The HTTP status code
     * @type {number}
     */
    this.httpStatus = status;

    /**
     * The data associated with the request that caused this error
     * @type {HTTPErrorData}
     */
    this.requestData = {
      json: request.options.data,
      files: request.options.files ?? [],
      headers: request.options.headers,
    };

    /**
     * The number of times this request has been retried
     * @type {number}
     */
    this.retries = request.retries;

    /**
     * @typedef {Object} Captcha
     * @property {Array<string>} captcha_key ['message']
     * @property {string} captcha_sitekey Captcha sitekey (hcaptcha)
     * @property {string} captcha_service hcaptcha
     * @property {string} [captcha_rqdata]
     * @property {string} [captcha_rqtoken]
     */

    /**
     * Captcha response data if the request requires a captcha
     * @type {Captcha | null}
     */
    this.captcha = error?.captcha_service ? error : null;
  }

  /**
   * A special `40333` JSON error code is returned if your request is blocked by Cloudflare.
   * This may be due to a malformed request or improper user agent.
   * The response resembles a normal error structure:
   * @type {boolean}
   * @example
   * {
   *  "message": "internal network error",
   *  "code": 40333
   * }
   */
  get isBlockedByCloudflare() {
    return this.code === 40333;
  }

  /**
   * Flattens an errors object returned from the API into an array.
   * @param {APIError} obj Discord errors object
   * @param {string} [key] Used internally to determine key names of nested fields
   * @returns {string[]}
   * @private
   */
  static flattenErrors(obj, key = '') {
    let messages = [];

    for (const [k, v] of Object.entries(obj)) {
      if (k === 'message') continue;
      const newKey = key ? (isNaN(k) ? `${key}.${k}` : `${key}[${k}]`) : k;

      if (v._errors) {
        messages.push(`${newKey}: ${v._errors.map(e => e.message).join(' ')}`);
      } else if (v.code ?? v.message) {
        messages.push(`${v.code ? `${v.code}: ` : ''}${v.message}`.trim());
      } else if (typeof v === 'string') {
        messages.push(v);
      } else {
        messages = messages.concat(this.flattenErrors(v, newKey));
      }
    }

    return messages;
  }
}

module.exports = DiscordAPIError;

/**
 * @external APIError
 * @see {@link https://discord.com/developers/docs/reference#error-messages}
 */
