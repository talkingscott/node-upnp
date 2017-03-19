/**
 * UPnP Description Test
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */

'use strict';

const util = require('util');
const DiscoveryService = require('./discovery').DiscoveryService;
const findDeviceServices = require('./description').findDeviceServices;

/**
 * Inspect an object using our default depth
 *
 * @param {Object} o
 */
function inspect(o) {
  return util.inspect(o, { depth: 8 });
}

const discoveryService = new DiscoveryService();
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
                console.log(`Found ${services.length} service(s)`);
                errors.forEach((error) => {
                  console.log(inspect(error));
                });
                services.forEach((service) => {
                  console.log(inspect(service));
                });
              });
        }, 5000);
      }
    });
  }
});
