/**
 * UPnP Description
 *
 * Based on http://www.upnp.org/specs/arch/UPnP-arch-DeviceArchitecture-v1.1.pdf
 */

'use strict';

const os = require('os');
const request = require('request');
const parseObjectFromXml = require('./simplexml').parseObjectFromXml;

const PRODUCT = 'node-upnp';
const PRODUCT_VERSION = '1.0';

/**
 * Gets a (raw) description.
 *
 * @private
 */
function getDescription(uri, callback) {
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
 * An error that occurred trying to obtain a (device) description.
 */
class DescriptionError {
  constructor(location, error) {
    this._location = location;
    this._error = error;
  }

  get error() {
    return this._error;
  }

  get location() {
    return this._location;
  }
}

/**
 * A device description.
 */
class DeviceDescription {
  /**
   * Creates a device description.
   *
   * @param location {String} The URL from which the description was read.
   * @param description {Object} The description XML parsed to an object.
   */
  constructor(location, description) {
    this._location = location;
    this._description = description;
  }

  get description() {
    return this._description;
  }

  get location() {
    return this._location;
  }
}

/**
 * A service description from within a
 * device description.
 */
class DeviceServiceDescription {
  /**
   * Creates a service description.
   *
   * @param location {String} The URL from which the device description was read.
   * @param friendlyDeviceName {String} The friendly name of the device.
   * @param service {Object} The parsed XML of the service description.
   */
  constructor(location, friendlyDeviceName, service) {
    this._location = location;
    this._friendlyDeviceName = friendlyDeviceName;
    this._service = service;
  }

  get friendlyDeviceName() {
    return this._friendlyDeviceName;
  }

  get location() {
    return this._location;
  }

  get service() {
    return this._service;
  }
}

/**
 * Finds all device/service descriptions.
 *
 * This does not issue a search on the discovery service.  Maybe it
 * should, but for now it is the responsibility of the caller to have
 * already issued a compatible search.  Otherwise, we rely exclusively
 * on what has been advertised since we started.
 *
 * @param discoveryService {DiscoveryService} The discovery service.
 * @param callback {Function} Receives the descriptions as DeviceDescription.
 */
function findAllDeviceDescriptions(discoveryService, callback) {
  const errors = [];
  const descriptions = [];
  discoveryService.getLocations().forEach((location) => {
    getDescription(location, (err, response, body) => {
      if (err) {
        errors.push(new DescriptionError(location, err, body));
      } else if (response.statusCode !== 200) {
        errors.push(new DescriptionError(location,
            `statusCode: ${response.StatusCode} body: ${body}`));
      } else {
        descriptions.push(new DeviceDescription(location, parseObjectFromXml(body)));
      }
      if ((descriptions.length + errors.length) === discoveryService.getLocations().size) {
        callback(errors, descriptions);
      }
    });
  });
}

/**
 * Finds all services for a device type and service type.
 *
 * This does not issue a search on the discovery service.  Maybe it
 * should, but for now it is the responsibility of the caller to have
 * already issued a compatible search.
 *
 * @param discoveryService {DiscoveryService} The discovery service.
 * @param deviceType {String} The device type to find.
 * @param serviceType {String} The service type to find on the device.
 * @param callback {Function} Receives the services as DeviceServiceDescription.
 */
function findDeviceServices(discoveryService, deviceType, serviceType, callback) {
  findAllDeviceDescriptions(discoveryService, (errors, descriptions) => {
    const matchingServices = [];
    descriptions.forEach((description) => {
      if (description.description.device.deviceType === deviceType) {
        description.description.device.serviceList.service.forEach((service) => {
          if (service.serviceType === serviceType) {
            matchingServices.push(new DeviceServiceDescription(description.location,
                description.description.device.friendlyName, service));
          }
        });
      }
    });
    callback(errors, matchingServices);
  });
}

module.exports.findAllDeviceDescriptions = findAllDeviceDescriptions;
module.exports.findDeviceServices = findDeviceServices;
