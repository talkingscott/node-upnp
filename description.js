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

class Description {
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

class Service {
  constructor(location, friendlyName, service) {
    this._location = location;
    this._friendlyName = friendlyName;
    this._service = service;
  }
  
  get friendlyName() {
    return this._friendlyName;
  }
  
  get location() {
    return this._location;
  }
  
  get service() {
    return this._service;
  }
}

function findAllDescriptions(discoveryServer, callback) {
  let errors = [];
  let descriptions = [];
  discoveryServer.getLocations().forEach((location) => {
    getDescription(location, (err, response, body) => {
      if (err) {
        errors.push(new DescriptionError(location, err, body));
      } else if (response.statusCode != 200) {
        errors.push(new DescriptionError(location, `statusCode: ${response.StatusCode} body: ${body}`));
      } else {
        descriptions.push(new Description(location, parseObjectFromXml(body)));
      }
      if ((descriptions.length + errors.length) == discoveryServer.getLocations().size) {
        callback(errors, descriptions);
      }
    });
  });
}

function findServices(discoveryService, deviceType, serviceType, callback) {
  findAllDescriptions(discoveryService, (errors, descriptions) => {
    let matchingServices = [];
    descriptions.forEach((description) => {
      if (description.description.device.deviceType == deviceType) {
        description.description.device.serviceList.service.forEach((service) => {
          if (service.serviceType == serviceType) {
            matchingServices.push(new Service(description.location, description.description.device.friendlyName, service));
          }
        });
      }
    });
    callback(errors, matchingServices);
  });
}

module.exports.findAllDescriptions = findAllDescriptions;
module.exports.findServices = findServices;
