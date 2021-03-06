/**
 * UPnP Discovery (SSDP)
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */

'use strict';

const dgram = require('dgram');
const os = require('os');
const util = require('util');

const DISCOVERY_MULTICAST_ADDRESS = '239.255.255.250';
const DISCOVERY_PORT = 1900;

const PRODUCT = 'node-upnp';
const PRODUCT_VERSION = '1.0';

/**
 * A header in a discovery message.
 */
class DiscoveryMessageHeader {
  constructor(header, value) {
    this._header = header;
    this._value = value;
  }

  get header() {
    return this._header;
  }

  get value() {
    return this._value;
  }
}

/**
 * A message sent by a device for discovery.
 *
 * Our treatment of the message is intentionally permissive.  We
 * allow any status line and any headers, including duplicates.
 */
class DiscoveryMessage {
  /**
   * Constructor that initializes the instance.
   *
   * @param remoteAddress {Address} The address originating the message.
   * @param timestamp {Date} The instant at which the message was received.
   * @param statusLine {Array} The status line split into parts.
   * @param headers {Array} The headers.
   */
  constructor(remoteAddress, timestamp, statusLine, headers) {
    this._remoteAddress = remoteAddress;
    this._timestamp = timestamp;
    this._statusLine = statusLine;
    this._headers = headers;
  }

  get remoteAddress() {
    return this._remoteAddress;
  }

  get timestamp() {
    return this._timestamp;
  }

  get statusLine() {
    return this._statusLine;
  }

  get headers() {
    return this._headers;
  }

  get isNotify() {
    return this._statusLine[0] === 'NOTIFY';
  }

  get isSearchResponse() {
    return this._statusLine[0] === 'HTTP/1.1';
  }

  /**
   * Gets whether this message is expired.
   */
  get isExpired() {
    const cacheControl = this._getFirstHeaderNamed('CACHE-CONTROL');
    if (!cacheControl) {
      return false;
    }
    const idx = cacheControl.value.indexOf('max-age=');
    if (idx === -1) {
      return false;
    }
    const maxAge = parseInt(cacheControl.value.substring(idx + 'max-age='.length), 10);
    // console.log(`maxAge is ${maxAge} from ${util.inspect(cacheControl)}`);

    const date = this._getFirstHeaderNamed('DATE');
    let messageDate;
    if (!date) {
      messageDate = this.timestamp;
    } else {
      messageDate = new Date(date.value);
    }
    // console.log(`messageDate is ${messageDate} from ${util.inspect(date)}`);

    return (messageDate.getTime() + (maxAge * 1000)) < Date.now();
  }

  /**
   * Gets the LOCATION headers, if any.
   *
   * @returns {Array} The LOCATION headers.
   */
  get LOCATION() {
    return this._getHeadersNamed('LOCATION');
  }

  /**
   * Gets the first LOCATION header, if any.
   *
   * @returns {DiscoveryMessageHeader} The first LOCATION header.
   */
  get LOCATION0() {
    return this._getFirstHeaderNamed('LOCATION');
  }

  /**
   * Gets the NT headers, if any.
   *
   * @returns {Array} The NT headers.
   */
  get NT() {
    return this._getHeadersNamed('NT');
  }

  /**
   * Gets the first NT header, if any.
   *
   * @returns {DiscoveryMessageHeader} The NT header.
   */
  get NT0() {
    return this._getFirstHeaderNamed('NT');
  }

  /**
   * Gets the NTS headers, if any.
   *
   * @returns {Array} The NTS headers.
   */
  get NTS() {
    return this._getHeadersNamed('NTS');
  }

  /**
   * Gets the first NTS header, if any.
   *
   * @returns {DiscoveryMessageHeader} The NTS header.
   */
  get NTS0() {
    return this._getFirstHeaderNamed('NTS');
  }

  /**
   * Gets the ST headers, if any.
   *
   * @returns {Array} The ST headers.
   */
  get ST() {
    return this._getHeadersNamed('ST');
  }

  /**
   * Gets the first ST header, if any.
   *
   * @returns {DiscoveryMessageHeader} The ST header.
   */
  get ST0() {
    return this._getFirstHeaderNamed('ST');
  }

  /**
   * Gets the USN headers, if any.
   *
   * @returns {Array} The USN headers.
   */
  get USN() {
    return this._getHeadersNamed('USN');
  }

