"use strict";

const { S5Client } = require("./src/client");

const {
  defaultOptions,
  defaultS5PortalUrl,
  defaultPortalUrl,
  uriS5Prefix,
  formatS5Link,
  onUploadProgress,
} = require("./src/utils");

module.exports = {
  S5Client,
  defaultOptions,
  defaultPortalUrl,
  defaultS5PortalUrl,
  uriS5Prefix,
  formatS5Link,
  onUploadProgress,
};
