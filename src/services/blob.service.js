const crypto = require('crypto');
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  SASProtocol,
  generateBlobSASQueryParameters
} = require('@azure/storage-blob');
const config = require('../config/env.config');

const hasConnectionString = Boolean(config.storageConnectionString && config.storageConnectionString.trim().length > 0);
const hasContainer = Boolean(config.storageContainer && config.storageContainer.trim().length > 0);
const configured = hasConnectionString && hasContainer;
const stubMode = !configured;

let blobServiceClient;
let containerClient;
let sharedKeyCredential;
let containerReady = false;

const parseConnectionString = (value) => {
  return value.split(';').reduce((acc, segment) => {
    if (!segment) {
      return acc;
    }
    const [key, ...rest] = segment.split('=');
    if (!key || rest.length === 0) {
      return acc;
    }
    acc[key.trim().toLowerCase()] = rest.join('=').trim();
    return acc;
  }, {});
};

const getBlobServiceClient = () => {
  if (!configured) {
    throw new Error('Storage connection not configured');
  }
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(config.storageConnectionString);
  }
  return blobServiceClient;
};

const getContainerClient = () => {
  if (!configured) {
    throw new Error('Storage connection not configured');
  }
  if (!containerClient) {
    containerClient = getBlobServiceClient().getContainerClient(config.storageContainer);
  }
  return containerClient;
};

const ensureContainer = async () => {
  if (stubMode) {
    containerReady = true;
    return;
  }
  if (containerReady) {
    return;
  }
  const client = getContainerClient();
  await client.createIfNotExists();
  containerReady = true;
};

const getSharedKeyCredential = () => {
  if (!configured) {
    throw new Error('Storage connection not configured');
  }
  if (!sharedKeyCredential) {
    const parsed = parseConnectionString(config.storageConnectionString);
    const accountName = parsed.accountname;
    const accountKey = parsed.accountkey;
    if (!accountName || !accountKey) {
      throw new Error('Storage connection missing account credentials');
    }
    sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  }
  return sharedKeyCredential;
};

const buildBlobClient = (blobName) => {
  if (!configured) {
    throw new Error('Storage connection not configured');
  }
  return getContainerClient().getBlockBlobClient(blobName);
};

const createUploadUrl = async (caseId, contentType, fileSizeBytes) => {
  await ensureContainer();
  const blobName = `cases/${caseId}/${crypto.randomUUID()}`;
  if (stubMode) {
    const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
    return {
      blobName,
      uploadUrl: null,
      expiresAt: expiresOn.toISOString(),
      contentType,
      fileSizeBytes: fileSizeBytes || null
    };
  }
  const blobClient = buildBlobClient(blobName);
  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + 15 * 60 * 1000);
  const permissions = BlobSASPermissions.parse('cw');
  const sas = generateBlobSASQueryParameters(
    {
      containerName: config.storageContainer,
      blobName,
      permissions,
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
      contentType,
      cacheControl: 'no-store'
    },
    getSharedKeyCredential()
  );
  return {
    blobName,
    uploadUrl: `${blobClient.url}?${sas.toString()}`,
    expiresAt: expiresOn.toISOString(),
    contentType,
    fileSizeBytes: fileSizeBytes || null
  };
};

const generateDownloadUrl = (blobName) => {
  if (stubMode) {
    const expiresOn = new Date(Date.now() + 5 * 60 * 1000);
    return {
      downloadUrl: null,
      expiresAt: expiresOn.toISOString()
    };
  }
  const blobClient = buildBlobClient(blobName);
  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + 5 * 60 * 1000);
  const permissions = BlobSASPermissions.parse('r');
  const sas = generateBlobSASQueryParameters(
    {
      containerName: config.storageContainer,
      blobName,
      permissions,
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
      cacheControl: 'no-store'
    },
    getSharedKeyCredential()
  );
  return {
    downloadUrl: `${blobClient.url}?${sas.toString()}`,
    expiresAt: expiresOn.toISOString()
  };
};

const getBlobUrl = (blobName) => {
  if (stubMode) {
    return `stub://${blobName}`;
  }
  return buildBlobClient(blobName).url;
};

const getBlobProperties = async (blobName) => {
  if (stubMode) {
    return {
      contentType: null,
      contentLength: null
    };
  }
  const properties = await buildBlobClient(blobName).getProperties();
  return {
    contentType: properties.contentType || null,
    contentLength: typeof properties.contentLength === 'number' ? properties.contentLength : null
  };
};

module.exports = {
  isConfigured: () => configured || stubMode,
  isStubMode: () => stubMode,
  createUploadUrl,
  generateDownloadUrl,
  getBlobUrl,
  getBlobProperties
};
