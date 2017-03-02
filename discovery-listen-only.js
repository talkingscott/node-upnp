/**
 * UPnP Discovery (SSDP) Test
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */
'use strict';

const util = require('util');
const discovery = require('./discovery');

const discoveryService = new discovery.DiscoveryService();

discoveryService.startService((err, address) => {
  if (err) {
    console.log(`discovery server error:\n${err.stack}`);
  } else {
    console.log(`discovery server listening ${address.address}:${address.port}`);
    setInterval(() => {
      console.log('content of discovery message store');
      console.log(util.inspect(discoveryService.messageStore, {depth: 5}));
    }, 60000);
  }
});
