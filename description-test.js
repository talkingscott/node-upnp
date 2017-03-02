/**
 * UPnP Description Test
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */
'use strict';

const util = require('util');
const DiscoveryService = require('./discovery').DiscoveryService;
const findDeviceServices = require('./description').findDeviceServices;

const discoveryService = new DiscoveryService();
discoveryService.startService((err, address) => {
  if (err) {
    console.log(`discovery service error:\n${err.stack}`);
  } else {
    console.log(`discovery service listening ${address.address}:${address.port}`);
    console.log('start search in 5 seconds');
    setTimeout(discoveryService.startSearch.bind(discoveryService), 5000, 'ssdp:all', (err) => {
      if (err) {
        console.log(`search error:\n${err.stack}`);
      } else {
        console.log('search sent');
        console.log('print results in 5 seconds');
        setTimeout(() => {
          console.log('content of discovery message store');
          console.log(util.inspect(discoveryService.messageStore, {depth: 5}));
          findDeviceServices(discoveryService, 'urn:schemas-upnp-org:device:MediaServer:1', 'urn:schemas-upnp-org:service:ContentDirectory:1', (errors, services) => {
            errors.forEach((error) => {
              console.log(util.inspect(error, {depth:8}));
            });
            services.forEach((service) => {
              console.log(util.inspect(service, {depth:8}));
            });
          });
        }, 5000);
      }
    });
  }
});
