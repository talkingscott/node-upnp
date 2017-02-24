/**
 * UPnP Discovery (SSDP)
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */
'use strict';

const dgram = require('dgram');
const os = require('os');

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
    this.remoteAddress = remoteAddress;
    this.timestamp = timestamp;
    this.statusLine = statusLine;
    this.headers = headers;
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
   * Gets the ST headers, if any.
   *
   * @returns {Array} The ST headers.
   */
  get ST() {
    return this._getHeadersNamed('ST');
  }

  /**
   * Gets headers by name, if any.
   *
   * @returns {Array} The headers.
   * @private
   */
  _getHeadersNamed(name) {
    return this.headers.filter((header) => {
      return header.header.toUpperCase() == name.toUpperCase();
    });
  }

  /**
   * Factory that parses a string.
   *
   * @param remoteAddress {Address} The address from which the message was received.
   * @param timestamp {Date} The instant at which the message was received.
   * @param msg {String} The message as a string.
   * @returns A new DiscoveryMessage.
   * @static
   */
  static parseString(remoteAddress, timestamp, msg) {
    let lines = msg.split('\r\n');
    if (lines.length == 1) {
      lines = msg.split('\r\n');
    }
    let statusLine = DiscoveryMessage._parseStatusLine(lines[0]);
    let headers = lines.slice(1).map(DiscoveryMessage._parseHeaderLine);
    return new DiscoveryMessage(remoteAddress, timestamp, statusLine, headers);
  }

  /**
   * Parses a header line.
   *
   * @param line {String} The header line.
   * @returns {DiscoveryMessageHeader} The header.
   * @static
   */
  static _parseHeaderLine(line) {
    let idx = line.indexOf(':');
    if (idx >= 0) {
      return new DiscoveryMessageHeader(line.substr(0, idx), line.substr(idx+1).trim());
    }
    return new DiscoveryMessageHeader(line, undefined);
  }

  /**
   * Parses a status line into parts.
   *
   * @param line {String} The status line.
   * @returns {Array} The parts.
   * @static
   */
  static _parseStatusLine(line) {
    return line.split(/\s+/);
  }

}

/**
 * A store of discovery messages.
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
   * @returns {Array} The messages.
   */
  get messages() {
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
   * TODO: rather than always adding, update an existing
   * message for the service if it is already in the store.
   *
   * @param discoveryMessage {DiscoveryMessage} The message.
   */
  update(discoveryMessage) {
    this._messages.push(discoveryMessage);
  }

  /**
   * Finds messages in the store by the value of the ST header.
   *
   * @param ST {String} The value of the ST header.
   * @returns {Array} The messages in the store.
   */
  findByST(ST) {
    return this._messages.filter((discoveryMessage) => {
      return discoveryMessage.ST.some((st) => {
        return st.value == ST;
      });
    });
  }
}

/**
 * Manages discovery interaction with devices, maintaining
 * a store of discovery messages.
 */
class DiscoveryService {
  constructor() {
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
    let locations = new Set();
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
   * @param callback {Function} Called when send is complete.
   */
  startSearch(callback) {
    if (this._socket === null) {
      throw new Error('Server not started');
    }
    this._messageStore.clear();
    let searchRequest = 'M-SEARCH * HTTP/1.1\r\n' +
      `HOST: ${DISCOVERY_MULTICAST_ADDRESS}:${DISCOVERY_PORT}\r\n` +
      'MAN: \"ssdp:discover\"\r\n' +
      'MX: 2\r\n' +
      'ST: ssdp:all\r\n' +
      `USER-AGENT: ${os.platform()}/${os.release()} UPnP/1.1 ${PRODUCT}/${PRODUCT_VERSION}\r\n` +
      '\r\n';
    //console.log(`sending search:\n${searchRequest}`);
    this._socket.send(searchRequest, 0, searchRequest.length, DISCOVERY_PORT, DISCOVERY_MULTICAST_ADDRESS, (err) => {
      callback(err);
    });
  }

  /**
   * Starts the discovery service.
   *
   * @param callback {Function} Called when the server starts listening.
   */
  startService(callback) {
    if (this._socket !== null) {
      throw new Error('Server already started');
    }

    this._socket = dgram.createSocket('udp4');
    
    this._socket.on('error', (err) => {
      //console.log(`discovery server error:\n${err.stack}`);
      callback(err, null);
      this._socket.close();
    });
    
    this._socket.on('listening', () => {
      let address = this._socket.address();
      //console.log(`discovery server listening ${address.address}:${address.port}`);
      callback(null, address);
    });

    this._socket.on('message', (msg, remoteAddress) => {
      let ts = new Date();
      console.log(`message from ${remoteAddress.address}:${remoteAddress.port} at ${ts}`);
      //console.log(msg);
      //console.log(util.inspect(msg));
      let discoveryMessage = DiscoveryMessage.parseString(remoteAddress, ts, msg.toString('UTF-8'));
      //console.log(discoveryMessage);
      this._messageStore.update(discoveryMessage);
    });
    
    this._socket.bind(1900/*, '239.255.255.250'*/);
  }
}

module.exports.DiscoveryService = DiscoveryService;
