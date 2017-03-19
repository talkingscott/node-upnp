/**
 * UPnP Discovery (SSDP) Test.
 *
 * The discovery service is started, but no search is sent.  Because the
 * discovery service is created with logging enabled, each message will
 * be logged ("dumped") as it is received.
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */

'use strict';

const discovery = require('./discovery');

const discoveryService = new discovery.DiscoveryService(true);

discoveryService.startService((err, address) => {
  if (err) {
    console.log(`discovery server error:\n${err.stack}`);
  } else {
    console.log(`discovery server listening ${address.address}:${address.port}`);
  }
});
