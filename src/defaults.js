"use strict";

const { defaultOptions } = require("./utils");

/**
 * The tus chunk size is (32MiB - encryptionOverhead) * dataPieces, set.
 */
const TUS_CHUNK_SIZE = (1 << 22) * 8;

/**
 * The retry delays, in ms. Data is stored for up to 20 minutes, so the
 * total delays should not exceed that length of time.
 */
const DEFAULT_TUS_RETRY_DELAYS = [0, 5000, 15000, 60000, 300000, 600000];

/**
 * The portal file field name.
 */
const PORTAL_FILE_FIELD_NAME = "file";
/**
 * The portal directory file field name.
 */
const PORTAL_DIRECTORY_FILE_FIELD_NAME = "files[]";

const DEFAULT_BASE_OPTIONS = {
  APIKey: "",
  s5ApiKey: "",
  customUserAgent: "",
  customCookie: "",
  loginFn: undefined,
};

const DEFAULT_DOWNLOAD_OPTIONS = {
  ...defaultOptions("/"),
  format: "",
};

const DEFAULT_PIN_OPTIONS = {
  ...defaultOptions("/s5/pin"),
};

const DEFAULT_DELETE_OPTIONS = {
  ...defaultOptions("/s5/delete"),
};

const DEFAULT_GET_METADATA_OPTIONS = {
  ...defaultOptions("/s5/metadata"),
};

const DEFAULT_UPLOAD_OPTIONS = {
  ...defaultOptions("/s5/upload"),
  endpointLargeUpload: "/s5/upload/tus",

  portalFileFieldname: PORTAL_FILE_FIELD_NAME,
  portalDirectoryFileFieldname: PORTAL_DIRECTORY_FILE_FIELD_NAME,
  customFilename: "",
  customDirname: "",
  disableDefaultPath: false,
  dryRun: false,
  errorPages: undefined,
  tryFiles: undefined,

  // Large files.
  largeFileSize: TUS_CHUNK_SIZE,
  retryDelays: DEFAULT_TUS_RETRY_DELAYS,
};

const DEFAULT_UPLOAD_DIRECTORY_OPTIONS = {
  ...defaultOptions("/s5/upload/directory"),

  portalFileFieldname: PORTAL_FILE_FIELD_NAME,
  portalDirectoryFileFieldname: PORTAL_DIRECTORY_FILE_FIELD_NAME,
  customFilename: "",
  customDirname: "",
  disableDefaultPath: false,
  dryRun: false,
  errorPages: undefined,
  tryFiles: undefined,
};

const DEFAULT_UPLOAD_TUS_OPTIONS = {
  ...defaultOptions("/s5/upload/tus"),
  endpointLargeUpload: "/s5/upload/tus",

  portalFileFieldname: PORTAL_FILE_FIELD_NAME,
  portalDirectoryFileFieldname: PORTAL_DIRECTORY_FILE_FIELD_NAME,
  customFilename: "",
  customDirname: "",
  disableDefaultPath: false,
  dryRun: false,
  errorPages: undefined,
  tryFiles: undefined,

  // Large files.
  largeFileSize: TUS_CHUNK_SIZE,
  retryDelays: DEFAULT_TUS_RETRY_DELAYS,
};

const DEFAULT_GET_ENTRY_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointGetEntry: "/s5/registry",
};

const DEFAULT_SET_ENTRY_OPTIONS = {
  ...DEFAULT_BASE_OPTIONS,
  endpointSetEntry: "/s5/registry",
};

module.exports = {
  TUS_CHUNK_SIZE,
  DEFAULT_BASE_OPTIONS,
  DEFAULT_DOWNLOAD_OPTIONS,
  DEFAULT_UPLOAD_TUS_OPTIONS,
  DEFAULT_PIN_OPTIONS,
  DEFAULT_DELETE_OPTIONS,
  DEFAULT_GET_METADATA_OPTIONS,
  DEFAULT_UPLOAD_OPTIONS,
  DEFAULT_UPLOAD_DIRECTORY_OPTIONS,
  DEFAULT_GET_ENTRY_OPTIONS,
  DEFAULT_SET_ENTRY_OPTIONS,
};