  /**
   * Gets the first USN header, if any.
   *
   * @returns {DiscoveryMessageHeader} The USN header.
   */
  get USN0() {
    return this._getFirstHeaderNamed('USN');
  }

  /**
   * Gets the first header by name, if any.
   *
   * @param name {String} The name.
   * @returns {DiscoveryMessageHeader} The header or undefined.
   * @private
   */
  _getFirstHeaderNamed(name) {
    return this.headers.find((header) => {
      return header.header.toUpperCase() === name.toUpperCase();
    });
  }

  /**
   * Gets headers by name, if any.
   *
   * @param name {String} The name.
   * @returns {Array} The headers.
   * @private
   */
  _getHeadersNamed(name) {
    return this.headers.filter((header) => {
      return header.header.toUpperCase() === name.toUpperCase();
    });
  }

  /**
   * Factory that parses a string that is the full discovery message,
   * both status line and headers.
   *
   * @param remoteAddress {Address} The address from which the message was received.
   * @param timestamp {Date} The instant at which the message was received.
   * @param msg {String} The message as a string.
   * @returns A new DiscoveryMessage.
   * @static
   */
  static parseString(remoteAddress, timestamp, msg) {
    let lines = msg.split('\r\n');
    if (lines.length === 1) {
      lines = msg.split('\r\n');
    }
    const statusLine = DiscoveryMessage._parseStatusLine(lines[0]);
    const headers = lines.slice(1).filter((line) => { return line.length > 0; })
        .map(DiscoveryMessage._parseHeaderLine);
    return new DiscoveryMessage(remoteAddress, timestamp, statusLine, headers);
  }

  /**
   * Parses a header with no validation.
   *
   * @param line {String} The header line.
   * @returns {DiscoveryMessageHeader} The header.
   * @static
   * @private
   */
  static _parseHeaderLine(line) {
    const idx = line.indexOf(':');
    if (idx >= 0) {
      return new DiscoveryMessageHeader(line.substr(0, idx), line.substr(idx + 1).trim());
    }
    return new DiscoveryMessageHeader(line, undefined);
  }

  /**
   * Parses a status line into parts with no validation.
   *
   * @param line {String} The status line.
   * @returns {Array} The parts.
   * @static
   * @private
   */
  static _parseStatusLine(line) {
    return line.split(/\s+/);
  }

}

/**
 * A store of discovery messages.
 *
 * A device sends three types of discovery message:
 *   Root device discovery messages
 *   Embedded device discovery messages
 *   Service discovery messages
 *
 * These are distinguished by the values of the NT and USN headers.
 *
 * N.B. In practice, the LOCATION header value is typically duplicated
 * across the service messages from a device.
 */
class DiscoveryMessageStore {
  /**
   * Creates an empty store.
   */
  constructor() {
    this._messages = [];
  }

  /**
   * Gets the messages.
   *
   * The returned array is the message store contents; no
   * defensive copy is made.  You control your own fate.
   *
   * @returns {Array} The messages.
   */
  get messages() {
    // Take the opportunity to filter out expired messages
    this._messages = this._messages.filter((message) => { return !message.isExpired; });
    return this._messages;
  }

  /**
   * Clears the message store.
   */
  clear() {
    this._messages = [];
  }

  /**
   * Updates the store with a message.
   *
   * @param discoveryMessage {DiscoveryMessage} The message.
   */
  update(discoveryMessage) {
    const usn0 = discoveryMessage.USN0;
    const location0 = discoveryMessage.LOCATION0;
    const nts0 = discoveryMessage.NTS0;

    if (!(usn0 && location0 && (discoveryMessage.isSearchResponse || nts0))) {
      console.log(`Discovery message missing required header: ${util.inspect(discoveryMessage)}`);
      return;
    }
    const existingIndex = this._messages.findIndex((message) => {
      return message.USN0.value === usn0.value;
    });
    if (existingIndex === -1) {
      if (discoveryMessage.isSearchRespone || nts0 !== 'ssdp:byebye') {
        this._messages.push(discoveryMessage);
      } else {
        // do nothing with a byebye if the USN is not in the store
      }
    } else {
      if (discoveryMessage.isSearchResponse || nts0 !== 'ssdp:byebye') {
        this._messages[existingIndex] = discoveryMessage;
      } else {
        this._messages.splice(existingIndex, 1);
      }
    }
  }

