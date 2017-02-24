/**
 * UPnP Control Test
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */
'use strict';

const os = require('os');
const url = require('url');
const util = require('util');
const request = require('request');
const DiscoveryService = require('./discovery').DiscoveryService;
const findServices = require('./description').findServices;
const ContentDirectoryControl = require('./control').ContentDirectoryControl;
const parseObjectFromXml = require('./simplexml').parseObjectFromXml;

const PRODUCT = 'node-upnp';
const PRODUCT_VERSION = '1.0';

function getSCPD(uri, callback) {
  const options = {
    uri: uri,
    method: 'GET',
    headers: {
      'user-agent': `${os.platform()}/${os.release()} UPnP/1.1 ${PRODUCT}/${PRODUCT_VERSION}`
    }
  };
  
  request(options, (err, response, body) => {
    callback(err, response, body);
  });
}

const discoveryService = new DiscoveryService();

function getContentDirectoryService(discoveryService, friendlyName, callback) {
  discoveryService.startService((err, address) => {
    if (err) {
      console.log(`discovery service error:\n${err.stack}`);
    } else {
      console.log(`discovery service listening ${address.address}:${address.port}`);
      console.log('start search in 5 seconds');
      setTimeout(discoveryService.startSearch.bind(discoveryService), 5000, (err) => {
        if (err) {
          console.log(`search error:\n${err.stack}`);
        } else {
          console.log('search sent');
          console.log('print results in 5 seconds');
          setTimeout(() => {
            console.log('content of discovery message store');
            console.log(util.inspect(discoveryService.messageStore, {depth: 5}));
            findServices(discoveryService, 'urn:schemas-upnp-org:device:MediaServer:1', 'urn:schemas-upnp-org:service:ContentDirectory:1', (errors, services) => {
              let err = null;
              errors.forEach((error) => {
                console.log(util.inspect(error, {depth:8}));
                err = error;
              });
              let contentDirectoryService = null;
              services.forEach((service) => {
                if (service.friendlyName == friendlyName) {
                  contentDirectoryService = service;
                  err = null;
                }
                console.log(util.inspect(service, {depth:8}));
              });
              callback(err, contentDirectoryService);
            });
          }, 5000);
        }
      });
    }
  });
}

getContentDirectoryService(discoveryService, 'MyCloudEX2Ultra', (err, service) => {
  if (err) {
    console.log(util.inspect(err, {depth:8}));
  } else {
    let uri = url.resolve(service.location, service.service.SCPDURL);
    getSCPD(uri, (err, response, body) => {
      if (err) {
        console.log(util.inspect(err, {depth:8}));
      } else if (response.statusCode != 200) {
        console.log(util.inspect(`statusCode: ${response.statusCode} body: ${body}`));
      } else {
        console.log(util.inspect(parseObjectFromXml(body), {depth:8}));

        let uri = url.resolve(service.location, service.service.controlURL);
        let control = new ContentDirectoryControl(uri);
        // TODO: these should be callback
        control.browseObject('0');
        control.browseObject('music');
        control.browseObject('music/artistAlbum');
        control.searchContainer('0$1$16$4536');
      }
    });
  }
});
