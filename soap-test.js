'use strict';

const util = require('util');
const request = require('request');
const DOMParser = require('xmldom').DOMParser;

function getSortCapabilities() {
  const body = '<?xml version="1.0"?>\n' +
    '<s:Envelope\n' +
    'xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"\n' +
    's:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\">\n' +
    '<s:Body>\n' +
    '<u:GetSortCapabilities xmlns:u=\"urn:schemas-upnp-org:service:ContentDirectory:1\">\n' +
    '</u:GetSortCapabilities>\n' +
    '</s:Body>\n' +
    '</s:Envelope>';
  
  const options = {
    uri: 'http://192.168.1.137:9000/TMSContentDirectory/Control',
    method: 'POST',
    headers: {
      'USER-AGENT': 'OS/version UPnP/1.1 product/version',
      'SOAPACTION': 'urn:schemas-upnp-org:service:ContentDirectory:1#GetSortCapabilities',
      'CONTENT-TYPE': 'text/xml; charset=\"utf-8\"'
    },
    body: body
  };
  
  request(options, (err, response, body) => {
    if (err) {
      console.error('Error in call: ' + err);
    } else if (response.statusCode != 200) {
      console.log('Response status code not 200: ' + response.statusCode);
      if (body) {
        console.log(body);
      }
    } else {
      console.log(body);
    }
  });
}

function browseObject(objectId) {
  let params = [
    {name: 'ObjectID', value: objectId},
    {name: 'BrowseFlag', value: 'BrowseDirectChildren'},
    {name: 'Filter', value: '*'},
    {name: 'StartingIndex', value: 0},
    {name: 'RequestedCount', value: 100},
    {name: 'SortCriteria', value: ''}
  ];

  soapCall('http://192.168.1.137:9000/TMSContentDirectory/Control', 'OS/version UPnP/1.1 product/version', 'urn:schemas-upnp-org:service:ContentDirectory:1#Browse', 'Browse', 'urn:schemas-upnp-org:service:ContentDirectory:1', params, (err, response, doc) => {
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

function searchContainer(containerId) {
  let params = [
    {name: 'ContainerID', value: containerId},
    {name: 'SearchCriteria', value: '*'},
    {name: 'Filter', value: '*'},
    {name: 'StartingIndex', value: 0},
    {name: 'RequestedCount', value: 100},
    {name: 'SortCriteria', value: ''}
  ];

  soapCall('http://192.168.1.137:9000/TMSContentDirectory/Control', 'OS/version UPnP/1.1 product/version', 'urn:schemas-upnp-org:service:ContentDirectory:1#Search', 'Search', 'urn:schemas-upnp-org:service:ContentDirectory:1', params, (err, response, soapResponse) => {
    if (err) {
      console.error('Error in call: ' + err);
    } else if (response.statusCode != 200) {
      console.log('Response status code not 200: ' + response.statusCode);
      if (soapResponse) {
        console.log(soapResponse);
      }
    } else {
      if (soapResponse.Result) {
        soapResponse.Result = parseXmlObject(soapResponse.Result);
      }
      console.log(util.inspect(soapResponse, {depth: 5}));
    }
  });
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

function soapCall(uri, userAgent, soapAction, methodName, methodNs, params, callback) {
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
    uri: uri,
    method: 'POST',
    headers: {
      'USER-AGENT': userAgent,
      'SOAPACTION': soapAction,
      'CONTENT-TYPE': 'text/xml; charset=\"utf-8\"'
    },
    body: body
  };
  
  request(options, (err, response, body) => {
    if (err) {
      callback(err, response, body);
    } else if (body) {
      callback(err, response, parseBody(body, methodName, methodNs));
    } else {
      callback(err, response, body);
    }
  });
}

function parseBody(body, methodName, methodNs) {
  let doc = new DOMParser().parseFromString(body, 'text/xml');
  let bodies = doc.documentElement.getElementsByTagNameNS('http://schemas.xmlsoap.org/soap/envelope/', 'Body');
  if (bodies.length != 1) {
    return body;
  }
  let responses = bodies.item(0).getElementsByTagNameNS(methodNs, `${methodName}Response`);
  if (responses.length == 0) {
    let faults = bodies.item(0).getElementsByTagNameNS('http://schemas.xmlsoap.org/soap/envelope/', 'Fault');
    if (faults.length != 1) {
      return body;
    }
    return parseObject(faults.item(0));
  }
  if (responses.length != 1) {
    return body;
  }
  
  return parseObject(responses.item(0));
}

function parseXmlObject(xml) {
  let doc = new DOMParser().parseFromString(xml, 'text/xml');
  console.log(util.inspect(doc.documentElement, {depth:6}));
  return parseObject(doc.documentElement);
}

function parseObject(element) {
  let children = element.childNodes;
  let elementCount = 0;
  let obj = {};
  let txt = '';
  for (var c = 0; c < children.length; c++) {
    let child = children.item(c);
    if (child.localName) {
      elementCount += 1;
      // TODO: either prefix or namespaceURI to disambiguate
      if (obj[child.localName]) {
        if (!Array.isArray(obj[child.localName])) {
          obj[child.localName] = [obj[child.localName]];
        }
        obj[child.localName].push(parseObject(child));
      } else {
        obj[child.localName] = parseObject(child);
      }
    } else if (child.data) {
      txt += child.data.trim();
    }
  }
  if (elementCount || element.attributes.length) {
    if (txt) {
      obj['$'] = txt;
    }
    for (var a = 0; a < element.attributes.length; a++) {
      // TODO: name has prefix
      obj[`@${element.attributes.item(a).name}`] = element.attributes.item(a).value;
    }
    return obj;
  }
  return txt;
}

browseObject('0');
browseObject('music');
browseObject('music/artistAlbum');
searchContainer('0$1$16$4536');
