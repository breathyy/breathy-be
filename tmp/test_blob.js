const blobService = require('../src/services/blob.service');

(async () => {
  try {
    const uploadSas = await blobService.createUploadUrl('azure-blob-test', 'text/plain', 12);
    console.log('Upload SAS mode:', uploadSas.uploadUrl ? 'live' : 'stub');
    console.log('Blob name:', uploadSas.blobName);

    const uploadResult = await blobService.uploadBuffer({
      caseId: 'azure-blob-test',
      buffer: Buffer.from('hello from automated test'),
      contentType: 'text/plain'
    });
    console.log('Upload completed, blob URL:', uploadResult.blobUrl);

    const downloadSas = blobService.generateDownloadUrl(uploadResult.blobName);
    console.log('Download SAS issued:', downloadSas.downloadUrl ? 'yes' : 'no');

    if (downloadSas.downloadUrl) {
      const response = await fetch(downloadSas.downloadUrl);
      const text = await response.text();
      console.log('Downloaded content length:', text.length);
      console.log('Downloaded content preview:', text.slice(0, 50));
    } else {
      console.log('Stub mode active; no download performed.');
    }
  } catch (error) {
    console.error('Azure blob test failed:', error.message);
    if (error?.response) {
      console.error('Response status:', error.response.status);
    }
    process.exitCode = 1;
  }
})();
