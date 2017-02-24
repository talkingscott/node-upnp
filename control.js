/**
 * UPnP Control.
 *
 * Based on:
 *
 * http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 * http://www.upnp.org/specs/av/UPnP-av-ContentDirectory-v1-Service.pdf
 */
'use strict';

const os = require('os');
const util = require('util');
const request = require('request');
const DOMParser = require('xmldom').DOMParser;
const parseObjectFromElement = require('./simplexml').parseObjectFromElement;
const parseObjectFromXml = require('./simplexml').parseObjectFromXml;

const PRODUCT = 'node-upnp';
const PRODUCT_VERSION = '1.0';

// TODO: public methods should use callback
class ContentDirectoryControl {
  constructor(uri) {
    this._uri = uri;
    this._userAgent = `${os.platform()}/${os.release()} UPnP/1.1 ${PRODUCT}/${PRODUCT_VERSION}`;
  }

  getSortCapabilities() {
    let params = [];
  
    this._soapCall('urn:schemas-upnp-org:service:ContentDirectory:1#GetSortCapabilities', 'GetSortCapabilities', 'urn:schemas-upnp-org:service:ContentDirectory:1', params, (err, response, doc) => {
      if (err) {
        console.error('Error in call: ' + err);
      } else if (response.statusCode != 200) {
        console.log('Response status code not 200: ' + response.statusCode);
        if (doc) {
          console.log(doc);
        }
      } else {
        console.log(doc);
      }
    });
  }
  
  browseObject(objectId) {
    let params = [
      {name: 'ObjectID', value: objectId},
      {name: 'BrowseFlag', value: 'BrowseDirectChildren'},
      {name: 'Filter', value: '*'},
      {name: 'StartingIndex', value: 0},
      {name: 'RequestedCount', value: 100},
      {name: 'SortCriteria', value: ''}
    ];
  
    this._soapCall('urn:schemas-upnp-org:service:ContentDirectory:1#Browse', 'Browse', 'urn:schemas-upnp-org:service:ContentDirectory:1', params, (err, response, soapResponse) => {
      if (err) {
        console.error('Error in call: ' + err);
      } else if (response.statusCode != 200) {
        console.log('Response status code not 200: ' + response.statusCode);
        if (soapResponse) {
          console.log(soapResponse);
        }
      } else {
        if (soapResponse.Result) {
          soapResponse.Result = parseObjectFromXml(soapResponse.Result);
        }
        console.log(util.inspect(soapResponse, {depth: 5}));
      }
    });
  }

  searchContainer(containerId) {
    let params = [
      {name: 'ContainerID', value: containerId},
      {name: 'SearchCriteria', value: '*'},
      {name: 'Filter', value: '*'},
      {name: 'StartingIndex', value: 0},
      {name: 'RequestedCount', value: 100},
      {name: 'SortCriteria', value: ''}
    ];
  
    this._soapCall('urn:schemas-upnp-org:service:ContentDirectory:1#Search', 'Search', 'urn:schemas-upnp-org:service:ContentDirectory:1', params, (err, response, soapResponse) => {
      if (err) {
        console.error('Error in call: ' + err);
      } else if (response.statusCode != 200) {
        console.log('Response status code not 200: ' + response.statusCode);
        if (soapResponse) {
          console.log(soapResponse);
        }
      } else {
        if (soapResponse.Result) {
          soapResponse.Result = parseObjectFromXml(soapResponse.Result);
        }
        console.log(util.inspect(soapResponse, {depth: 5}));
      }
    });
  }

  _soapCall(soapAction, methodName, methodNs, params, callback) {
    const paramsElements = params.map((param) => {
      return `<${param.name}>${param.value}</${param.name}>`;
    }).join('\n');
  
    const body = '<?xml version="1.0"?>\n' +
      '<s:Envelope\n' +
      'xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"\n' +
      's:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">\n' +
      '<s:Body>\n' +
      `<u:${methodName} xmlns:u=\"${methodNs}\">\n` +
      paramsElements +
      '</u:${methodName}>\n' +
      '</s:Body>\n' +
      '</s:Envelope>';
    
    const options = {
      uri: this._uri,
      method: 'POST',
      headers: {
        'USER-AGENT': this._userAgent,
        'SOAPACTION': soapAction,
        'CONTENT-TYPE': 'text/xml; charset=\"utf-8\"'
      },
      body: body
    };
    
    request(options, (err, response, body) => {
      if (err) {
        callback(err, response, body);
      } else if (body) {
        callback(err, response, this._parseBody(body, methodName, methodNs));
      } else {
        callback(err, response, body);
      }
    });
  }
  
  _parseBody(body, methodName, methodNs) {
    let doc = new DOMParser().parseFromString(body, 'text/xml');
    let bodies = doc.documentElement.getElementsByTagNameNS('http://schemas.xmlsoap.org/soap/envelope/', 'Body');
    if (bodies.length != 1) {
      return body;
    }
    let responses = bodies.item(0).getElementsByTagNameNS(methodNs, `${methodName}Response`);
    if (responses.length === 0) {
      let faults = bodies.item(0).getElementsByTagNameNS('http://schemas.xmlsoap.org/soap/envelope/', 'Fault');
      if (faults.length != 1) {
        return body;
      }
      return parseObjectFromElement(faults.item(0));
    }
    if (responses.length != 1) {
      return body;
    }
    
    return parseObjectFromElement(responses.item(0));
  }
}

//function browseRoot() {
//  const body = '<?xml version="1.0"?>\n' +
//    '<s:Envelope\n' +
//    'xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"\n' +
//    's:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">\n' +
//    '<s:Body>\n' +
//    '<u:Browse xmlns:u=\"urn:schemas-upnp-org:service:ContentDirectory:1\">\n' +
//    '<ObjectID>0</ObjectID>\n' +
//    '<BrowseFlag>BrowseDirectChildren</BrowseFlag>\n' +
//    '<Filter>*</Filter>\n' +
//    '<StartingIndex>0</StartingIndex>\n' +
//    '<RequestedCount>100</RequestedCount>\n'
//    '<SortCriteria></SortCriteria>\n' +
//    '</u:Browse>\n' +
//    '</s:Body>\n' +
//    '</s:Envelope>';
//  
//  const options = {
//    uri: 'http://192.168.1.137:9000/TMSContentDirectory/Control',
//    method: 'POST',
//    headers: {
//      'USER-AGENT': 'OS/version UPnP/1.1 product/version',
//      'SOAPACTION': 'urn:schemas-upnp-org:service:ContentDirectory:1#Browse',
//      'CONTENT-TYPE': 'text/xml; charset=\"utf-8\"'
//    },
//    body: body
//  };
//  
//  request(options, (err, response, body) => {
//    callback(err, response, body);
//  });
//}

module.exports.ContentDirectoryControl = ContentDirectoryControl;