  /**
   * Finds messages in the store by the value of the ST header, which
   * specifies the service type for messages in response to a search.
   * Announcement messages do not have an ST header, so this is an
   * unreliable way to find something.
   *
   * @param ST {String} The value of the ST header.
   * @returns {Array} The messages in the store.
   */
  findByST(ST) {
    return this.messages.filter((discoveryMessage) => {
      return discoveryMessage.ST.some((st) => {
        return st.value === ST;
      });
    });
  }
}

/**
 * Manages discovery interaction with devices, maintaining
 * a store of discovery messages.
 *
 * TODO: re-factor this into a base service that emits
 * an event for each message received and a service on
 * top of that which maintains the store of discovery messages.
 */
class DiscoveryService {
  /**
   * Creates the service.  The service does nothing until it
   * is started.
   *
   * @param enableLog {boolean} Whether to enable console logging.
   */
  constructor(enableLog) {
    this._enableLog = enableLog;
    this._messageStore = new DiscoveryMessageStore();
    this._socket = null;
  }

  /**
   * Gets the message store maintained by this server.
   *
   * Note that this retrieves the actual message store,
   * not a clone.  Client code can call methods on the
   * store that make its contents invalid or incomplete.
   *
   * @returns {DiscoveryMessageStore} The message store.
   */
  get messageStore() {
    return this._messageStore;
  }

  /**
   * Gets the locations from all discovery messages.
   *
   * @returns {Set} The locations from all discovery messages.
   */
  getLocations() {
    const locations = new Set();
    this.messageStore.messages.forEach((message) => {
      message.LOCATION.forEach((header) => {
        locations.add(header.value);
      });
    });
    return locations;
  }

  /**
   * Sends a discovery search message.
   *
   * @param searchTarget {String} The thing(s) to search for, ssdp:all for all.
   * @param callback {Function} Called when send is complete.
   */
  startSearch(searchTarget, callback) {
    if (this._socket === null) {
      throw new Error('Server not started');
    }
    this._messageStore.clear();
    const searchRequest = 'M-SEARCH * HTTP/1.1\r\n' +
      `HOST: ${DISCOVERY_MULTICAST_ADDRESS}:${DISCOVERY_PORT}\r\n` +
      'MAN: "ssdp:discover"\r\n' +
      'MX: 2\r\n' +
      `ST: ${searchTarget}\r\n` +
      `USER-AGENT: ${os.platform()}/${os.release()} UPnP/1.1 ${PRODUCT}/${PRODUCT_VERSION}\r\n` +
      '\r\n';
    // console.log(`sending search:\n${searchRequest}`);
    this._socket.send(searchRequest, 0, searchRequest.length, DISCOVERY_PORT,
        DISCOVERY_MULTICAST_ADDRESS, (err) => {
          callback(err);
        });
  }

  /**
   * Starts the discovery service.  This should only be called once.
   *
   * @param callback {Function} Called when the server starts listening.
   */
  startService(callback) {
    // TODO: listen on two sockets.  One is bound to only the multicast
    // address, added to the mutlicast group and only accepts NOTIFY
    // messages.  The other is bound to all interfaces and only accepts
    // HTTP/1.1 response messages.
    if (this._socket !== null) {
      throw new Error('Server already started');
    }

    this._socket = dgram.createSocket('udp4');

    this._socket.on('error', (err) => {
      // console.log(`discovery server error:\n${err.stack}`);
      callback(err, null);
      this._socket.close();
    });

    this._socket.on('listening', () => {
      const address = this._socket.address();
      // console.log(`discovery server listening ${address.address}:${address.port}`);
      this._socket.addMembership(DISCOVERY_MULTICAST_ADDRESS);
      callback(null, address);
    });

    this._socket.on('message', (msg, remoteAddress) => {
      const ts = new Date();
      if (this._enableLog) {
        console.log(`message from ${remoteAddress.address}:${remoteAddress.port} at ${ts}`);
      }
      // console.log(msg);
      // console.log(util.inspect(msg));
      const discoveryMessage = DiscoveryMessage.parseString(remoteAddress, ts, msg.toString('UTF-8'));
      if (this._enableLog) {
        console.log(discoveryMessage);
      }
      if (discoveryMessage.isSearchResponse || discoveryMessage.isNotify) {
        this._messageStore.update(discoveryMessage);
      }
    });

    this._socket.bind(1900);
  }
}

module.exports.DiscoveryService = DiscoveryService;
