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
const findDeviceServices = require('./description').findDeviceServices;
const ContentDirectoryControl = require('./control').ContentDirectoryControl;
const parseObjectFromXml = require('./simplexml').parseObjectFromXml;

const PRODUCT = 'node-upnp';
const PRODUCT_VERSION = '1.0';

/**
 * Inspect an object using our default depth
 *
 * @param {Object} o
 */
function inspect(o) {
  return util.inspect(o, { depth: 8 });
}

/**
 * Get the service control protocol description (SCPD).
 */
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

/**
 * Gets a media server content directory service for a device friendly name.
 *
 * Note that this starts the discovery service and sends a search.
 *
 * @param {Object} discoveryService The discovery service (not yet started).
 * @param {String} friendlyDeviceName The friendly name of the device.
 * @param {Function} callback The callback that receives the result.
 */
function getContentDirectoryService(discoveryService, friendlyDeviceName, callback) {
  discoveryService.startService((err, address) => {
    if (err) {
      console.log(`discovery service error:\n${err.stack}`);
    } else {
      console.log(`discovery service listening ${address.address}:${address.port}`);
      console.log('start search in 5 seconds');
      setTimeout(discoveryService.startSearch.bind(discoveryService), 5000, 'ssdp:all', (err2) => {
        if (err2) {
          console.log(`search error:\n${err2.stack}`);
        } else {
          console.log('search sent');
          console.log('print results in 5 seconds');
          setTimeout(() => {
            console.log('content of discovery message store');
            console.log(inspect(discoveryService.messageStore));
            findDeviceServices(discoveryService, 'urn:schemas-upnp-org:device:MediaServer:1',
                'urn:schemas-upnp-org:service:ContentDirectory:1', (errors, services) => {
                  let errorForCallback = null;
                  errors.forEach((error) => {
                    console.log(inspect(error));
                    errorForCallback = error;
                  });
                  let contentDirectoryService = null;
                  services.forEach((service) => {
                    if (service.friendlyName === friendlyDeviceName) {
                      contentDirectoryService = service;
                      errorForCallback = null;
                    }
                    console.log(inspect(service));
                  });
                  callback(errorForCallback, contentDirectoryService);
                });
          }, 5000);
        }
      });
    }
  });
}

const discoveryService = new DiscoveryService();

getContentDirectoryService(discoveryService, 'MyCloudEX2Ultra', (err, service) => {
  if (err) {
    console.log(inspect(err));
  } else if (service) {
    const uri = url.resolve(service.location, service.service.SCPDURL);
    getSCPD(uri, (err2, response, body) => {
      if (err2) {
        console.log(inspect(err2));
      } else if (response.statusCode !== 200) {
        console.log(inspect(`statusCode: ${response.statusCode} body: ${body}`));
      } else {
        // I should use the SCPD (service control point description?) to
        // determine which optional features are available, but that
        // probably won't happen since I mainly want to be able to pull
        // metadata and audio from a particular device I own.
        console.log(inspect(parseObjectFromXml(body)));

        // TODO: per p.67 of the device arch spec, controlURL can be fully qualified
        // Use URLBase of device description, (if present, although the 1.1 spec
        // deprecates its use), before using
        // the device description URL as the base
        const uri2 = url.resolve(service.location, service.service.controlURL);
        const control = new ContentDirectoryControl(uri2);
        // TODO: these should be callback
        control.browseObject('0');
        control.browseObject('music');
        control.browseObject('music/artistAlbum');
        control.searchContainer('0$1$16$4536');
      }
    });
  } else {
    console.log('Service does not exist for a device named MyCloudEX2Ultra');
  }
});
